import { describe, it, expect, beforeEach, vi } from 'vitest'

let inMemorySettings: Record<string, string> = {}
let inMemoryUsers: Record<string, { username: string; password_hash: string; salt: string; role: string }> = {}

vi.mock('../main/database', () => ({
  getSetting: vi.fn((key: string) => inMemorySettings[key] || null),
  setSetting: vi.fn((key: string, val: string) => { inMemorySettings[key] = val }),
  runQuery: vi.fn((query: string, params: any[] = []) => {
    if (query.includes('DELETE FROM users WHERE username = ?')) {
      delete inMemoryUsers[params[0]]
    } else if (query.includes('INSERT INTO users')) {
      const [username, password_hash, salt, role] = params
      inMemoryUsers[username] = { username, password_hash, salt, role }
    } else if (query.includes('UPDATE users SET password_hash = ?')) {
      const [hash, salt, username] = params
      if (inMemoryUsers[username]) {
        inMemoryUsers[username].password_hash = hash
        inMemoryUsers[username].salt = salt
      }
    }
  }),
  getDb: vi.fn(() => ({
    prepare: vi.fn((query: string) => ({
      get: vi.fn((param: any) => {
        if (query.includes('COUNT(*)')) {
          return { count: Object.keys(inMemoryUsers).length }
        }
        if (query.includes('FROM users WHERE username = ?')) {
          return inMemoryUsers[param] || null
        }
        return null
      })
    }))
  }))
}))

vi.mock('../main/auditService', () => ({
  logAction: vi.fn()
}))

vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: vi.fn(() => [])
  }
}))

import {
  hasAdminUser,
  setupAdmin,
  unlockSession,
  lockSession,
  isSessionLocked,
  isSessionLockEnabled,
  getSecurityStatus,
  changeAdminPassword,
  removeSessionLock,
  enableSessionLock,
  getInactivityTimeout,
  setInactivityTimeout
} from '../main/authService'

describe('Auth & Session Lock Service Unit Tests', () => {
  beforeEach(() => {
    inMemorySettings = {}
    inMemoryUsers = {}
    vi.clearAllMocks()
  })

  it('starts with no admin user and lock disabled when no user exists', () => {
    expect(hasAdminUser()).toBe(false)
    expect(isSessionLockEnabled()).toBe(false)
    expect(isSessionLocked()).toBe(false)
  })

  it('creates an admin password and enables session lock', () => {
    setupAdmin('minha-senha-123')
    expect(hasAdminUser()).toBe(true)
    expect(isSessionLockEnabled()).toBe(true)

    // Status check
    const status = getSecurityStatus()
    expect(status.isLockEnabled).toBe(true)
    expect(status.hasPassword).toBe(true)
    expect(status.inactivityMinutes).toBe(15) // default
  })

  it('unlocks with correct password and rejects wrong password', () => {
    setupAdmin('senha-correta-456')

    expect(unlockSession('senha-errada')).toBe(false)
    expect(unlockSession('senha-correta-456')).toBe(true)
  })

  it('changes admin password successfully with current password verification', () => {
    setupAdmin('senha-antiga-123')

    // Fails with incorrect current password
    expect(() => changeAdminPassword('senha-incorreta', 'senha-nova-999')).toThrow('Senha atual incorreta.')

    // Fails with short new password
    expect(() => changeAdminPassword('senha-antiga-123', '123')).toThrow('A nova senha deve ter pelo menos 4 caracteres.')

    // Succeeds with correct current password and valid new password
    const result = changeAdminPassword('senha-antiga-123', 'senha-nova-999')
    expect(result).toBe(true)

    // Old password no longer works, new password works
    expect(unlockSession('senha-antiga-123')).toBe(false)
    expect(unlockSession('senha-nova-999')).toBe(true)
  })

  it('removes session lock and confirms direct access without password', () => {
    setupAdmin('senha-segura-789')
    expect(isSessionLockEnabled()).toBe(true)

    // Fails if wrong password provided when removing
    expect(() => removeSessionLock('senha-errada')).toThrow('Senha incorreta.')

    // Succeeds with correct password
    const removed = removeSessionLock('senha-segura-789')
    expect(removed).toBe(true)
    expect(isSessionLockEnabled()).toBe(false)
    expect(hasAdminUser()).toBe(false)
    expect(isSessionLocked()).toBe(false)

    // When lock is disabled, manual lock does nothing
    lockSession(null)
    expect(isSessionLocked()).toBe(false)

    // Status reflects disabled state
    const status = getSecurityStatus()
    expect(status.isLockEnabled).toBe(false)
    expect(status.hasPassword).toBe(false)
  })

  it('can re-enable session lock with a new password after removal', () => {
    setupAdmin('senha-inicial')
    removeSessionLock('senha-inicial')
    expect(isSessionLockEnabled()).toBe(false)

    // Re-enable
    const enabled = enableSessionLock('nova-senha-mestra')
    expect(enabled).toBe(true)
    expect(isSessionLockEnabled()).toBe(true)
    expect(hasAdminUser()).toBe(true)
    expect(unlockSession('nova-senha-mestra')).toBe(true)
  })

  it('configures inactivity timeout correctly', () => {
    // Default is 15 minutes
    expect(getInactivityTimeout()).toBe(15)

    // Change to 30 minutes
    setInactivityTimeout(30)
    expect(getInactivityTimeout()).toBe(30)
    expect(inMemorySettings['security_inactivity_timeout']).toBe('30')

    // Change to 0 (disabled)
    setInactivityTimeout(0)
    expect(getInactivityTimeout()).toBe(0)
  })
})
