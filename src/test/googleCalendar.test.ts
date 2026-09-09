import { describe, it, expect, beforeEach, vi } from 'vitest'
import { pullFromGoogleCalendar } from '../main/googleCalendar'

// Mock dependencies
const mockDb = {
  prepare: vi.fn(),
  transaction: vi.fn((fn) => fn)
}

vi.mock('../main/database', () => ({
  getDb: vi.fn(() => mockDb),
  createAppointment: vi.fn(),
  updateAppointment: vi.fn(),
  setSetting: vi.fn(),
  getSetting: vi.fn()
}))

vi.mock('../main/googleAuth', () => ({
  hasGoogleCredentials: vi.fn(() => true),
  getAuthenticatedClient: vi.fn().mockResolvedValue({})
}))

vi.mock('../main/secretStorage', () => ({
  loadGoogleTokens: vi.fn(() => ({
    access_token: 'fake-access',
    refresh_token: 'fake-refresh'
  })),
  deleteGoogleTokens: vi.fn()
}))

const mockList = vi.fn()

vi.mock('googleapis', () => ({
  google: {
    calendar: vi.fn(() => ({
      events: {
        list: mockList
      }
    }))
  }
}))

describe('Google Calendar Sync - Event Deletion & Reconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes local appointments when Google returns status: cancelled', async () => {
    mockList.mockResolvedValueOnce({
      data: {
        items: [
          {
            id: 'deleted_g_event_1',
            status: 'cancelled'
          },
          {
            id: 'active_g_event_2',
            status: 'confirmed',
            summary: 'Consulta Ativa',
            start: { dateTime: '2026-09-10T10:00:00Z' },
            end: { dateTime: '2026-09-10T11:00:00Z' }
          }
        ]
      }
    })

    const existingStmt = {
      get: vi.fn((id: string) => {
        if (id === 'deleted_g_event_1') return { id: 101, patient_id: null }
        if (id === 'active_g_event_2') return { id: 102, patient_id: null }
        return undefined
      })
    }
    const deleteStmt = { run: vi.fn() }
    const localSyncedStmt = {
      all: vi.fn(() => [
        { id: 102, google_event_id: 'active_g_event_2', title: 'Consulta Ativa' }
      ])
    }
    const findPatientByNameStmt = { get: vi.fn(() => undefined) }
    const allPatientsStmt = { all: vi.fn(() => []) }

    mockDb.prepare.mockImplementation((sql: string) => {
      if (sql.includes('SELECT id, patient_id FROM appointments WHERE google_event_id = ?')) {
        return existingStmt
      }
      if (sql.includes('DELETE FROM appointments WHERE id = ?')) {
        return deleteStmt
      }
      if (sql.includes('SELECT id, google_event_id, title FROM appointments')) {
        return localSyncedStmt
      }
      if (sql.includes('findPatientByName') || sql.includes('LOWER(TRIM(first_name')) {
        return findPatientByNameStmt
      }
      if (sql.includes('SELECT id, first_name, last_name, phone FROM patients')) {
        return allPatientsStmt
      }
      return { get: vi.fn(() => undefined), all: vi.fn(() => []), run: vi.fn() }
    })

    const result = await pullFromGoogleCalendar()

    expect(result.success).toBe(true)
    // deleteStmt should have been called for id 101
    expect(deleteStmt.run).toHaveBeenCalledWith(101)
  })

  it('reconciles and deletes orphaned local appointments missing from active Google events', async () => {
    // Google returns only one active event; an older event previously synced was hard-deleted from Google
    mockList.mockResolvedValueOnce({
      data: {
        items: [
          {
            id: 'google_active_1',
            status: 'confirmed',
            summary: 'Consulta Existente',
            start: { dateTime: '2026-09-12T14:00:00Z' },
            end: { dateTime: '2026-09-12T15:00:00Z' }
          }
        ]
      }
    })

    const existingStmt = {
      get: vi.fn((id: string) => {
        if (id === 'google_active_1') return { id: 201, patient_id: null }
        return undefined
      })
    }
    const deleteStmt = { run: vi.fn() }
    // Local DB has 2 events linked to Google: 201 (active) and 202 (deleted on Google outside PodOnly)
    const localSyncedStmt = {
      all: vi.fn(() => [
        { id: 201, google_event_id: 'google_active_1', title: 'Consulta Existente' },
        { id: 202, google_event_id: 'google_deleted_externally', title: 'Consulta Excluída no Google' }
      ])
    }

    mockDb.prepare.mockImplementation((sql: string) => {
      if (sql.includes('SELECT id, patient_id FROM appointments WHERE google_event_id = ?')) {
        return existingStmt
      }
      if (sql.includes('DELETE FROM appointments WHERE id = ?')) {
        return deleteStmt
      }
      if (sql.includes('SELECT id, google_event_id')) {
        return localSyncedStmt
      }
      return { get: vi.fn(() => undefined), all: vi.fn(() => []), run: vi.fn() }
    })

    const result = await pullFromGoogleCalendar()

    expect(result.success).toBe(true)
    // Should have deleted orphaned local appointment 202
    expect(deleteStmt.run).toHaveBeenCalledWith(202)
  })
})
