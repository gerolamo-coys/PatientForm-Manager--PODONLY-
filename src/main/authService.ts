import crypto from 'crypto'
import { getDb, runQuery, getSetting, setSetting } from './database'
import { logAction } from './auditService'
import { BrowserWindow } from 'electron'

const ITERATIONS = 100000
const KEY_LEN = 32

let sessionLocked = true
let lastActivityTime = Date.now()
let sessionTimeoutInterval: NodeJS.Timeout | null = null

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

function deriveKey(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, Buffer.from(salt, 'hex'), ITERATIONS, KEY_LEN, 'sha256').toString('hex')
}

/**
 * Checks if there's any user in the DB.
 */
export function hasAdminUser(): boolean {
  const db = getDb()
  if (!db) return false
  const row = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }
  return row.count > 0
}

/**
 * Checks if the security session lock is currently enabled.
 */
export function isSessionLockEnabled(): boolean {
  const db = getDb()
  if (!db) return false
  const enabledSetting = getSetting('security_session_lock_enabled')
  if (enabledSetting === 'false') {
    return false
  }
  if (enabledSetting === 'true') {
    return true
  }
  // Default: enabled only if an admin user exists
  return hasAdminUser()
}

/**
 * Gets configured inactivity timeout in minutes (0 = disabled).
 */
export function getInactivityTimeout(): number {
  const val = getSetting('security_inactivity_timeout')
  if (val === null || val === undefined || val === '') {
    return 15 // Default 15 minutes
  }
  const parsed = parseInt(val, 10)
  return isNaN(parsed) ? 15 : parsed
}

/**
 * Sets inactivity timeout in minutes.
 */
export function setInactivityTimeout(minutes: number): void {
  const safeMin = Math.max(0, minutes)
  setSetting('security_inactivity_timeout', String(safeMin))
  resetInactivityTimer()
  logAction('admin', 'set_inactivity_timeout', undefined, `timeout_${safeMin}min`)
}

/**
 * Returns security lock status summary.
 */
export function getSecurityStatus(): { isLockEnabled: boolean; hasPassword: boolean; inactivityMinutes: number } {
  return {
    isLockEnabled: isSessionLockEnabled(),
    hasPassword: hasAdminUser(),
    inactivityMinutes: getInactivityTimeout()
  }
}

/**
 * Sets up the initial admin user.
 */
export function setupAdmin(password: string): void {
  if (hasAdminUser()) {
    throw new AuthError('Admin user already exists.')
  }
  if (!password || password.length < 4) {
    throw new AuthError('Senha deve ter pelo menos 4 caracteres.')
  }

  const salt = crypto.randomBytes(16).toString('hex')
  const hash = deriveKey(password, salt)

  runQuery(
    'INSERT INTO users (username, password_hash, salt, role) VALUES (?, ?, ?, ?)',
    ['admin', hash, salt, 'admin']
  )
  setSetting('security_session_lock_enabled', 'true')
  logAction('system', 'setup_admin')
  
  // Implicitly unlock after setting up
  sessionLocked = false
  resetInactivityTimer()
}

/**
 * Changes master password after validating the current password.
 */
