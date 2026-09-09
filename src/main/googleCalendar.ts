import { google } from 'googleapis'
import { getOAuth2Client, hasGoogleCredentials } from './googleAuth'
import { getDb, createAppointment, updateAppointment, setSetting } from './database'
import { loadGoogleTokens, deleteGoogleTokens } from './secretStorage'
import type { Appointment, GoogleSyncResult } from '../shared/types'

function hasActiveGoogleSession(): boolean {
  if (!hasGoogleCredentials()) return false
  const tokens = loadGoogleTokens()
  return Boolean(tokens && (tokens.access_token || tokens.refresh_token))
}

/**
 * Trata erros de autenticação do Google e limpa credenciais expiradas ou revogadas
 */
function handleGoogleAuthError(error: unknown): boolean {
  const err = error as { message?: string; code?: number | string; status?: number | string; response?: { status?: number | string } } | null | undefined
  const errMsg = err?.message || ''
  const errCode = err?.code || ''
  const status = err?.status || err?.response?.status || ''

  if (
    errMsg.includes('invalid_grant') ||
    errMsg.includes('invalid_token') ||
    errMsg.includes('unauthorized') ||
    errCode === 401 ||
    status === 401
  ) {
    console.warn('Credenciais do Google inválidas ou revogadas. Limpando tokens de autenticação...')
    try {
      deleteGoogleTokens()
      setSetting('google_account_email', '')
      setSetting('google_auth_tokens', '')
    } catch (dbErr) {
      console.error('Falha ao limpar tokens do Google:', dbErr)
    }
    return true
  }
  return false
}

export async function createGoogleEvent(appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  if (!hasActiveGoogleSession()) return null

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
    console.error('Erro ao criar evento no Google Calendar:', e)
    handleGoogleAuthError(e)
    return null
  }
}

export async function updateGoogleEvent(googleEventId: string, appointment: Partial<Appointment>): Promise<boolean> {
  if (!hasActiveGoogleSession()) return false

  try {
    const oauth2Client = getOAuth2Client()
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    const event: Record<string, unknown> = {}
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
    console.error('Erro ao atualizar evento no Google Calendar:', e)
    handleGoogleAuthError(e)
    return false
  }
}

export async function deleteGoogleEvent(googleEventId: string): Promise<boolean> {
  if (!hasActiveGoogleSession()) return false

  try {
    const oauth2Client = getOAuth2Client()
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: googleEventId
    })

    return true
  } catch (e) {
    console.error('Erro ao remover evento no Google Calendar:', e)
    handleGoogleAuthError(e)
    return false
  }
}

export async function pullFromGoogleCalendar(): Promise<GoogleSyncResult> {
  if (!hasActiveGoogleSession()) {
    return { success: false, error: 'NOT_CONNECTED' }
  }

  try {
    const oauth2Client = getOAuth2Client()
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    const db = getDb()

    if (!db) {
      return { success: false, error: 'Banco de dados não inicializado.' }
    }

    // Fetch events from the last 60 days to future
    const timeMin = new Date()
    timeMin.setDate(timeMin.getDate() - 60)

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      singleEvents: true,
      maxResults: 2500,
    })

    const items = response.data.items || []
    let processedCount = 0

    // Prepare patient lookup queries for smart matching
    const findPatientByNameStmt = db.prepare(`
      SELECT id FROM patients 
      WHERE LOWER(TRIM(first_name || ' ' || last_name)) = LOWER(TRIM(?))
      LIMIT 1
    `)

    const allPatients = db.prepare('SELECT id, first_name, last_name, phone FROM patients').all() as Array<{
      id: number
      first_name: string
      last_name: string
      phone: string | null
    }>

    const syncTransaction = db.transaction((eventsList: typeof items) => {
      const existingStmt = db.prepare('SELECT id, patient_id FROM appointments WHERE google_event_id = ?')
      const deleteStmt = db.prepare('DELETE FROM appointments WHERE id = ?')

      for (const item of eventsList) {
        if (!item.id) continue

        // Parse start and end times (handling both dateTime and all-day date strings)
        let startTimeIso: string | null = null
        let endTimeIso: string | null = null

        if (item.start?.dateTime && item.end?.dateTime) {
          startTimeIso = new Date(item.start.dateTime).toISOString()
          endTimeIso = new Date(item.end.dateTime).toISOString()
        } else if (item.start?.date) {
          // All-day event: default from 08:00 to 18:00 on that day
          const startDate = item.start.date
          startTimeIso = new Date(`${startDate}T08:00:00`).toISOString()
          endTimeIso = new Date(`${startDate}T18:00:00`).toISOString()
        }

        if (!startTimeIso || !endTimeIso) continue

        const existing = existingStmt.get(item.id) as { id: number; patient_id: number | null } | undefined
        const summary = (item.summary || '').trim() || 'Consulta (Google)'

        if (item.status === 'cancelled') {
          if (existing) {
            deleteStmt.run(existing.id)
          }
        } else {
          // Smart Patient Matching: try to associate with an existing patient
          let matchedPatientId: number | null = existing?.patient_id || null

          if (!matchedPatientId && summary) {
            const directMatch = findPatientByNameStmt.get(summary) as { id: number } | undefined
            if (directMatch) {
              matchedPatientId = directMatch.id
            } else {
              // Check if any patient's name is in the summary or phone in the description
              for (const p of allPatients) {
                const fullName = `${p.first_name} ${p.last_name}`.trim().toLowerCase()
                if (summary.toLowerCase().includes(fullName)) {
                  matchedPatientId = p.id
                  break
                }
                if (p.phone && item.description && item.description.includes(p.phone.replace(/\D/g, ''))) {
                  matchedPatientId = p.id
                  break
                }
              }
            }
          }

          if (existing) {
            updateAppointment(existing.id, {
              title: summary,
              start_time: startTimeIso,
              end_time: endTimeIso,
              notes: item.description || null,
              ...(matchedPatientId ? { patient_id: matchedPatientId } : {})
            })
          } else {
            createAppointment({
              patient_id: matchedPatientId,
              title: summary,
              start_time: startTimeIso,
              end_time: endTimeIso,
              notes: item.description || null,
              google_event_id: item.id,
              status: 'SCHEDULED',
              service_type: null,
              price: null
            })
          }
          processedCount++
        }
      }
    })

    syncTransaction(items)

    const syncTimestamp = new Date().toISOString()
    try {
      setSetting('last_google_sync_time', syncTimestamp)
    } catch {
      // Ignored
    }

    return {
      success: true,
      syncedCount: processedCount,
      lastSyncTime: syncTimestamp
    }
  } catch (e: unknown) {
    console.error('Erro ao sincronizar com Google Calendar:', e)
    const isAuthError = handleGoogleAuthError(e)
    const errObj = e as { message?: string } | null
    return {
      success: false,
      error: isAuthError ? 'AUTH_ERROR' : (errObj?.message || 'Erro desconhecido')
    }
  }
}


