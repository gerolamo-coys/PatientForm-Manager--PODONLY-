import { describe, it, expect } from 'vitest'
import type { 
  ClinicalNotifications, 
  BirthdayPatient, 
  OverdueRecallPatient, 
  DueReceivable, 
  CalendarConflict 
} from '../shared/types'

describe('Clinical Notifications & Alerts Hub Unit Tests', () => {
  it('correctly counts total alerts across all categories', () => {
    const notifications: ClinicalNotifications = {
      overdueRecalls: [
        {
          patient_id: 1,
          first_name: 'Maria',
          last_name: 'Silva',
          phone: '11999999999',
          last_procedure_date: '2026-08-01',
          last_procedure_name: 'Laserterapia',
          days_since_last_visit: 42
        }
      ],
      upcomingBirthdays: [
        {
          id: 2,
          first_name: 'João',
          last_name: 'Souza',
          date_of_birth: '1985-09-12',
          phone: '11988888888',
          age: 41,
          is_today: true,
          birth_day_and_month: '12/09'
        },
        {
          id: 3,
          first_name: 'Ana',
          last_name: 'Pereira',
          date_of_birth: '1990-09-15',
          phone: '11977777777',
          age: 36,
          is_today: false,
          birth_day_and_month: '15/09'
        }
      ],
      dueReceivables: [
        {
          id: 10,
          patient_id: 1,
          patient_name: 'Maria Silva',
          phone: '11999999999',
          description: 'Tratamento Laser - Parcela 1/2',
          amount: 150,
          due_date: '2026-09-12',
          is_overdue: false
        },
        {
          id: 11,
          patient_id: 4,
          patient_name: 'Carlos Oliveira',
          phone: null,
          description: 'Palmilha Sob Medida',
          amount: 320,
          due_date: '2026-09-05',
          is_overdue: true
        }
      ],
      calendarConflicts: [
        {
          id1: 101,
          title1: 'Consulta Maria',
          id2: 102,
          title2: 'Consulta Pedro',
          start_time: '2026-09-12T14:00:00.000Z',
          end_time: '2026-09-12T15:00:00.000Z'
        }
      ],
      hasGoogleSyncError: false,
      totalAlertsCount: 0
    }

    const calculatedTotal = 
      notifications.overdueRecalls.length +
      notifications.upcomingBirthdays.length +
      notifications.dueReceivables.length +
      notifications.calendarConflicts.length +
      (notifications.hasGoogleSyncError ? 1 : 0)

    expect(calculatedTotal).toBe(6)
  })

  it('detects schedule overlap between appointments (conflict detection algorithm)', () => {
    function hasOverlap(
      startA: string,
      endA: string,
      startB: string,
      endB: string
    ): boolean {
      const aStart = new Date(startA).getTime()
      const aEnd = new Date(endA).getTime()
      const bStart = new Date(startB).getTime()
      const bEnd = new Date(endB).getTime()

      return aStart < bEnd && aEnd > bStart
    }

    // Overlapping appointments: 14:00-15:00 and 14:30-15:30
    expect(
      hasOverlap(
        '2026-09-12T14:00:00.000Z',
        '2026-09-12T15:00:00.000Z',
        '2026-09-12T14:30:00.000Z',
        '2026-09-12T15:30:00.000Z'
      )
    ).toBe(true)

    // Contiguous appointments: 14:00-15:00 and 15:00-16:00 (no conflict)
    expect(
      hasOverlap(
        '2026-09-12T14:00:00.000Z',
        '2026-09-12T15:00:00.000Z',
        '2026-09-12T15:00:00.000Z',
        '2026-09-12T16:00:00.000Z'
      )
    ).toBe(false)

    // Non-overlapping appointments: 10:00-11:00 and 14:00-15:00
    expect(
      hasOverlap(
        '2026-09-12T10:00:00.000Z',
        '2026-09-12T11:00:00.000Z',
        '2026-09-12T14:00:00.000Z',
        '2026-09-12T15:00:00.000Z'
      )
    ).toBe(false)
  })

  it('classifies receivables into overdue vs due today correctly', () => {
    const todayStr = '2026-09-12'

    const sampleTransactions = [
      { id: 1, due_date: '2026-09-10', amount: 100, status: 'PENDING' },
      { id: 2, due_date: '2026-09-12', amount: 200, status: 'PENDING' },
      { id: 3, due_date: '2026-09-15', amount: 300, status: 'PENDING' }
    ]

    const dueOrOverdue = sampleTransactions
      .filter(t => t.due_date <= todayStr)
      .map(t => ({
        ...t,
        is_overdue: t.due_date < todayStr
      }))

    expect(dueOrOverdue.length).toBe(2)
    expect(dueOrOverdue.find(t => t.id === 1)?.is_overdue).toBe(true)
    expect(dueOrOverdue.find(t => t.id === 2)?.is_overdue).toBe(false)
  })

  it('sorts birthdays with today first, followed by upcoming days', () => {
    const birthdays: BirthdayPatient[] = [
      { id: 1, first_name: 'B', last_name: 'Test', date_of_birth: '1990-09-15', phone: null, age: 36, is_today: false, birth_day_and_month: '15/09' },
      { id: 2, first_name: 'A', last_name: 'Test', date_of_birth: '1985-09-12', phone: null, age: 41, is_today: true, birth_day_and_month: '12/09' },
      { id: 3, first_name: 'C', last_name: 'Test', date_of_birth: '1992-09-13', phone: null, age: 34, is_today: false, birth_day_and_month: '13/09' }
    ]

    const sorted = [...birthdays].sort((a, b) => {
      if (a.is_today && !b.is_today) return -1
      if (!a.is_today && b.is_today) return 1
      return (a.birth_day_and_month || '').localeCompare(b.birth_day_and_month || '')
    })

    expect(sorted[0].id).toBe(2) // Today first
    expect(sorted[1].id).toBe(3) // 13/09
    expect(sorted[2].id).toBe(1) // 15/09
  })
})
