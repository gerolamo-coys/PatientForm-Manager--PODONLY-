import { google } from 'googleapis'
import { shell, BrowserWindow } from 'electron'
import http from 'http'
import { URL } from 'url'
import crypto from 'crypto'
import { getSetting, setSetting } from './database'
import { saveGoogleTokens, loadGoogleTokens, migrateLegacyTokens } from './secretStorage'

export interface ClientCredentials {
  clientId: string
  clientSecret: string
  isConfigured: boolean
}

/**
 * Obtém as credenciais do cliente Google OAuth a partir das configurações do SQLite
 * ou variáveis de ambiente. Identifica se são chaves de placeholder não configuradas.
 */
export function getClientCredentials(): ClientCredentials {
  const dbClientId = getSetting('google_client_id') || ''
  const dbClientSecret = getSetting('google_client_secret') || ''

  const envClientId = (process.env.MAIN_VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '').trim()
  const envClientSecret = (process.env.MAIN_VITE_GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '').trim()

  const clientId = (dbClientId || envClientId).trim()
  const clientSecret = (dbClientSecret || envClientSecret).trim()

  const isPlaceholder =
    !clientId ||
    !clientSecret ||
    clientId.includes('podonlyapp.apps.googleusercontent.com') ||
    clientSecret.includes('podonlydefaultsecretkey')

  return {
    clientId,
    clientSecret,
    isConfigured: !isPlaceholder
  }
}

export function hasGoogleCredentials(): boolean {
  return getClientCredentials().isConfigured
}

export function getRedirectUri(): string {
  const custom = getSetting('google_redirect_uri')
  if (custom && custom.trim()) {
    return custom.trim()
  }
  return 'http://127.0.0.1:3000/oauth2callback'
}

export function getOAuth2Client() {
  const creds = getClientCredentials()
  if (!creds.isConfigured) {
    throw new Error('As credenciais do Google (Client ID e Client Secret) não estão configuradas.')
  }

  const redirectUri = getRedirectUri()
  const oauth2Client = new google.auth.OAuth2(
    creds.clientId,
    creds.clientSecret,
    redirectUri
  )

  // Migra tokens legados em texto plano se existirem
  migrateLegacyTokens()

  const tokens = loadGoogleTokens()
  if (tokens) {
    oauth2Client.setCredentials(tokens)
  }

  // Atualiza e persiste tokens automaticamente quando são renovados pelo Google
  oauth2Client.on('tokens', (newTokens) => {
    try {
      const existingTokens = loadGoogleTokens() || {}
      const updatedTokens = {
        ...existingTokens,
        ...newTokens
      }
      // Garante que o refresh_token nunca seja sobregravado com vazio se o Google não o reenviar
      if (!updatedTokens.refresh_token && existingTokens.refresh_token) {
        updatedTokens.refresh_token = existingTokens.refresh_token
      }
      saveGoogleTokens(updatedTokens)
    } catch (e: unknown) {
      console.error('Falha ao salvar tokens renovados do Google:', e)
    }
  })

  return oauth2Client
}

/**
 * Retorna um cliente OAuth2 com credenciais válidas, garantindo que se o access_token
 * estiver expirado mas houver refresh_token, ele seja renovado silenciosamente antes da chamada.
 */
export async function getAuthenticatedClient() {
  const oauth2Client = getOAuth2Client()
  const tokens = loadGoogleTokens()
  if (!tokens || (!tokens.access_token && !tokens.refresh_token)) {
    throw new Error('NOT_CONNECTED')
  }

  // Se houver expiry_date e estiver próximo do vencimento (ou vencido) com refresh_token presente, renova proativamente
  const isExpired = tokens.expiry_date && (Date.now() >= tokens.expiry_date - 60000)
  if ((!tokens.access_token || isExpired) && tokens.refresh_token) {
    try {
      const refreshed = await oauth2Client.refreshAccessToken()
      const newTokens = refreshed.credentials
      oauth2Client.setCredentials(newTokens)
      const existingTokens = loadGoogleTokens() || {}
      saveGoogleTokens({
        ...existingTokens,
        ...newTokens,
        refresh_token: newTokens.refresh_token || existingTokens.refresh_token
      })
    } catch (refreshErr: any) {
      console.warn('Tentativa de renovação de access_token com refresh_token:', refreshErr?.message || refreshErr)
      // Se o refresh_token foi explicitamente revogado pelo usuário (invalid_grant), repassa
      if (refreshErr?.message?.includes('invalid_grant')) {
        throw refreshErr
      }
    }
  }

  return oauth2Client
}

