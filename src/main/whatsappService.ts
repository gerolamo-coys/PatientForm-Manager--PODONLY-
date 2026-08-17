import { Client, LocalAuth } from 'whatsapp-web.js'
import QRCode from 'qrcode'
import path from 'path'
import fs from 'fs'
import { app, BrowserWindow } from 'electron'
import { addDays, startOfDay, endOfDay, format } from 'date-fns'
import { getDb, getSetting, setSetting } from './database'

let client: Client | null = null
let currentStatus: 'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED' = 'DISCONNECTED'
let currentQr = ''

function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '')
  if (!cleaned) return ''
  
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1)
  }

  // If it has 10 or 11 digits, assume Brazilian area code + phone number and prepend country code 55
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = '55' + cleaned
  }
  
  return cleaned
}

function sendStatusToRenderer() {
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    win.webContents.send('whatsapp-status', {
      status: currentStatus,
      qrDataUri: currentQr
    })
  }
}

export function getWhatsappStatus() {
  return {
    status: currentStatus,
    qrDataUri: currentQr
  }
}

export async function startWhatsapp() {
  if (client) {
    console.log('WhatsApp client already initialized.')
    return
  }

  currentStatus = 'CONNECTING'
  currentQr = ''
  sendStatusToRenderer()

  const userDataPath = app.getPath('userData')
  const authPath = path.join(userDataPath, '.wwebjs_auth')

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: authPath
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    }
  })

  client.on('qr', (qr) => {
    QRCode.toDataURL(qr, (err, url) => {
      if (!err) {
        currentQr = url
        currentStatus = 'QR_READY'
        sendStatusToRenderer()
      } else {
        console.error('Error generating QR code URI:', err)
      }
    })
  })

  client.on('ready', () => {
    currentStatus = 'CONNECTED'
    currentQr = ''
    sendStatusToRenderer()
    console.log('WhatsApp client is ready!')
  })

  client.on('auth_failure', (msg) => {
    console.error('WhatsApp authentication failure:', msg)
    currentStatus = 'DISCONNECTED'
    currentQr = ''
    sendStatusToRenderer()
    client = null
  })

  client.on('disconnected', (reason) => {
    console.log('WhatsApp was disconnected:', reason)
    currentStatus = 'DISCONNECTED'
    currentQr = ''
    sendStatusToRenderer()
    client = null
  })

  try {
    await client.initialize()
  } catch (err) {
    console.error('Failed to initialize WhatsApp client:', err)
    currentStatus = 'DISCONNECTED'
    currentQr = ''
    sendStatusToRenderer()
    client = null
  }
}

export async function logoutWhatsapp() {
  if (!client) {
    // If not client but session folder exists, delete it
    const userDataPath = app.getPath('userData')
    const authPath = path.join(userDataPath, '.wwebjs_auth')
    if (fs.existsSync(authPath)) {
      try {
        fs.rmSync(authPath, { recursive: true, force: true })
      } catch (e) {
        console.error('Error removing auth folder during fallback logout:', e)
      }
    }
    currentStatus = 'DISCONNECTED'
    currentQr = ''
    sendStatusToRenderer()
    return
  }

  try {
    currentStatus = 'DISCONNECTED'
    currentQr = ''
    sendStatusToRenderer()

    await client.logout()
    await client.destroy()
  } catch (err) {
    console.error('Error during WhatsApp logout:', err)
  } finally {
    client = null
    const userDataPath = app.getPath('userData')
    const authPath = path.join(userDataPath, '.wwebjs_auth')
    if (fs.existsSync(authPath)) {
      try {
        fs.rmSync(authPath, { recursive: true, force: true })
      } catch (e) {
        console.error('Error removing auth folder after logout:', e)
      }
    }
  }
}

