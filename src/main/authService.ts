import crypto from 'crypto'
import { getDb, runQuery } from './database'
import { logAction } from './auditService'
import { BrowserWindow } from 'electron'

const ITERATIONS = 100000
const KEY_LEN = 32

let sessionLocked = true
let lastActivityTime = Date.now()
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes
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
  logAction('system', 'setup_admin')
  
  // Implicitly unlock after setting up
  sessionLocked = false
  resetInactivityTimer()
}

/**
 * Verifies the admin password and unlocks the session.
 */
export function unlockSession(password: string): boolean {
  const db = getDb()
  if (!db) return false

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get('admin') as any
  if (!user) {
    throw new AuthError('Usuário admin não encontrado.')
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
  sessionLocked = true
  logAction('admin', 'lock_session')
  if (window) {
    window.webContents.send('session-locked')
  }
}

export function isSessionLocked(): boolean {
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
    if (!sessionLocked && (Date.now() - lastActivityTime > INACTIVITY_TIMEOUT_MS)) {
      lockSession(window)
    }
  }, 60000) // Check every minute
}
