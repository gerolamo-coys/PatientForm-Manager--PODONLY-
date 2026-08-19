import { ipcMain, app, dialog, shell } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { createWriteStream, existsSync } from 'fs'
import crypto from 'crypto'
import {
  listPatients,
  getPatientWithForm,
  createPatientWithForm,
  updatePatientWithForm,
  deletePatients,
  getPatient,
  getPatientForms,
  getForm,
  updatePatient,
  createPatient,
  createPatientForm,
  updatePatientForm,
  getAppointments,
  getAllAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getSetting,
  setSetting,
  getPatientImages,
  addPatientImage,
  updatePatientImageDescription,
  deletePatientImage,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactions,
  getFinancialSummary,
  getDb
} from './database'
import { authenticateGoogle } from './googleAuth'
import { pullFromGoogleCalendar, createGoogleEvent, updateGoogleEvent, deleteGoogleEvent } from './googleCalendar'
import {
  startWhatsapp,
  logoutWhatsapp,
  getWhatsappStatus,
  sendTestWhatsappMessage
} from './whatsappService'
import { validateLicense, checkLicenseStatus, getSubscriptionDetails, cancelSubscription } from './licenseManager'

import type {
  SortMode,
  CreatePatientWithFormPayload,
  UpdatePatientWithFormPayload,
  UpdatePatientPayload,
  CreatePatientPayload,
  CreateFormPayload,
  UpdateFormPayload,
  CreateAppointmentPayload,
  UpdateAppointmentPayload,
  CreateTransactionPayload,
  UpdateTransactionPayload
} from '../shared/types'

// ==========================================
// Constantes de Validação e Limites de Segurança
// ==========================================
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

/**
 * Valida se um valor numérico é um ID inteiro positivo seguro
 */
function isValidId(id: unknown): id is number {
  return typeof id === 'number' && Number.isInteger(id) && id > 0
}

/**
 * Sanitiza o nome de arquivo para prevenir Directory Traversal (ex: ../../etc)
 */
function sanitizeFileName(fileName: unknown): string | null {
  if (typeof fileName !== 'string' || !fileName.trim()) return null
  const base = path.basename(fileName.trim())
  if (!base || base === '.' || base === '..') return null
  return base
}

/**
 * Garante que um caminho de arquivo esteja estritamente contido no diretório base autorizado
 */
function isSafeFilePath(baseDir: string, targetPath: string): boolean {
  const relative = path.relative(baseDir, targetPath)
  return !!relative && !relative.startsWith('..') && !path.isAbsolute(relative)
}