export function changeAdminPassword(currentPassword: string, newPassword: string): boolean {
  const db = getDb()
  if (!db) throw new AuthError('Banco de dados indisponível.')

  if (!newPassword || newPassword.length < 4) {
    throw new AuthError('A nova senha deve ter pelo menos 4 caracteres.')
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get('admin') as any
  if (user) {
    const hash = deriveKey(currentPassword, user.salt)
    if (hash !== user.password_hash) {
      throw new AuthError('Senha atual incorreta.')
    }
    const newSalt = crypto.randomBytes(16).toString('hex')
    const newHash = deriveKey(newPassword, newSalt)
    runQuery(
      'UPDATE users SET password_hash = ?, salt = ? WHERE username = ?',
      [newHash, newSalt, 'admin']
    )
  } else {
    // If user didn't exist yet, insert as new admin
    const newSalt = crypto.randomBytes(16).toString('hex')
    const newHash = deriveKey(newPassword, newSalt)
    runQuery(
      'INSERT INTO users (username, password_hash, salt, role) VALUES (?, ?, ?, ?)',
      ['admin', newHash, newSalt, 'admin']
    )
  }

  setSetting('security_session_lock_enabled', 'true')
  sessionLocked = false
  logAction('admin', 'change_password')
  return true
}

/**
 * Removes / disables the security session block.
 */
export function removeSessionLock(currentPassword?: string): boolean {
  const db = getDb()
  if (!db) throw new AuthError('Banco de dados indisponível.')

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get('admin') as any
  if (user && currentPassword !== undefined && currentPassword !== '') {
    const hash = deriveKey(currentPassword, user.salt)
    if (hash !== user.password_hash) {
      throw new AuthError('Senha incorreta.')
    }
  }

  // Deactivate session lock and remove admin credentials
  setSetting('security_session_lock_enabled', 'false')
  runQuery('DELETE FROM users WHERE username = ?', ['admin'])
  sessionLocked = false
  logAction('admin', 'remove_session_lock')
  return true
}

/**
 * Enables security session lock with a master password.
 */
export function enableSessionLock(password: string): boolean {
  const db = getDb()
  if (!db) throw new AuthError('Banco de dados indisponível.')

  if (!password || password.length < 4) {
    throw new AuthError('A senha deve ter pelo menos 4 caracteres.')
  }

  const salt = crypto.randomBytes(16).toString('hex')
  const hash = deriveKey(password, salt)

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get('admin') as any
  if (user) {
    runQuery(
      'UPDATE users SET password_hash = ?, salt = ? WHERE username = ?',
      [hash, salt, 'admin']
    )
  } else {
    runQuery(
      'INSERT INTO users (username, password_hash, salt, role) VALUES (?, ?, ?, ?)',
      ['admin', hash, salt, 'admin']
    )
  }

  setSetting('security_session_lock_enabled', 'true')
  sessionLocked = false
  resetInactivityTimer()
  logAction('admin', 'enable_session_lock')
  return true
}

/**
 * Verifies the admin password and unlocks the session.
 */
export function unlockSession(password: string): boolean {
  const db = getDb()
  if (!db) return false

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get('admin') as any
  if (!user) {
    // If no admin user exists, unlock automatically
    sessionLocked = false
    return true
  }

  const hash = deriveKey(password, user.salt)
  if (hash === user.password_hash) {
    sessionLocked = false
    logAction('admin', 'unlock_session')
    resetInactivityTimer()
    return true
  }
  
  logAction('system', 'failed_unlock_attempt')
  return false
}

/**
 * Locks the session immediately.
 */
export function lockSession(window: BrowserWindow | null): void {
  if (!isSessionLockEnabled()) return
  sessionLocked = true
  logAction('admin', 'lock_session')
  if (window) {
    window.webContents.send('session-locked')
  }
}

export function isSessionLocked(): boolean {
  if (!isSessionLockEnabled()) {
    return false
  }
  return sessionLocked
}

/**
 * Call this whenever there is user activity to prevent timeout
 */
export function resetInactivityTimer(): void {
  lastActivityTime = Date.now()
}

/**
 * Starts the inactivity monitor
 */
export function startInactivityMonitor(window: BrowserWindow): void {
  if (sessionTimeoutInterval) {
    clearInterval(sessionTimeoutInterval)
  }

  sessionTimeoutInterval = setInterval(() => {
    if (!isSessionLockEnabled()) return
    const timeoutMin = getInactivityTimeout()
    if (timeoutMin <= 0) return // 0 = disabled auto-lock
    const timeoutMs = timeoutMin * 60 * 1000
    if (!sessionLocked && (Date.now() - lastActivityTime > timeoutMs)) {
      lockSession(window)
    }
  }, 30000) // Check every 30 seconds
}
