import { describe, it, expect, beforeEach, vi } from 'vitest'
import { safeStorage } from 'electron'
import { saveGoogleTokens, loadGoogleTokens, deleteGoogleTokens } from '../main/secretStorage'

let inMemorySettings: Record<string, string> = {}

vi.mock('../main/database', () => ({
  getSetting: vi.fn((key: string) => inMemorySettings[key] || null),
  setSetting: vi.fn((key: string, val: string) => { inMemorySettings[key] = val }),
  runQuery: vi.fn((query: string, params: any[]) => {
    if (query.includes('DELETE FROM settings WHERE key = ?')) {
      delete inMemorySettings[params[0]]
    }
  }),
  getDb: vi.fn()
}))

describe('Secret Storage Module', () => {
  beforeEach(() => {
    inMemorySettings = {}
    vi.clearAllMocks()
  })

  it('should save and load tokens using safeStorage when encryption is available', () => {
    const tokens = { access_token: 'test-token', refresh_token: 'refresh-123' }
    saveGoogleTokens(tokens)

    const loaded = loadGoogleTokens()
    expect(loaded).toEqual(tokens)
  })

  it('should fall back to AES encryption when safeStorage is unavailable', () => {
    vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false)

    const tokens = { access_token: 'fallback-token', refresh_token: 'refresh-456' }
    saveGoogleTokens(tokens)

    expect(inMemorySettings['secure_google_auth_tokens']).toContain('aes:')

    const loaded = loadGoogleTokens()
    expect(loaded).toEqual(tokens)
  })

  it('should delete tokens completely', () => {
    saveGoogleTokens({ access_token: 'abc' })
    expect(loadGoogleTokens()).not.toBeNull()

    deleteGoogleTokens()
    expect(loadGoogleTokens()).toBeNull()
  })
})