export async function sendTestWhatsappMessage(phone: string, message: string): Promise<boolean> {
  if (currentStatus !== 'CONNECTED' || !client) {
    throw new Error('O robô WhatsApp não está conectado.')
  }

  const cleanedPhone = formatPhoneNumber(phone)
  if (!cleanedPhone) {
    throw new Error('Número de telefone inválido.')
  }

  try {
    const chatId = cleanedPhone + '@c.us'
    await client.sendMessage(chatId, message)
    return true
  } catch (err: any) {
    console.error('Failed to send test WhatsApp message:', err)
    throw new Error(`Falha ao enviar mensagem: ${err.message || err}`)
  }
}

export async function sendTomorrowReminders() {
  if (currentStatus !== 'CONNECTED' || !client) {
    console.log('Reminder scheduler: WhatsApp is not connected. Skipping reminders.')
    return
  }

  console.log('Running automatic WhatsApp reminders job for tomorrow...')
  const tomorrow = addDays(new Date(), 1)
  const tomorrowStart = startOfDay(tomorrow).toISOString()
  const tomorrowEnd = endOfDay(tomorrow).toISOString()

  const db = getDb()
  if (!db) {
    console.error('Database is not initialized.')
    return
  }

  // Fetch tomorrow's appointments join with patients
  const appointments = db.prepare(`
    SELECT a.id, a.start_time, p.first_name, p.last_name, p.phone
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    WHERE a.start_time >= ? AND a.start_time <= ?
  `).all(tomorrowStart, tomorrowEnd) as any[]

  if (appointments.length === 0) {
    console.log('No appointments found for tomorrow.')
    return
  }

  const template = getSetting('whatsapp_template') || 
    'Olá {nome}! Passando para lembrar da sua consulta de podologia amanhã, {data}, às {hora}.'

  for (const appt of appointments) {
    if (!appt.phone) {
      console.log(`Skipping appointment ${appt.id}: patient has no phone.`)
      continue
    }

    const cleanedPhone = formatPhoneNumber(appt.phone)
    if (!cleanedPhone) {
      console.log(`Skipping appointment ${appt.id}: invalid phone: ${appt.phone}`)
      continue
    }

    const apptDate = new Date(appt.start_time)
    const dateStr = format(apptDate, 'dd/MM/yyyy')
    const timeStr = format(apptDate, 'HH:mm')

    const message = template
      .replace(/{nome}/g, `${appt.first_name} ${appt.last_name}`)
      .replace(/{data}/g, dateStr)
      .replace(/{hora}/g, timeStr)

    try {
      const chatId = cleanedPhone + '@c.us'
      await client.sendMessage(chatId, message)
      console.log(`Automated reminder successfully sent to ${appt.first_name} (${cleanedPhone})`)
    } catch (err) {
      console.error(`Failed to send automated reminder to ${appt.first_name} (${cleanedPhone}):`, err)
    }
  }
}

export function initWhatsappService() {
  // Start the background cron checker (every 60 seconds)
  setInterval(async () => {
    try {
      const enabled = getSetting('whatsapp_enabled') === 'true'
      if (!enabled || currentStatus !== 'CONNECTED') {
        return
      }

      const targetTime = getSetting('whatsapp_time') || '09:00'
      const now = new Date()
      const currentHHMM = format(now, 'HH:mm')
      const todayYYYYMMDD = format(now, 'yyyy-MM-dd')

      const lastRunDate = getSetting('whatsapp_last_run_date')
      if (currentHHMM === targetTime && lastRunDate !== todayYYYYMMDD) {
        // Optimistically set today's run date to avoid duplicate runs
        setSetting('whatsapp_last_run_date', todayYYYYMMDD)
        await sendTomorrowReminders()
      }
    } catch (err) {
      console.error('Error in WhatsApp scheduler loop:', err)
    }
  }, 60 * 1000)

  // Auto-start WhatsApp if setting is enabled
  const enabled = getSetting('whatsapp_enabled') === 'true'
  if (enabled) {
    console.log('WhatsApp reminders are enabled. Autostarting client...')
    startWhatsapp().catch((err) => {
      console.error('Failed to autostart WhatsApp client:', err)
    })
  }
}
