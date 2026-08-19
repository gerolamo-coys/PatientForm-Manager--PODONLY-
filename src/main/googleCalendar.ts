import { google } from 'googleapis'
import { getOAuth2Client } from './googleAuth'
import { getDb, createAppointment, updateAppointment, setSetting } from './database'
import type { Appointment } from '../shared/types'

/**
 * Trata erros de autenticação do Google e limpa credenciais expiradas automaticamente
 */
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
    console.warn('Credenciais do Google inválidas ou expiradas. Limpando tokens de autenticação...')
    try {
      setSetting('google_auth_tokens', '')
    } catch (dbErr) {
      console.error('Falha ao limpar google_auth_tokens do banco:', dbErr)
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
    console.error('Erro ao criar evento no Google Calendar:', e)
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
    console.error('Erro ao atualizar evento no Google Calendar:', e)
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
    console.error('Erro ao remover evento no Google Calendar:', e)
    handleGoogleAuthError(e)
    return false
  }
}

export async function pullFromGoogleCalendar(): Promise<{ success: boolean; error?: string }> {
  try {
    const oauth2Client = getOAuth2Client()
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    const db = getDb()

    if (!db) {
      return { success: false, error: 'Banco de dados não inicializado.' }
    }

    // Busca eventos dos últimos 30 dias e futuros
    const timeMin = new Date()
    timeMin.setDate(timeMin.getDate() - 30)

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      singleEvents: true,
      maxResults: 2500,
    })

    const items = response.data.items || []

    // Sincronização atômica dentro de uma transação SQLite
    const syncTransaction = db.transaction((eventsList: typeof items) => {
      const existingStmt = db.prepare('SELECT id FROM appointments WHERE google_event_id = ?')
      const deleteStmt = db.prepare('DELETE FROM appointments WHERE id = ?')

      for (const item of eventsList) {
        if (!item.id || !item.start?.dateTime || !item.end?.dateTime) continue

        const existing = existingStmt.get(item.id) as { id: number } | undefined

        if (item.status === 'cancelled') {
          if (existing) {
            deleteStmt.run(existing.id)
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
    })

    syncTransaction(items)

    return { success: true }
  } catch (e: any) {
    console.error('Erro ao sincronizar com Google Calendar:', e)
    const isAuthError = handleGoogleAuthError(e)
    return {
      success: false,
      error: isAuthError ? 'AUTH_ERROR' : (e.message || 'Erro desconhecido')
    }
  }
}