export function registerIpcHandlers() {
  ipcMain.handle('listPatients', (_, sortMode: SortMode, searchQuery: string) => {
    const safeSort: SortMode = sortMode === 'alphabetical' ? 'alphabetical' : 'last_created'
    const safeSearch = typeof searchQuery === 'string' ? searchQuery.slice(0, 100) : ''
    return listPatients(safeSort, safeSearch)
  })

  ipcMain.handle('getPatientWithForm', (_, patientId: number) => {
    if (!isValidId(patientId)) return null
    return getPatientWithForm(patientId)
  })

  ipcMain.handle('createPatientWithForm', (_, payload: CreatePatientWithFormPayload) => {
    if (!payload || !payload.patient) {
      throw new Error('Payload de paciente inválido.')
    }
    return createPatientWithForm(payload)
  })

  ipcMain.handle('updatePatientWithForm', (_, patientId: number, payload: UpdatePatientWithFormPayload) => {
    if (!isValidId(patientId) || !payload) return
    updatePatientWithForm(patientId, payload)
  })

  ipcMain.handle('deletePatients', (_, patientIds: number[]) => {
    if (!Array.isArray(patientIds)) return
    const safeIds = patientIds.filter(isValidId)
    if (safeIds.length > 0) {
      deletePatients(safeIds)
    }
  })

  ipcMain.handle('getPatient', (_, patientId: number) => {
    if (!isValidId(patientId)) return null
    return getPatient(patientId)
  })

  ipcMain.handle('getPatientForms', (_, patientId: number) => {
    if (!isValidId(patientId)) return []
    return getPatientForms(patientId)
  })

  ipcMain.handle('getForm', (_, formId: number) => {
    if (!isValidId(formId)) return null
    return getForm(formId)
  })

  ipcMain.handle('updatePatient', (_, patientId: number, payload: UpdatePatientPayload) => {
    if (!isValidId(patientId) || !payload) return
    updatePatient(patientId, payload)
  })

  ipcMain.handle('createPatient', (_, payload: CreatePatientPayload) => {
    if (!payload) throw new Error('Dados de paciente inválidos.')
    return createPatient(payload)
  })

  ipcMain.handle('createPatientForm', (_, patientId: number, payload: CreateFormPayload) => {
    if (!isValidId(patientId) || !payload) throw new Error('Dados da ficha inválidos.')
    return createPatientForm(patientId, payload)
  })

  ipcMain.handle('updatePatientForm', (_, formId: number, payload: UpdateFormPayload) => {
    if (!isValidId(formId) || !payload) return
    updatePatientForm(formId, payload)
  })

  ipcMain.handle('getAppointments', (_, start: string, end: string) => {
    const safeStart = typeof start === 'string' ? start.slice(0, 50) : ''
    const safeEnd = typeof end === 'string' ? end.slice(0, 50) : ''
    return getAppointments(safeStart, safeEnd)
  })

  ipcMain.handle('getAllAppointments', () => {
    return getAllAppointments()
  })

  ipcMain.handle('createAppointment', async (_, payload: CreateAppointmentPayload) => {
    if (!payload || !payload.title || !payload.start_time || !payload.end_time) {
      throw new Error('Dados de agendamento incompletos.')
    }
    // Tentativa de sincronização com Google Agenda
    const googleEventId = await createGoogleEvent(payload)
    const localPayload = { ...payload, google_event_id: googleEventId }
    return createAppointment(localPayload)
  })

  ipcMain.handle('updateAppointment', async (_, id: number, payload: UpdateAppointmentPayload) => {
    if (!isValidId(id) || !payload) return
    const appointments = getAllAppointments()
    const existing = appointments.find(a => a.id === id)
    if (existing && existing.google_event_id) {
      await updateGoogleEvent(existing.google_event_id, payload)
    }
    updateAppointment(id, payload)
  })

  ipcMain.handle('deleteAppointment', async (_, id: number) => {
    if (!isValidId(id)) return
    const appointments = getAllAppointments()
    const existing = appointments.find(a => a.id === id)
    if (existing && existing.google_event_id) {
      await deleteGoogleEvent(existing.google_event_id)
    }
    deleteAppointment(id)
  })

  ipcMain.handle('authenticateGoogle', async () => {
    return authenticateGoogle()
  })

  ipcMain.handle('pullFromGoogleCalendar', async () => {
    return await pullFromGoogleCalendar()
  })

  ipcMain.handle('validateLicense', async (_, key: string) => {
    const safeKey = typeof key === 'string' ? key.trim().slice(0, 100) : ''
    return validateLicense(safeKey)
  })

  ipcMain.handle('checkLicenseStatus', async () => {
    return checkLicenseStatus()
  })

  ipcMain.handle('getSubscriptionDetails', async () => {
    return getSubscriptionDetails()
  })

  ipcMain.handle('cancelSubscription', async () => {
    return cancelSubscription()
  })

  ipcMain.handle('openExternalBrowser', (_, url: string) => {
    try {
      if (!url || typeof url !== 'string') return
      const parsed = new URL(url)
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        shell.openExternal(url)
      }
    } catch {
      // Ignora URLs inválidas ou protocolos não permitidos
    }
  })

  ipcMain.handle('createTransaction', (_, payload: CreateTransactionPayload) => {
    if (!payload || typeof payload.amount !== 'number') {
      throw new Error('Dados de transação financeira inválidos.')
    }
    return createTransaction(payload)
  })

  ipcMain.handle('updateTransaction', (_, id: number, payload: UpdateTransactionPayload) => {
    if (!isValidId(id) || !payload) return
    return updateTransaction(id, payload)
  })

  ipcMain.handle('deleteTransaction', (_, id: number) => {
    if (!isValidId(id)) return
    return deleteTransaction(id)
  })

  ipcMain.handle('getTransactions', (_, startDate: string, endDate: string) => {
    const safeStart = typeof startDate === 'string' ? startDate.slice(0, 50) : ''
    const safeEnd = typeof endDate === 'string' ? endDate.slice(0, 50) : ''
    return getTransactions(safeStart, safeEnd)
  })

  ipcMain.handle('getFinancialSummary', (_, startDate: string, endDate: string) => {
    const safeStart = typeof startDate === 'string' ? startDate.slice(0, 50) : ''
    const safeEnd = typeof endDate === 'string' ? endDate.slice(0, 50) : ''
    return getFinancialSummary(safeStart, safeEnd)
  })

  ipcMain.handle('getSetting', (_, key: string) => {
    if (typeof key !== 'string') return null
    return getSetting(key)
  })

  ipcMain.handle('setSetting', (_, key: string, value: string) => {
    if (typeof key !== 'string' || typeof value !== 'string') return
    setSetting(key, value)
  })

  ipcMain.handle('getWhatsappStatus', () => {
    return getWhatsappStatus()
  })

  ipcMain.handle('startWhatsapp', async () => {
    await startWhatsapp()
  })

  ipcMain.handle('logoutWhatsapp', async () => {
    await logoutWhatsapp()
  })

  ipcMain.handle('sendTestWhatsappMessage', async (_, phone: string, message: string) => {
    const safePhone = typeof phone === 'string' ? phone.trim().slice(0, 30) : ''
    const safeMessage = typeof message === 'string' ? message.slice(0, 1000) : ''
    return sendTestWhatsappMessage(safePhone, safeMessage)
  })

  ipcMain.handle('getPatientImages', (_, patientId: number) => {
    if (!isValidId(patientId)) return []
    return getPatientImages(patientId)
  })

  ipcMain.handle('pickAndSavePatientImage', async (_, patientId: number) => {
    if (!isValidId(patientId)) return null

    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Imagens', extensions: ['jpg', 'png', 'jpeg', 'webp'] }]
    })

    if (canceled || filePaths.length === 0) return null

    const sourcePath = filePaths[0]
    const ext = path.extname(sourcePath).toLowerCase()

    // Validação rigorosa de extensão
    if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
      console.warn('Upload rejeitado: extensão não permitida:', ext)
      return null
    }

    // Validação rigorosa de tamanho de arquivo (máximo 10MB)
    try {
      const stat = await fs.stat(sourcePath)
      if (stat.size > MAX_IMAGE_SIZE_BYTES) {
        console.warn('Upload rejeitado: arquivo excede o limite de 10MB:', stat.size)
        return null
      }
    } catch (e) {
      console.error('Erro ao inspecionar arquivo de imagem:', e)
      return null
    }

    const uuid = crypto.randomUUID()
    const fileName = `${uuid}${ext}`
    
    const targetDir = path.join(app.getPath('userData'), 'patient_images')
    await fs.mkdir(targetDir, { recursive: true })
    
    const targetPath = path.join(targetDir, fileName)
    await fs.copyFile(sourcePath, targetPath)

    const id = addPatientImage(patientId, fileName)
    return id
  })

  ipcMain.handle('updatePatientImageDescription', (_, id: number, description: string) => {
    if (!isValidId(id)) return
    const safeDesc = typeof description === 'string' ? description.slice(0, 1000) : ''
    updatePatientImageDescription(id, safeDesc)
  })

  ipcMain.handle('deletePatientImage', async (_, id: number, fileName: string) => {
    if (isValidId(id)) {
      deletePatientImage(id)
    }

    const safeName = sanitizeFileName(fileName)
    if (!safeName) return

    const targetDir = path.join(app.getPath('userData'), 'patient_images')
    const targetPath = path.join(targetDir, safeName)

    if (!isSafeFilePath(targetDir, targetPath)) {
      console.warn('Tentativa de Directory Traversal bloqueada em deletePatientImage:', fileName)
      return
    }

    try {
      await fs.unlink(targetPath)
    } catch (e) {
      console.error('Falha ao remover arquivo de imagem:', e)
    }
  })

  ipcMain.handle('readPatientImageBase64', async (_, fileName: string) => {
    const safeName = sanitizeFileName(fileName)
    if (!safeName) return null

    const targetDir = path.join(app.getPath('userData'), 'patient_images')
    const targetPath = path.join(targetDir, safeName)

    if (!isSafeFilePath(targetDir, targetPath)) {
      console.warn('Tentativa de Directory Traversal bloqueada em readPatientImageBase64:', fileName)
      return null
    }

    try {
      const buffer = await fs.readFile(targetPath)
      const ext = path.extname(safeName).slice(1)
      return `data:image/${ext};base64,${buffer.toString('base64')}`
    } catch (e) {
      console.error('Falha ao ler arquivo de imagem:', e)
      return null
    }
  })

  ipcMain.handle('createBackup', async () => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Salvar Backup',
      defaultPath: 'podonly_backup.zip',
      filters: [{ name: 'Zip Archives', extensions: ['zip'] }]
    })

    if (canceled || !filePath) return null

    // Flush WAL para o banco principal garantindo integridade
    try {
      const { getDb } = require('./database')
      const dbInstance = getDb()
      if (dbInstance) {
        dbInstance.pragma('wal_checkpoint(TRUNCATE)')
      }
    } catch (e) {
      console.error('Falha no wal_checkpoint antes do backup:', e)
    }

    return new Promise((resolve, reject) => {
      try {
        const archiverModule = require('archiver')
        const output = createWriteStream(filePath)
        const archive = new archiverModule.ZipArchive({ zlib: { level: 9 } })

        output.on('close', () => {
          const timestamp = new Date().toISOString()
          setSetting('last_backup_date', timestamp)
          resolve(filePath)
        })

        output.on('error', (err: any) => {
          console.error('Erro de Output Stream no backup:', err)
          reject(err)
        })

        archive.on('error', (err: any) => {
          console.error('Erro no Archiver durante o backup:', err)
          reject(err)
        })

        archive.pipe(output)

        const userDataPath = app.getPath('userData')
        const dbPath = path.join(userDataPath, 'podiatry_records.sqlite')
        const dbWalPath = path.join(userDataPath, 'podiatry_records.sqlite-wal')
        const dbShmPath = path.join(userDataPath, 'podiatry_records.sqlite-shm')
        const imagesPath = path.join(userDataPath, 'patient_images')

        if (existsSync(dbPath)) {
          archive.file(dbPath, { name: 'podiatry_records.sqlite' })
        }
        if (existsSync(dbWalPath)) {
          archive.file(dbWalPath, { name: 'podiatry_records.sqlite-wal' })
        }
        if (existsSync(dbShmPath)) {
          archive.file(dbShmPath, { name: 'podiatry_records.sqlite-shm' })
        }
        
        if (existsSync(imagesPath)) {
          archive.directory(imagesPath, 'patient_images')
        }

        archive.finalize()
      } catch (err) {
        console.error('Falha ao inicializar o backup:', err)
        reject(err)
      }
    })
  })

  ipcMain.handle('getDiskUsage', async () => {
    const userDataPath = app.getPath('userData')
    const dbPath = path.join(userDataPath, 'podiatry_records.sqlite')
    const dbWalPath = path.join(userDataPath, 'podiatry_records.sqlite-wal')
    const dbShmPath = path.join(userDataPath, 'podiatry_records.sqlite-shm')
    const imagesPath = path.join(userDataPath, 'patient_images')

    let dbSize = 0
    let imagesSize = 0

    try {
      if (existsSync(dbPath)) {
        const dbStat = await fs.stat(dbPath)
        dbSize += dbStat.size
      }
      if (existsSync(dbWalPath)) {
        const walStat = await fs.stat(dbWalPath)
        dbSize += walStat.size
      }
      if (existsSync(dbShmPath)) {
        const shmStat = await fs.stat(dbShmPath)
        dbSize += shmStat.size
      }
    } catch (e) {
      console.error('Erro ao calcular tamanho do banco:', e)
    }

    async function calculateDirSize(dir: string): Promise<number> {
      let size = 0
      try {
        if (!existsSync(dir)) return 0
        const files = await fs.readdir(dir, { withFileTypes: true })
        for (const file of files) {
          const fullPath = path.join(dir, file.name)
          if (file.isDirectory()) {
            size += await calculateDirSize(fullPath)
          } else {
            const s = await fs.stat(fullPath)
            size += s.size
          }
        }
      } catch {
        // Ignorado
      }

      return size
    }

    imagesSize = await calculateDirSize(imagesPath)
    
    return {
      dbSize: parseFloat((dbSize / (1024 * 1024)).toFixed(2)),
      imagesSize: parseFloat((imagesSize / (1024 * 1024)).toFixed(2)),
      totalSize: parseFloat(((dbSize + imagesSize) / (1024 * 1024)).toFixed(2))
    }
  })

  ipcMain.handle('pickAndSaveClinicLogo', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Imagens', extensions: ['jpg', 'png', 'jpeg', 'webp'] }]
    })

    if (canceled || filePaths.length === 0) return null

    const sourcePath = filePaths[0]
    const ext = path.extname(sourcePath).toLowerCase()

    if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
      console.warn('Upload de logo rejeitado: extensão não permitida:', ext)
      return null
    }

    try {
      const stat = await fs.stat(sourcePath)
      if (stat.size > MAX_IMAGE_SIZE_BYTES) {
        console.warn('Upload de logo rejeitado: tamanho excede 10MB:', stat.size)
        return null
      }
    } catch (e) {
      console.error('Erro ao verificar tamanho do logo:', e)
      return null
    }

    const fileName = `clinic_logo${ext}`
    const targetDir = app.getPath('userData')
    const targetPath = path.join(targetDir, fileName)

    const existingPath = getSetting('clinic_logo_path')
    if (existingPath && existingPath !== '') {
      try {
        if (existsSync(existingPath)) {
          await fs.unlink(existingPath)
        }
      } catch (err) {
        console.warn('Falha ao remover arquivo de logo anterior:', err)
      }
    }

    await fs.copyFile(sourcePath, targetPath)
    setSetting('clinic_logo_path', targetPath)

    try {
      const buffer = await fs.readFile(targetPath)
      const extName = ext.slice(1)
      return `data:image/${extName};base64,${buffer.toString('base64')}`
    } catch (e) {
      console.error('Falha ao ler logo após upload:', e)
      return null
    }
  })

  ipcMain.handle('getClinicLogoBase64', async () => {
    const logoPath = getSetting('clinic_logo_path')
    if (!logoPath || typeof logoPath !== 'string') return null
    try {
      if (!existsSync(logoPath)) return null
      const buffer = await fs.readFile(logoPath)
      const ext = path.extname(logoPath).slice(1)
      return `data:image/${ext};base64,${buffer.toString('base64')}`
    } catch (e) {
      console.error('Falha ao ler arquivo do logotipo da clínica:', e)
      return null
    }
  })

  ipcMain.handle('deleteClinicLogo', async () => {
    const logoPath = getSetting('clinic_logo_path')
    if (logoPath && typeof logoPath === 'string') {
      try {
        if (existsSync(logoPath)) {
          await fs.unlink(logoPath)
        }
      } catch (e) {
        console.error('Falha ao deletar arquivo do logotipo da clínica:', e)
      }
    }
    setSetting('clinic_logo_path', '')
    return true
  })

  ipcMain.handle('factoryReset', async (_, confirmationToken: string) => {
    // Exige estritamente a confirmação digitada para prevenir invocações acidentais ou não autorizadas
    if (typeof confirmationToken !== 'string' || confirmationToken.trim() !== 'APAGAR') {
      console.warn('Tentativa de Factory Reset rejeitada: confirmação inválida.')
      return false
    }

    try {
      const dbInstance = getDb()
      if (dbInstance) {
        dbInstance.close()
      }
    } catch (e) {
      console.error('Erro ao fechar o banco de dados:', e)
    }

    const userDataPath = app.getPath('userData')
    const dbPath = path.join(userDataPath, 'podiatry_records.sqlite')
    const dbWalPath = path.join(userDataPath, 'podiatry_records.sqlite-wal')
    const dbShmPath = path.join(userDataPath, 'podiatry_records.sqlite-shm')
    const imagesPath = path.join(userDataPath, 'patient_images')

    try {
      await fs.rm(dbPath, { force: true })
      await fs.rm(dbWalPath, { force: true })
      await fs.rm(dbShmPath, { force: true })
      await fs.rm(imagesPath, { recursive: true, force: true })
    } catch (e) {
      console.error('Erro ao apagar arquivos no reset de fábrica:', e)
    }

    app.relaunch()
    app.exit(0)
    return true
  })
}

