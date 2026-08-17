import { google } from 'googleapis'
import { shell } from 'electron'
import http from 'http'
import { URL } from 'url'
import { setSetting, getSetting } from './database'

const REDIRECT_URI = 'http://localhost:3000/oauth2callback'

export function getOAuth2Client() {
  const clientId = getSetting('google_client_id')
  const clientSecret = getSetting('google_client_secret')
  
  if (!clientId || !clientSecret) {
    throw new Error('Google Client ID or Secret are not configured.')
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    REDIRECT_URI
  )

  const tokensStr = getSetting('google_auth_tokens')
  if (tokensStr) {
    try {
      const tokens = JSON.parse(tokensStr)
      oauth2Client.setCredentials(tokens)
    } catch (e) {
      console.error('Failed to parse tokens', e)
    }
  }

  // Automatically save tokens when they are refreshed
  oauth2Client.on('tokens', (tokens) => {
    let existingTokens = {}
    try {
      const existingTokensStr = getSetting('google_auth_tokens')
      if (existingTokensStr) {
        existingTokens = JSON.parse(existingTokensStr)
      }
    } catch (e) {}

    const updatedTokens = {
      ...existingTokens,
      ...tokens
    }

    setSetting('google_auth_tokens', JSON.stringify(updatedTokens))
  })

  return oauth2Client
}

let authServer: http.Server | null = null

export async function authenticateGoogle(): Promise<boolean> {
  const oauth2Client = getOAuth2Client()

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    prompt: 'consent'
  })

  return new Promise((resolve, reject) => {
    // Se já existe um servidor rodando (ex: tentativa anterior não concluída), fecha ele
    if (authServer) {
      try {
        authServer.close()
      } catch (e) {}
      authServer = null
    }

    authServer = http.createServer(async (req, res) => {
      try {
        if (req.url && req.url.startsWith('/oauth2callback')) {
          const qs = new URL(req.url, 'http://localhost:3000').searchParams
          const code = qs.get('code')
          
          res.setHeader('Content-Type', 'text/html')
          res.end('<h1>Autenticação Concluída com Sucesso!</h1><p>Você pode fechar esta aba e retornar ao aplicativo.</p>')
          
          if (authServer) {
            authServer.close()
            authServer = null
          }

          if (code) {
            const { tokens } = await oauth2Client.getToken(code)
            oauth2Client.setCredentials(tokens)
            setSetting('google_auth_tokens', JSON.stringify(tokens))
            resolve(true)
          } else {
            resolve(false)
          }
        }
      } catch (e) {
        res.setHeader('Content-Type', 'text/html')
        res.end('<h1>Falha na Autenticação</h1><p>Verifique o console do aplicativo para mais detalhes.</p>')
        
        if (authServer) {
          authServer.close()
          authServer = null
        }
        reject(e)
      }
    })

    authServer.on('error', (e: any) => {
      if (e.code === 'EADDRINUSE') {
        console.error('Port 3000 is already in use.')
        authServer = null
        reject(new Error('A porta 3000 já está em uso por outro aplicativo ou processo pendente. Tente fechar o aplicativo e abrir novamente.'))
      } else {
        authServer = null
        reject(e)
      }
    })

    authServer.listen(3000, () => {
      shell.openExternal(authUrl)
    })
  })
}
