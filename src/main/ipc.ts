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

export function registerIpcHandlers() {
  ipcMain.handle('listPatients', (_, sortMode: SortMode, searchQuery: string) => {
    return listPatients(sortMode, searchQuery)
  })

  ipcMain.handle('getPatientWithForm', (_, patientId: number) => {
    return getPatientWithForm(patientId)
  })

  ipcMain.handle('createPatientWithForm', (_, payload: CreatePatientWithFormPayload) => {
    return createPatientWithForm(payload)
  })

  ipcMain.handle('updatePatientWithForm', (_, patientId: number, payload: UpdatePatientWithFormPayload) => {
    updatePatientWithForm(patientId, payload)
  })

  ipcMain.handle('deletePatients', (_, patientIds: number[]) => {
    deletePatients(patientIds)
  })

  ipcMain.handle('getPatient', (_, patientId: number) => {
    return getPatient(patientId)
  })

  ipcMain.handle('getPatientForms', (_, patientId: number) => {
    return getPatientForms(patientId)
  })

  ipcMain.handle('getForm', (_, formId: number) => {
    return getForm(formId)
  })

  ipcMain.handle('updatePatient', (_, patientId: number, payload: UpdatePatientPayload) => {
    updatePatient(patientId, payload)
  })

  ipcMain.handle('createPatient', (_, payload: CreatePatientPayload) => {
    return createPatient(payload)
  })

  ipcMain.handle('createPatientForm', (_, patientId: number, payload: CreateFormPayload) => {
    return createPatientForm(patientId, payload)
  })

  ipcMain.handle('updatePatientForm', (_, formId: number, payload: UpdateFormPayload) => {
    updatePatientForm(formId, payload)
  })

  ipcMain.handle('getAppointments', (_, start: string, end: string) => {
    return getAppointments(start, end)
  })

  ipcMain.handle('getAllAppointments', () => {
    return getAllAppointments()
  })

  ipcMain.handle('createAppointment', async (_, payload: CreateAppointmentPayload) => {
    // Attempt to push to Google Calendar first
    const googleEventId = await createGoogleEvent(payload)
    const localPayload = { ...payload, google_event_id: googleEventId }
    return createAppointment(localPayload)
  })

  ipcMain.handle('updateAppointment', async (_, id: number, payload: UpdateAppointmentPayload) => {
    // If it has a google_event_id, we need to fetch it to update Google Calendar
    const appointments = getAllAppointments()
    const existing = appointments.find(a => a.id === id)
    if (existing && existing.google_event_id) {
      await updateGoogleEvent(existing.google_event_id, payload)
    }
    updateAppointment(id, payload)
  })

  ipcMain.handle('deleteAppointment', async (_, id: number) => {
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
    return validateLicense(key)
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
      // Ignored if URL is invalid or unsafe protocol
    }
  })

  ipcMain.handle('createTransaction', (_, payload: CreateTransactionPayload) => {
    return createTransaction(payload)
  })

  ipcMain.handle('updateTransaction', (_, id: number, payload: UpdateTransactionPayload) => {
    return updateTransaction(id, payload)
  })

  ipcMain.handle('deleteTransaction', (_, id: number) => {
    return deleteTransaction(id)
  })

  ipcMain.handle('getTransactions', (_, startDate: string, endDate: string) => {
    return getTransactions(startDate, endDate)
  })

  ipcMain.handle('getFinancialSummary', (_, startDate: string, endDate: string) => {
    return getFinancialSummary(startDate, endDate)
  })

  ipcMain.handle('getSetting', (_, key: string) => {
    return getSetting(key)
  })

  ipcMain.handle('setSetting', (_, key: string, value: string) => {
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
    return sendTestWhatsappMessage(phone, message)
  })

  ipcMain.handle('getPatientImages', (_, patientId: number) => {
    return getPatientImages(patientId)
  })

  ipcMain.handle('pickAndSavePatientImage', async (_, patientId: number) => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg', 'webp'] }]
    })

    if (canceled || filePaths.length === 0) return null

    const sourcePath = filePaths[0]
    const ext = path.extname(sourcePath)
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
    updatePatientImageDescription(id, description)
  })

  ipcMain.handle('deletePatientImage', async (_, id: number, fileName: string) => {
    deletePatientImage(id)
    try {
      const targetPath = path.join(app.getPath('userData'), 'patient_images', fileName)
      await fs.unlink(targetPath)
    } catch (e) {
      console.error('Failed to delete image file', e)
    }
  })

  ipcMain.handle('readPatientImageBase64', async (_, fileName: string) => {
    try {
      const targetPath = path.join(app.getPath('userData'), 'patient_images', fileName)
      const buffer = await fs.readFile(targetPath)
      const ext = path.extname(fileName).slice(1)
      return `data:image/${ext};base64,${buffer.toString('base64')}`
    } catch (e) {
      console.error('Failed to read image file', e)
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

    // Flush WAL to main database file to ensure data consistency
    try {
      const { getDb } = require('./database')
      const dbInstance = getDb()
      if (dbInstance) {
        dbInstance.pragma('wal_checkpoint(TRUNCATE)')
      }
    } catch (e) {
      console.error('Failed to run wal_checkpoint before backup:', e)
    }

    return new Promise((resolve, reject) => {
      try {
        const archiverModule = require('archiver')
        const output = createWriteStream(filePath)
        const archive = new archiverModule.ZipArchive({ zlib: { level: 9 } })

        output.on('close', () => {
          // Save the timestamp of this backup
          const timestamp = new Date().toISOString()
          setSetting('last_backup_date', timestamp)
          resolve(filePath)
        })

        output.on('error', (err: any) => {
          console.error('Output Stream Error', err)
          reject(err)
        })

        archive.on('error', (err: any) => {
          console.error('Backup Error', err)
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
        console.error('Failed to initialize backup archiver', err)
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
      console.error(e)
    }

    async function calculateDirSize(dirPath: string): Promise<number> {
      let size = 0
      try {
        const files = await fs.readdir(dirPath)
        for (const file of files) {
          const filePath = path.join(dirPath, file)
          const stat = await fs.stat(filePath)
          if (stat.isDirectory()) {
            size += await calculateDirSize(filePath)
          } else {
            size += stat.size
          }
        }
      } catch (e) {
        // Ignored
      }
      return size
    }

    imagesSize = await calculateDirSize(imagesPath)
    
    // Return sizes in MB (with 2 decimal places)
    return {
      dbSize: parseFloat((dbSize / (1024 * 1024)).toFixed(2)),
      imagesSize: parseFloat((imagesSize / (1024 * 1024)).toFixed(2)),
      totalSize: parseFloat(((dbSize + imagesSize) / (1024 * 1024)).toFixed(2))
    }
  })

  ipcMain.handle('pickAndSaveClinicLogo', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg', 'webp'] }]
    })

    if (canceled || filePaths.length === 0) return null

    const sourcePath = filePaths[0]
    const ext = path.extname(sourcePath)
    const fileName = `clinic_logo${ext}`
    const targetPath = path.join(app.getPath('userData'), fileName)

    const existingPath = getSetting('clinic_logo_path')
    if (existingPath && existingPath !== '') {
      try {
        await fs.unlink(existingPath)
      } catch (err) {
        console.warn('Failed to delete previous logo file:', err)
      }
    }

    await fs.copyFile(sourcePath, targetPath)
    setSetting('clinic_logo_path', targetPath)

    try {
      const buffer = await fs.readFile(targetPath)
      const extName = ext.slice(1)
      return `data:image/${extName};base64,${buffer.toString('base64')}`
    } catch (e) {
      console.error('Failed to read logo after pick', e)
      return null
    }
  })

  ipcMain.handle('getClinicLogoBase64', async () => {
    const logoPath = getSetting('clinic_logo_path')
    if (!logoPath || logoPath === '') return null
    try {
      const buffer = await fs.readFile(logoPath)
      const ext = path.extname(logoPath).slice(1)
      return `data:image/${ext};base64,${buffer.toString('base64')}`
    } catch (e) {
      console.error('Failed to read clinic logo file', e)
      return null
    }
  })

  ipcMain.handle('deleteClinicLogo', async () => {
    const logoPath = getSetting('clinic_logo_path')
    if (logoPath && logoPath !== '') {
      try {
        await fs.unlink(logoPath)
      } catch (e) {
        console.error('Failed to delete clinic logo file', e)
      }
    }
    setSetting('clinic_logo_path', '')
    return true
  })

  ipcMain.handle('factoryReset', async () => {
    try {
      const dbInstance = getDb()
      if (dbInstance) {
        dbInstance.close()
      }
    } catch (e) {
      console.error('Error closing database', e)
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
      console.error('Error deleting files during reset', e)
    }

    app.relaunch()
    app.exit(0)
  })
}

