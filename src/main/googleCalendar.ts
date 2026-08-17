import { google } from 'googleapis'
import { getOAuth2Client } from './googleAuth'
import { createAppointment, updateAppointment, setSetting } from './database'
import type { Appointment } from '../shared/types'
import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'

// Get db instance to run specific queries easily
function getDb() {
  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'podiatry_records.sqlite')
  return new Database(dbPath)
}

function handleGoogleAuthError(error: any): boolean {
  const errMsg = error?.message || ''
  const errCode = error?.code || ''
  const status = error?.status || error?.response?.status || ''

  if (
    errMsg.includes('invalid_grant') ||
    errMsg.includes('invalid_request') ||
    errMsg.includes('Credentials must contain') ||
    errCode === 401 ||
    errCode === 400 ||
    status === 401 ||
    status === 400
  ) {
    console.warn('Google credentials invalid/expired. Clearing google_auth_tokens...')
    try {
      setSetting('google_auth_tokens', '')
    } catch (dbErr) {
      console.error('Failed to clear google_auth_tokens from DB:', dbErr)
    }
    return true
  }
  return false
}

export async function createGoogleEvent(appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const oauth2Client = getOAuth2Client()
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    const event = {
      summary: appointment.title,
      description: appointment.notes || '',
      start: { dateTime: appointment.start_time },
      end: { dateTime: appointment.end_time }
    }

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event
    })

    return response.data.id || null
  } catch (e) {
    console.error('Error creating Google Event', e)
    handleGoogleAuthError(e)
    return null
  }
}

export async function updateGoogleEvent(googleEventId: string, appointment: Partial<Appointment>): Promise<boolean> {
  try {
    const oauth2Client = getOAuth2Client()
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    const event: any = {}
    if (appointment.title) event.summary = appointment.title
    if (appointment.notes !== undefined) event.description = appointment.notes || ''
    if (appointment.start_time) event.start = { dateTime: appointment.start_time }
    if (appointment.end_time) event.end = { dateTime: appointment.end_time }

    await calendar.events.patch({
      calendarId: 'primary',
      eventId: googleEventId,
      requestBody: event
    })

    return true
  } catch (e) {
    console.error('Error updating Google Event', e)
    handleGoogleAuthError(e)
    return false
  }
}

export async function deleteGoogleEvent(googleEventId: string): Promise<boolean> {
  try {
    const oauth2Client = getOAuth2Client()
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: googleEventId
    })

    return true
  } catch (e) {
    console.error('Error deleting Google Event', e)
    handleGoogleAuthError(e)
    return false
  }
}

export async function pullFromGoogleCalendar(): Promise<{ success: boolean; error?: string }> {
  try {
    const oauth2Client = getOAuth2Client()
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    const db = getDb()

    // Fetch events from the last 30 days and future
    const timeMin = new Date()
    timeMin.setDate(timeMin.getDate() - 30)

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      singleEvents: true,
      maxResults: 2500,
    })

    const items = response.data.items || []

    for (const item of items) {
      if (!item.id || !item.start?.dateTime || !item.end?.dateTime) continue

      const existingStmt = db.prepare('SELECT id FROM appointments WHERE google_event_id = ?')
      const existing = existingStmt.get(item.id) as { id: number } | undefined

      if (item.status === 'cancelled') {
        if (existing) {
          db.prepare('DELETE FROM appointments WHERE id = ?').run(existing.id)
        }
      } else {
        if (existing) {
          updateAppointment(existing.id, {
            title: item.summary || 'Sem Título',
            start_time: item.start.dateTime,
            end_time: item.end.dateTime,
            notes: item.description || null
          })
        } else {
          createAppointment({
            patient_id: null,
            title: item.summary || 'Sem Título',
            start_time: item.start.dateTime,
            end_time: item.end.dateTime,
            notes: item.description || null,
            google_event_id: item.id
          })
        }
      }
    }

    return { success: true }
  } catch (e: any) {
    console.error('Error pulling from Google Calendar', e)
    const isAuthError = handleGoogleAuthError(e)
    return {
      success: false,
      error: isAuthError ? 'AUTH_ERROR' : (e.message || 'Erro desconhecido')
    }
  }
}
