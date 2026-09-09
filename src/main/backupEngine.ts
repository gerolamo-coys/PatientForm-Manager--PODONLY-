import crypto from 'crypto'
import fs from 'fs'
import fsPromises from 'fs/promises'
import path from 'path'
import archiver from 'archiver'
import { app } from 'electron'
import { logAction } from './auditService'

const ALGORITHM = 'aes-256-gcm'
const ITERATIONS = 100000
const KEY_LEN = 32
const SALT_LEN = 16
const IV_LEN = 12

export class BackupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackupError'
  }
}

/**
 * Derives a key using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, 'sha256')
}

/**
 * Creates a zip archive of the user data directory (excluding temp/cache/wal)
 */
async function createArchive(sourceDir: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(destPath)
    const archive = archiver('zip', { zlib: { level: 9 } })

    output.on('close', () => resolve())
    archive.on('error', (err: any) => reject(err))

    archive.pipe(output)

    // Add database and images, ignore shm, wal, cache
    archive.file(path.join(sourceDir, 'podiatry_records.sqlite'), { name: 'podiatry_records.sqlite' })
    
    const imagesDir = path.join(sourceDir, 'patient_images')
    if (fs.existsSync(imagesDir)) {
      archive.directory(imagesDir, 'patient_images')
    }

    archive.finalize()
  })
}

/**
 * Exports an encrypted backup of the user's data
 */
export async function exportEncryptedBackup(destPath: string, password: string): Promise<boolean> {
  if (!password || password.length < 4) {
    throw new BackupError('A senha deve ter pelo menos 4 caracteres.')
  }

  const userDataPath = app.getPath('userData')
  const tempZipPath = path.join(userDataPath, 'temp_backup.zip')

  try {
    // 1. Create a raw ZIP of the relevant data
    await createArchive(userDataPath, tempZipPath)

    // 2. Setup Encryption
    const salt = crypto.randomBytes(SALT_LEN)
    const iv = crypto.randomBytes(IV_LEN)
    const key = deriveKey(password, salt)
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    
    // 3. Process the file
    const input = fs.createReadStream(tempZipPath)
    const output = fs.createWriteStream(destPath)

    return new Promise((resolve, reject) => {
      output.on('finish', async () => {
        try {
          // Append the auth tag at the end of the file
          const authTag = cipher.getAuthTag()
          await fsPromises.appendFile(destPath, authTag)
          
          // Cleanup temp file
          await fsPromises.unlink(tempZipPath)
          
          logAction('system', 'export_backup', 'backup', destPath)
          resolve(true)
        } catch (err) {
          reject(err)
        }
      })

      output.on('error', reject)
      input.on('error', reject)
      cipher.on('error', reject)

      // Write Header: SALT (16) + IV (12)
      output.write(salt)
      output.write(iv)

      // Pipe encrypted data
      input.pipe(cipher).pipe(output)
    })

  } catch (error) {
    // Cleanup on error
    if (fs.existsSync(tempZipPath)) {
      await fsPromises.unlink(tempZipPath).catch(() => {})
    }
    throw new BackupError(`Falha ao exportar backup: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}