let authServer: http.Server | null = null
let authTimeoutTimer: NodeJS.Timeout | null = null
const activeSockets = new Set<import('net').Socket>()

function bringAppToFront(): void {
  try {
    const wins = BrowserWindow.getAllWindows()
    if (wins.length > 0) {
      const win = wins[0]
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    }
  } catch {
    // Ignorado
  }
}

export function cancelGoogleAuthentication(): void {
  if (authTimeoutTimer) {
    clearTimeout(authTimeoutTimer)
    authTimeoutTimer = null
  }

  if (authServer) {
    try {
      if (typeof (authServer as any).closeAllConnections === 'function') {
        (authServer as any).closeAllConnections()
      }
      for (const s of activeSockets) {
        try {
          s.destroy()
        } catch {
          // Ignorado
        }
      }
      activeSockets.clear()
      authServer.close()
    } catch (e) {
      console.warn('Aviso ao encerrar servidor de autenticação:', e)
    }
    authServer = null
  }
}

function renderAuthHtml(success: boolean, title: string, description: string): string {
  const accentColor = success ? '#10b981' : '#ef4444'
  const iconSvg = success
    ? `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${accentColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
    : `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${accentColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Podonly</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 1.5rem;
      box-sizing: border-box;
    }
    .card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
      max-width: 480px;
      width: 100%;
      padding: 2.5rem 2rem;
      text-align: center;
      border: 1px solid #e2e8f0;
    }
    .icon {
      margin-bottom: 1.25rem;
    }
    h1 {
      font-size: 1.4rem;
      margin: 0 0 0.75rem 0;
      color: #0f172a;
      font-weight: 700;
    }
    p {
      color: #64748b;
      font-size: 0.95rem;
      line-height: 1.6;
      margin: 0 0 1.5rem 0;
    }
    .badge {
      display: inline-block;
      background: ${success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'};
      color: ${accentColor};
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      font-weight: 600;
      font-size: 0.82rem;
      margin-bottom: 1.25rem;
    }
    .hint {
      font-size: 0.85rem;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      padding-top: 1rem;
      margin-top: 1rem;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${iconSvg}</div>
    <div class="badge">${success ? 'Podonly Integrado' : 'Aviso de Autenticação'}</div>
    <h1>${title}</h1>
    <p>${description}</p>
    <div class="hint">Você já pode fechar esta aba do navegador e voltar para o aplicativo <strong>Podonly</strong>.</div>
  </div>
</body>
</html>`
}

export async function authenticateGoogle(): Promise<boolean> {
  const creds = getClientCredentials()
  if (!creds.isConfigured) {
    throw new Error('Configure o Client ID e Client Secret nas opções do Google Calendar antes de autenticar.')
  }

  const oauth2Client = getOAuth2Client()
  const authState = crypto.randomBytes(32).toString('hex')

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email'
    ],
    prompt: 'consent',
    state: authState
  })

  // Cancela qualquer servidor pré-existente
  cancelGoogleAuthentication()

  return new Promise((resolve, reject) => {
    // Timeout de segurança (3 minutos)
    authTimeoutTimer = setTimeout(() => {
      cancelGoogleAuthentication()
      reject(new Error('Tempo esgotado para autenticação. A janela no navegador não foi concluída a tempo.'))
    }, 180000)

    authServer = http.createServer(async (req, res) => {
      try {
        const reqUrl = req.url || ''
        
        // Ignora requisições de favicon ou outras rotas que o navegador faz automaticamente
        if (!reqUrl.startsWith('/oauth2callback')) {
          res.writeHead(404)
          res.end()
          return
        }

        const qs = new URL(reqUrl, 'http://127.0.0.1:3000').searchParams
        const code = qs.get('code')
        const returnedState = qs.get('state')
        const error = qs.get('error')
        const errorDesc = qs.get('error_description')

        // 1. O usuário cancelou ou o Google retornou erro
        if (error) {
          const isDenied = error === 'access_denied'
          const message = isDenied
            ? 'Acesso cancelado pelo usuário na tela de autorização do Google.'
            : `Erro retornado pelo Google: ${errorDesc || error}`

          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(renderAuthHtml(false, 'Autorização Cancelada', message))

          cancelGoogleAuthentication()
          reject(new Error(message))
          return
        }

        // 2. Validação CSRF do estado retornado
        if (!returnedState || returnedState !== authState) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(renderAuthHtml(false, 'Falha de Segurança', 'Parâmetro de verificação de estado OAuth inválido ou expirado.'))

          cancelGoogleAuthentication()
          reject(new Error('Falha de verificação de estado OAuth (CSRF).'))
          return
        }

        // 3. Código ausente
        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(renderAuthHtml(false, 'Código Ausente', 'O código de autorização não foi retornado pelo Google.'))

          cancelGoogleAuthentication()
          reject(new Error('Código de autorização não recebido do Google.'))
          return
        }

        // 4. Troca do código de autorização pelos tokens de acesso e refresh
        const { tokens } = await oauth2Client.getToken(code)
        oauth2Client.setCredentials(tokens)
        saveGoogleTokens(tokens)

        // Busca opcional do e-mail da conta conectada para exibir na interface
        let userEmail: string | null = null
        try {
          const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
          const userInfo = await oauth2.userinfo.get()
          if (userInfo.data.email) {
            userEmail = userInfo.data.email
            setSetting('google_account_email', userEmail)
          }
        } catch (profileErr) {
          console.warn('Não foi possível recuperar o e-mail do usuário:', profileErr)
        }

        // Envia resposta de sucesso ao navegador SOMENTE após a troca do token com êxito
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        const successDesc = userEmail
          ? `Sua conta do Google <strong>${userEmail}</strong> foi conectada com sucesso ao Podonly.`
          : 'Sua conta do Google Calendar foi conectada com sucesso ao Podonly.'
        res.end(renderAuthHtml(true, 'Conexão Realizada com Sucesso!', successDesc))

        cancelGoogleAuthentication()
        bringAppToFront()
        resolve(true)
      } catch (err: any) {
        console.error('Erro na autenticação do Google:', err)
        try {
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' })
            res.end(renderAuthHtml(false, 'Falha na Autenticação', err.message || 'Erro ao processar as credenciais do Google.'))
          }
        } catch {
          // Ignorado
        }

        cancelGoogleAuthentication()
        reject(err)
      }
    })

    // Rastreia conexões de socket ativas para permitir fechamento imediato e limpo
    authServer.on('connection', (socket) => {
      activeSockets.add(socket)
      socket.on('close', () => activeSockets.delete(socket))
    })

    authServer.on('error', (e: any) => {
      cancelGoogleAuthentication()
      if (e.code === 'EADDRINUSE') {
        reject(new Error('A porta 3000 está em uso por outro aplicativo no computador. Feche qualquer processo na porta 3000 e tente novamente.'))
      } else {
        reject(e)
      }
    })

    // Escuta expressamente no loopback local 127.0.0.1 para evitar bloqueios do Windows Defender Firewall
    authServer.listen(3000, '127.0.0.1', () => {
      shell.openExternal(authUrl)
    })
  })
}

export function parseCredentialsJson(jsonString: string): { clientId: string; clientSecret: string; redirectUri?: string } | null {
  try {
    const data = JSON.parse(jsonString)
    const creds = data.installed || data.web || data
    const clientId = creds.client_id || data.client_id
    const clientSecret = creds.client_secret || data.client_secret

    const redirectUris: string[] = creds.redirect_uris || data.redirect_uris || []
    const detectedRedirectUri = redirectUris.find((u: string) => u.includes('3000') || u.includes('oauth2callback')) || redirectUris[0]

    if (clientId && clientSecret) {
      return {
        clientId: String(clientId).trim(),
        clientSecret: String(clientSecret).trim(),
        redirectUri: detectedRedirectUri ? String(detectedRedirectUri).trim() : undefined
      }
    }
  } catch (e) {
    console.error('Falha ao analisar JSON de credenciais do Google:', e)
  }
  return null
}

