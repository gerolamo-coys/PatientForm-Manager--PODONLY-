import { google } from 'googleapis'
import { getAuthenticatedClient, hasGoogleCredentials } from './googleAuth'
import { getDb, createAppointment, updateAppointment, setSetting } from './database'
import { loadGoogleTokens, deleteGoogleTokens } from './secretStorage'
import type { Appointment, GoogleSyncResult } from '../shared/types'

function hasActiveGoogleSession(): boolean {
  if (!hasGoogleCredentials()) return false
  const tokens = loadGoogleTokens()
  return Boolean(tokens && (tokens.access_token || tokens.refresh_token))
}

/**
 * Identifica se um erro retornado pelo Google é de credenciais revogadas/inválidas (ex: invalid_grant)
 * e não uma simples oscilação de rede (ex: ENOTFOUND, ECONNRESET, timeout)
 */
function isGoogleAuthError(error: unknown): boolean {
  const err = error as { message?: string; code?: number | string; status?: number | string; response?: { status?: number | string; data?: any } } | null | undefined
  const errMsg = (err?.message || '').toLowerCase()
  const dataError = (typeof err?.response?.data?.error === 'string' ? err?.response?.data?.error : '').toLowerCase()
  const dataDesc = (typeof err?.response?.data?.error_description === 'string' ? err?.response?.data?.error_description : '').toLowerCase()
  const errCode = err?.code || ''
  const status = err?.status || err?.response?.status || ''

  // Erros explícitos de revogação/permissão
  return (
    errMsg.includes('invalid_grant') ||
    errMsg.includes('invalid_token') ||
    dataError.includes('invalid_grant') ||
    dataDesc.includes('token has been expired or revoked') ||
    errCode === 401 ||
    status === 401
  )
}

/**
 * Trata erros de autenticação do Google e limpa credenciais apenas se foram comprovadamente revogadas
 */
function handleGoogleAuthError(error: unknown): boolean {
  if (isGoogleAuthError(error)) {
    console.warn('Credenciais do Google definitivamente revogadas ou expiradas (invalid_grant). Limpando sessão...')
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
    const oauth2Client = await getAuthenticatedClient()
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
    const oauth2Client = await getAuthenticatedClient()
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
    const oauth2Client = await getAuthenticatedClient()
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
    const oauth2Client = await getAuthenticatedClient()
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    const db = getDb()

    if (!db) {
      return { success: false, error: 'Banco de dados não inicializado.' }
    }

    // Fetch events from the last 60 days to future
    const timeMin = new Date()
    timeMin.setDate(timeMin.getDate() - 60)
    const timeMinIso = timeMin.toISOString()

    // Retrieve all events including deleted ones and handle pagination
    let pageToken: string | undefined = undefined
    const items: any[] = []

    do {
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMinIso,
        singleEvents: true,
        showDeleted: true,
        maxResults: 2500,
        pageToken
      })

      if (response.data.items) {
        items.push(...response.data.items)
      }

      pageToken = (response.data.nextPageToken as string) || undefined
    } while (pageToken)

    let processedCount = 0

    // Prepare patient lookup queries for smart matching
    const findPatientByNameStmt = db.prepare(`
      SELECT id FROM patients 
      WHERE LOWER(TRIM(first_name || ' ' || last_name)) = LOWER(TRIM(?))
      LIMIT 1
    `)

    const allPatients = (db.prepare('SELECT id, first_name, last_name, phone FROM patients').all() || []) as Array<{
      id: number
      first_name: string
      last_name: string
      phone: string | null
    }>

    const syncTransaction = db.transaction((eventsList: typeof items) => {
      const existingStmt = db.prepare('SELECT id, patient_id FROM appointments WHERE google_event_id = ?')
      const deleteStmt = db.prepare('DELETE FROM appointments WHERE id = ?')

      // Track all active (non-cancelled) Google Event IDs in this sync window
      const activeGoogleEventIds = new Set<string>()

      for (const item of eventsList) {
        if (!item.id) continue

        const existing = existingStmt.get(item.id) as { id: number; patient_id: number | null } | undefined

        // If Google reports the event as cancelled, delete from local DB immediately
        if (item.status === 'cancelled') {
          if (existing) {
            deleteStmt.run(existing.id)
            console.log(`[GoogleSync] Evento cancelado/excluído no Google removido do PodOnly: id=${existing.id}, google_event_id=${item.id}`)
          }
          continue
        }

        // Active event - record ID for orphan reconciliation
        activeGoogleEventIds.add(item.id)

        // Parse start and end times (handling both dateTime and all-day date strings)
        let startTimeIso: string | null = null
        let endTimeIso: string | null = null

        if (item.start?.dateTime) {
          startTimeIso = new Date(item.start.dateTime).toISOString()
        } else if (item.start?.date) {
          // All-day event: default from 08:00 to 18:00 on that day
          const startDate = item.start.date
          startTimeIso = new Date(`${startDate}T08:00:00`).toISOString()
        }

        if (item.end?.dateTime) {
          endTimeIso = new Date(item.end.dateTime).toISOString()
        } else if (item.end?.date) {
          const endDate = item.end.date
          endTimeIso = new Date(`${endDate}T18:00:00`).toISOString()
        }

        if (!startTimeIso || !endTimeIso) continue

        const summary = (item.summary || '').trim() || 'Consulta (Google)'

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

      // Reconciliation: Find all local appointments that have a google_event_id in the synced time window
      // If their google_event_id is NOT present in activeGoogleEventIds, they were deleted on Google Calendar!
      const localSyncedStmt = db.prepare(`
        SELECT id, google_event_id, title 
        FROM appointments 
        WHERE google_event_id IS NOT NULL 
          AND TRIM(google_event_id) != ''
          AND start_time >= ?
      `)
      const localSyncedAppts = (localSyncedStmt.all(timeMinIso) || []) as Array<{
        id: number
        google_event_id: string
        title: string
      }>

      for (const localAppt of localSyncedAppts) {
        if (!activeGoogleEventIds.has(localAppt.google_event_id)) {
          deleteStmt.run(localAppt.id)
          console.log(`[GoogleSync] Evento órfão removido do PodOnly (excluído no Google Agenda): id=${localAppt.id}, google_event_id=${localAppt.google_event_id}, title=${localAppt.title}`)
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


