import { describe, it, expect, beforeEach, vi } from 'vitest'
import { parseCredentialsJson, getClientCredentials, getRedirectUri, getAuthenticatedClient } from '../main/googleAuth'

vi.mock('../main/database', () => ({
  getSetting: vi.fn(),
  setSetting: vi.fn(),
  runQuery: vi.fn(),
  getDb: vi.fn()
}))

vi.mock('../main/secretStorage', () => ({
  loadGoogleTokens: vi.fn(),
  saveGoogleTokens: vi.fn(),
  migrateLegacyTokens: vi.fn()
}))

import { getSetting } from '../main/database'
import { loadGoogleTokens } from '../main/secretStorage'

describe('Google Auth Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.MAIN_VITE_GOOGLE_CLIENT_ID
    delete process.env.MAIN_VITE_GOOGLE_CLIENT_SECRET
    delete process.env.GOOGLE_CLIENT_ID
    delete process.env.GOOGLE_CLIENT_SECRET
  })

  describe('parseCredentialsJson', () => {
    it('should parse valid installed (desktop app) credentials JSON', () => {
      const json = JSON.stringify({
        installed: {
          client_id: '123456-test.apps.googleusercontent.com',
          client_secret: 'GOCSPX-secret123',
          redirect_uris: ['http://localhost', 'http://127.0.0.1:3000/oauth2callback']
        }
      })

      const parsed = parseCredentialsJson(json)
      expect(parsed).not.toBeNull()
      expect(parsed?.clientId).toBe('123456-test.apps.googleusercontent.com')
      expect(parsed?.clientSecret).toBe('GOCSPX-secret123')
      expect(parsed?.redirectUri).toBe('http://127.0.0.1:3000/oauth2callback')
    })

    it('should parse valid web application credentials JSON', () => {
      const json = JSON.stringify({
        web: {
          client_id: '987654-web.apps.googleusercontent.com',
          client_secret: 'GOCSPX-websecret',
          redirect_uris: ['http://127.0.0.1:3000/oauth2callback']
        }
      })

      const parsed = parseCredentialsJson(json)
      expect(parsed).not.toBeNull()
      expect(parsed?.clientId).toBe('987654-web.apps.googleusercontent.com')
      expect(parsed?.clientSecret).toBe('GOCSPX-websecret')
      expect(parsed?.redirectUri).toBe('http://127.0.0.1:3000/oauth2callback')
    })

    it('should return null for malformed JSON', () => {
      const parsed = parseCredentialsJson('invalid-json')
      expect(parsed).toBeNull()
    })

    it('should return null when client_id or client_secret are missing', () => {
      const json = JSON.stringify({
        installed: {
          client_id: 'only-id'
        }
      })
      const parsed = parseCredentialsJson(json)
      expect(parsed).toBeNull()
    })
  })

  describe('getClientCredentials', () => {
    it('should detect placeholder credentials as unconfigured', () => {
      vi.mocked(getSetting).mockReturnValue(null)
      const creds = getClientCredentials()
      expect(creds.isConfigured).toBe(false)
    })

    it('should read valid credentials from database settings', () => {
      vi.mocked(getSetting).mockImplementation((key: string) => {
        if (key === 'google_client_id') return 'custom-client-id.apps.googleusercontent.com'
        if (key === 'google_client_secret') return 'custom-client-secret'
        return null
      })

      const creds = getClientCredentials()
      expect(creds.isConfigured).toBe(true)
      expect(creds.clientId).toBe('custom-client-id.apps.googleusercontent.com')
      expect(creds.clientSecret).toBe('custom-client-secret')
    })

    it('should fall back to environment variables when database settings are empty', () => {
      vi.mocked(getSetting).mockReturnValue(null)
      process.env.MAIN_VITE_GOOGLE_CLIENT_ID = 'env-client-id.apps.googleusercontent.com'
      process.env.MAIN_VITE_GOOGLE_CLIENT_SECRET = 'env-client-secret'

      const creds = getClientCredentials()
      expect(creds.isConfigured).toBe(true)
      expect(creds.clientId).toBe('env-client-id.apps.googleusercontent.com')
      expect(creds.clientSecret).toBe('env-client-secret')
    })
  })

  describe('getRedirectUri', () => {
    it('should default to 127.0.0.1:3000/oauth2callback', () => {
      vi.mocked(getSetting).mockReturnValue(null)
      expect(getRedirectUri()).toBe('http://127.0.0.1:3000/oauth2callback')
    })

    it('should return custom redirect uri if configured in database', () => {
      vi.mocked(getSetting).mockReturnValue('http://localhost:3000/oauth2callback')
      expect(getRedirectUri()).toBe('http://localhost:3000/oauth2callback')
    })
  })

  describe('getAuthenticatedClient', () => {
    it('should throw NOT_CONNECTED when no tokens exist', async () => {
      vi.mocked(getSetting).mockImplementation((key: string) => {
        if (key === 'google_client_id') return 'client-id.apps.googleusercontent.com'
        if (key === 'google_client_secret') return 'client-secret'
        return null
      })
      vi.mocked(loadGoogleTokens).mockReturnValue(null)

      await expect(getAuthenticatedClient()).rejects.toThrow('NOT_CONNECTED')
    })

    it('should return client with credentials when tokens exist', async () => {
      vi.mocked(getSetting).mockImplementation((key: string) => {
        if (key === 'google_client_id') return 'client-id.apps.googleusercontent.com'
        if (key === 'google_client_secret') return 'client-secret'
        return null
      })
      vi.mocked(loadGoogleTokens).mockReturnValue({
        access_token: 'valid-access-token',
        refresh_token: 'valid-refresh-token',
        expiry_date: Date.now() + 3600000
      })

      const client = await getAuthenticatedClient()
      expect(client).toBeDefined()
    })
  })
})
