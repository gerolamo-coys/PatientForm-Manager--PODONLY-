import { safeStorage } from 'electron'
import crypto from 'crypto'
import { getSetting, setSetting, runQuery } from './database'

export class SecretStorageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SecretStorageError'
  }
}

function getFallbackKey(): Buffer {
  const seed = `${process.env.COMPUTERNAME || process.env.HOSTNAME || 'podonly'}-salt-storage-v1`
  return crypto.createHash('sha256').update(seed).digest()
}

function encryptFallback(text: string): string {
  const key = getFallbackKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag().toString('hex')
  return `aes:${iv.toString('hex')}:${authTag}:${encrypted}`
}

function decryptFallback(encryptedStr: string): string | null {
  try {
    const parts = encryptedStr.split(':')
    if (parts.length !== 4 || parts[0] !== 'aes') return null
    const iv = Buffer.from(parts[1], 'hex')
    const authTag = Buffer.from(parts[2], 'hex')
    const encryptedText = parts[3]
    const key = getFallbackKey()
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (err) {
    console.error('Falha ao descriptografar token com fallback AES:', err)
    return null
  }
}

/**
 * Saves Google OAuth tokens securely using OS-level encryption or fallback.
 */
export function saveGoogleTokens(tokens: any): void {
  const tokensStr = JSON.stringify(tokens)

  if (safeStorage && safeStorage.isEncryptionAvailable()) {
    try {
      const encrypted = safeStorage.encryptString(tokensStr)
      setSetting('secure_google_auth_tokens', 'safe:' + encrypted.toString('base64'))
      return
    } catch (err) {
      console.warn('safeStorage falhou ao criptografar, usando fallback AES:', err)
    }
  }

  // Fallback seguro com AES-256-GCM
  const fallbackEncrypted = encryptFallback(tokensStr)
  setSetting('secure_google_auth_tokens', fallbackEncrypted)
}

/**
 * Loads Google OAuth tokens, decrypting them with OS-level decryption or fallback.
 */
export function loadGoogleTokens(): any | null {
  const stored = getSetting('secure_google_auth_tokens')
  if (!stored) {
    return null
  }

  try {
    if (stored.startsWith('aes:')) {
      const decrypted = decryptFallback(stored)
      return decrypted ? JSON.parse(decrypted) : null
    }

    if (stored.startsWith('safe:')) {
      if (safeStorage && safeStorage.isEncryptionAvailable()) {
        const encrypted = Buffer.from(stored.slice(5), 'base64')
        const decryptedStr = safeStorage.decryptString(encrypted)
        return JSON.parse(decryptedStr)
      }
      return null
    }

    // Legacy format without prefix (saved via safeStorage in earlier versions)
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      try {
        const encrypted = Buffer.from(stored, 'base64')
        const decryptedStr = safeStorage.decryptString(encrypted)
        return JSON.parse(decryptedStr)
      } catch {
        // Continue to plaintext check
      }
    }

    // Direct JSON fallback
    return JSON.parse(stored)
  } catch (error) {
    console.error('Failed to decrypt or parse secure tokens:', error)
    return null
  }
}

/**
 * Deletes the securely stored tokens.
 */
export function deleteGoogleTokens(): void {
  runQuery('DELETE FROM settings WHERE key = ?', ['secure_google_auth_tokens'])
}

/**
 * One-time migration of legacy plaintext tokens to secure storage.
 */
export function migrateLegacyTokens(): void {
  const legacyTokensStr = getSetting('google_auth_tokens')
  
  if (legacyTokensStr) {
    try {
      // Try to parse legacy to make sure it's valid JSON
      const tokens = JSON.parse(legacyTokensStr)
      
      // Attempt to save them securely
      if (safeStorage.isEncryptionAvailable()) {
        saveGoogleTokens(tokens)
        
        // Only delete the legacy plaintext if the secure save succeeded
        runQuery('DELETE FROM settings WHERE key = ?', ['google_auth_tokens'])
        console.log('Successfully migrated legacy plaintext tokens to secure storage.')
      } else {
        console.warn('Encryption is unavailable. Cannot migrate legacy tokens securely.')
      }
    } catch (e) {
      console.error('Failed to migrate legacy tokens. They might be corrupted:', e)
    }
  }
}
