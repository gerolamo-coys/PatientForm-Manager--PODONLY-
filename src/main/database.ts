import Database from 'better-sqlite3'
import path from 'path'
import { app, safeStorage } from 'electron'
import type {
  Patient,
  PodiatryHistoryForm,
  SortMode,
  PatientListItem,
  PatientWithForm,
  CreatePatientWithFormPayload,
  UpdatePatientWithFormPayload,
  UpdatePatientPayload,
  CreatePatientPayload,
  CreateFormPayload,
  UpdateFormPayload,
  Appointment,
  CreateAppointmentPayload,
  UpdateAppointmentPayload,
  FinancialTransaction,
  CreateTransactionPayload,
  UpdateTransactionPayload,
  FinancialSummary
} from '../shared/types'

let db: Database.Database

export function getDb() {
  return db
}

export function initDatabase() {
  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'podiatry_records.sqlite')
  
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('busy_timeout = 5000')

  // Create tables if they don't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      date_of_birth TEXT,
      phone TEXT,
      address TEXT,
      profession TEXT,
      practices_sports TEXT,
      past_medical_history TEXT,
      past_surgical_history TEXT,
      medications TEXT,
      allergies TEXT,
      medical_problems TEXT,
      shoe_type TEXT,
      nail_shape TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS podiatry_history_forms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER,
      visit_date DATETIME NOT NULL,
      chief_complaint TEXT,
      foot_specific_history TEXT,
      foot_map_image TEXT,
      dermatological_pathologies TEXT,
      clinical_prescription TEXT,
      general_observations TEXT,
      procedures_performed TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(patient_id) REFERENCES patients(id)
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER,
      title TEXT NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      notes TEXT,
      google_event_id TEXT,
      status TEXT DEFAULT 'SCHEDULED',
      service_type TEXT,
      price REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS patient_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS financial_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      date DATETIME NOT NULL,
      category TEXT,
      payment_method TEXT NOT NULL,
      patient_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // Migration: add new columns if they don't exist
  const alterStatements = [
    "ALTER TABLE patients ADD COLUMN address TEXT;",
    "ALTER TABLE patients ADD COLUMN profession TEXT;",
    "ALTER TABLE patients ADD COLUMN practices_sports TEXT;",
    "ALTER TABLE patients ADD COLUMN past_medical_history TEXT;",
    "ALTER TABLE patients ADD COLUMN past_surgical_history TEXT;",
    "ALTER TABLE patients ADD COLUMN medications TEXT;",
    "ALTER TABLE patients ADD COLUMN allergies TEXT;",
    "ALTER TABLE patients ADD COLUMN medical_problems TEXT;",
    "ALTER TABLE patients ADD COLUMN shoe_type TEXT;",
    "ALTER TABLE podiatry_history_forms ADD COLUMN clinical_prescription TEXT;",
    "ALTER TABLE podiatry_history_forms ADD COLUMN general_observations TEXT;",
    "ALTER TABLE patients ADD COLUMN nail_shape TEXT;",
    "ALTER TABLE podiatry_history_forms ADD COLUMN procedures_performed TEXT;",
    "ALTER TABLE appointments ADD COLUMN status TEXT DEFAULT 'SCHEDULED';",
    "ALTER TABLE appointments ADD COLUMN service_type TEXT;",
    "ALTER TABLE appointments ADD COLUMN price REAL;",
    "ALTER TABLE financial_transactions ADD COLUMN status TEXT DEFAULT 'COMPLETED';",
    "ALTER TABLE financial_transactions ADD COLUMN due_date DATETIME;",
    "ALTER TABLE financial_transactions ADD COLUMN payment_date DATETIME;",
    "ALTER TABLE financial_transactions ADD COLUMN installment_current INTEGER DEFAULT 1;",
    "ALTER TABLE financial_transactions ADD COLUMN installment_total INTEGER DEFAULT 1;",
    "ALTER TABLE financial_transactions ADD COLUMN notes TEXT;",
    "ALTER TABLE financial_transactions ADD COLUMN fee_amount REAL DEFAULT 0;",
    "ALTER TABLE appointments ADD COLUMN whatsapp_reminder_sent_at DATETIME;",
    "ALTER TABLE patient_images ADD COLUMN tag TEXT DEFAULT 'ANTES';",
    "ALTER TABLE patient_images ADD COLUMN category TEXT DEFAULT 'Geral';",
    "ALTER TABLE patient_images ADD COLUMN photo_date TEXT;",
    "ALTER TABLE patients ADD COLUMN custom_data TEXT DEFAULT '{}';",
    "ALTER TABLE podiatry_history_forms ADD COLUMN custom_data TEXT DEFAULT '{}';",
    "ALTER TABLE appointments ADD COLUMN custom_data TEXT DEFAULT '{}';"
  ]

  for (const stmt of alterStatements) {
    try {
      db.exec(stmt)
    } catch {
      // Ignore if column exists
    }
  }
}

export function listPatients(sortMode: SortMode, searchQuery: string): PatientListItem[] {
  let query = `
    SELECT 
      p.*,
      COALESCE(f_agg.forms_count, 0) AS forms_count,
      f_agg.last_visit_date,
      CASE 
        WHEN COALESCE(f_agg.forms_count, 0) = 0 THEN 1
        WHEN (
          (f_latest.chief_complaint IS NULL OR TRIM(f_latest.chief_complaint) = '') AND
          (f_latest.procedures_performed IS NULL OR TRIM(f_latest.procedures_performed) = '')
        ) THEN 1
        ELSE 0
      END AS has_pending_form
    FROM patients p
    LEFT JOIN (
      SELECT 
        patient_id, 
        COUNT(*) AS forms_count,
        MAX(visit_date) AS last_visit_date,
        MAX(id) AS latest_form_id
      FROM podiatry_history_forms
      GROUP BY patient_id
    ) f_agg ON p.id = f_agg.patient_id
    LEFT JOIN podiatry_history_forms f_latest ON f_latest.id = f_agg.latest_form_id
  `
  const params: any[] = []

  if (searchQuery) {
    query += ` WHERE p.first_name LIKE ? OR p.last_name LIKE ?`
    params.push(`%${searchQuery}%`, `%${searchQuery}%`)
  }

  if (sortMode === 'alphabetical') {
    query += ` ORDER BY p.first_name ASC, p.last_name ASC`
  } else if (sortMode === 'last_created') {
    query += ` ORDER BY p.created_at DESC`
  }

  const stmt = db.prepare(query)
  const rows = stmt.all(...params) as any[]
  return rows.map(r => ({
    ...r,
    has_pending_form: Boolean(r.has_pending_form),
    forms_count: Number(r.forms_count || 0)
  })) as PatientListItem[]
}

export function getPatientWithForm(patientId: number): PatientWithForm {
  const patientStmt = db.prepare(`SELECT * FROM patients WHERE id = ?`)
  const patient = patientStmt.get(patientId) as Patient

  if (!patient) {
    throw new Error('Patient not found')
  }

  const formStmt = db.prepare(`SELECT * FROM podiatry_history_forms WHERE patient_id = ? ORDER BY created_at DESC LIMIT 1`)
  const form = formStmt.get(patientId) as PodiatryHistoryForm | undefined

  return { patient, form: form || null }
}

export function createPatientWithForm(payload: CreatePatientWithFormPayload): number {
  const insertPatient = db.prepare(`
    INSERT INTO patients (
      first_name, last_name, date_of_birth, phone, address, profession, practices_sports,
      past_medical_history, past_surgical_history, medications, allergies, medical_problems, shoe_type, nail_shape, custom_data
    )
    VALUES (
      @first_name, @last_name, @date_of_birth, @phone, @address, @profession, @practices_sports,
      @past_medical_history, @past_surgical_history, @medications, @allergies, @medical_problems, @shoe_type, @nail_shape, @custom_data
    )
  `)

  const insertForm = db.prepare(`
    INSERT INTO podiatry_history_forms (
      patient_id, visit_date, chief_complaint,
      foot_specific_history, foot_map_image, dermatological_pathologies,
      clinical_prescription, general_observations, procedures_performed, custom_data
    ) VALUES (
      @patient_id, @visit_date, @chief_complaint,
      @foot_specific_history, @foot_map_image, @dermatological_pathologies,
      @clinical_prescription, @general_observations, @procedures_performed, @custom_data
    )
  `)

  const transaction = db.transaction((data: CreatePatientWithFormPayload) => {
    const pInfo = insertPatient.run({
      ...data.patient,
      custom_data: data.patient.custom_data ?? '{}'
    })
    const patientId = pInfo.lastInsertRowid as number

    insertForm.run({
      ...data.form,
      custom_data: data.form.custom_data ?? '{}',
      patient_id: patientId
    })

    return patientId
  })

  return transaction(payload)
}

export function updatePatientWithForm(patientId: number, payload: UpdatePatientWithFormPayload): void {
  const transaction = db.transaction((id: number, data: UpdatePatientWithFormPayload) => {
    if (Object.keys(data.patient).length > 0) {
      const pKeys = Object.keys(data.patient)
      const pSets = pKeys.map(k => `${k} = @${k}`).join(', ')
      const updatePatient = db.prepare(`UPDATE patients SET ${pSets}, updated_at = CURRENT_TIMESTAMP WHERE id = @id`)
      updatePatient.run({ ...data.patient, id })
    }

    if (Object.keys(data.form).length > 0) {
      // Check if a form exists
      const existingForm = db.prepare(`SELECT id FROM podiatry_history_forms WHERE patient_id = ? LIMIT 1`).get(id) as { id: number } | undefined
      
      if (existingForm) {
        const fKeys = Object.keys(data.form)
        const fSets = fKeys.map(k => `${k} = @${k}`).join(', ')
        const updateForm = db.prepare(`UPDATE podiatry_history_forms SET ${fSets}, updated_at = CURRENT_TIMESTAMP WHERE patient_id = @id`)
        updateForm.run({ ...data.form, id })
      } else {
        const insertForm = db.prepare(`
          INSERT INTO podiatry_history_forms (
            patient_id, visit_date, chief_complaint,
            foot_specific_history, foot_map_image, dermatological_pathologies,
            clinical_prescription, general_observations, procedures_performed, custom_data
          ) VALUES (
            @id, @visit_date, @chief_complaint,
            @foot_specific_history, @foot_map_image, @dermatological_pathologies,
            @clinical_prescription, @general_observations, @procedures_performed, @custom_data
          )
        `)
        // Fill missing fields with nulls since it's an update payload (Partial)
        insertForm.run({
          id,
          visit_date: data.form.visit_date || new Date().toISOString(),
          chief_complaint: data.form.chief_complaint || null,
          foot_specific_history: data.form.foot_specific_history || null,
          foot_map_image: data.form.foot_map_image || null,
          dermatological_pathologies: data.form.dermatological_pathologies || null,
          clinical_prescription: data.form.clinical_prescription || null,
          general_observations: data.form.general_observations || null,
          procedures_performed: data.form.procedures_performed || null,
          custom_data: data.form.custom_data || '{}'
        })
      }
    }
  })

  transaction(patientId, payload)
}

export function deletePatients(patientIds: number[]): void {
  if (patientIds.length === 0) return

  const placeholders = patientIds.map(() => '?').join(',')
  
  const transaction = db.transaction((ids: number[]) => {
    // Delete forms
    db.prepare(`DELETE FROM podiatry_history_forms WHERE patient_id IN (${placeholders})`).run(...ids)
    // Delete patients
    db.prepare(`DELETE FROM patients WHERE id IN (${placeholders})`).run(...ids)
  })

  transaction(patientIds)
}

export function getPatient(patientId: number): Patient {
  const patientStmt = db.prepare(`SELECT * FROM patients WHERE id = ?`)
  const patient = patientStmt.get(patientId) as Patient | undefined
  if (!patient) throw new Error('Patient not found')
  return patient
}

export function getPatientForms(patientId: number): PodiatryHistoryForm[] {
  const stmt = db.prepare(`SELECT * FROM podiatry_history_forms WHERE patient_id = ? ORDER BY visit_date DESC, created_at DESC`)
  return stmt.all(patientId) as PodiatryHistoryForm[]
}

export function getForm(formId: number): PodiatryHistoryForm {
  const stmt = db.prepare(`SELECT * FROM podiatry_history_forms WHERE id = ?`)
  const form = stmt.get(formId) as PodiatryHistoryForm | undefined
  if (!form) throw new Error('Form not found')
  return form
}

export function updatePatient(patientId: number, payload: UpdatePatientPayload): void {
  if (Object.keys(payload).length === 0) return
  const keys = Object.keys(payload)
  const sets = keys.map(k => `${k} = @${k}`).join(', ')
  const stmt = db.prepare(`UPDATE patients SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = @id`)
  stmt.run({ ...payload, id: patientId })
}

export function createPatient(payload: CreatePatientPayload): number {
  const stmt = db.prepare(`
    INSERT INTO patients (
      first_name, last_name, date_of_birth, phone, address, profession, practices_sports,
      past_medical_history, past_surgical_history, medications, allergies, medical_problems, shoe_type, nail_shape, custom_data
    )
    VALUES (
      @first_name, @last_name, @date_of_birth, @phone, @address, @profession, @practices_sports,
      @past_medical_history, @past_surgical_history, @medications, @allergies, @medical_problems, @shoe_type, @nail_shape, @custom_data
    )
  `)
  const info = stmt.run({
    ...payload,
    custom_data: payload.custom_data ?? '{}'
  })
  return info.lastInsertRowid as number
}

export function createPatientForm(patientId: number, payload: CreateFormPayload): number {
  const insertForm = db.prepare(`
    INSERT INTO podiatry_history_forms (
      patient_id, visit_date, chief_complaint,
      foot_specific_history, foot_map_image, dermatological_pathologies,
      clinical_prescription, general_observations, procedures_performed, custom_data
    ) VALUES (
      @patient_id, @visit_date, @chief_complaint,
      @foot_specific_history, @foot_map_image, @dermatological_pathologies,
      @clinical_prescription, @general_observations, @procedures_performed, @custom_data
    )
  `)
  const info = insertForm.run({
    ...payload,
    custom_data: payload.custom_data ?? '{}',
    patient_id: patientId
  })
  return info.lastInsertRowid as number
}

export function updatePatientForm(formId: number, payload: UpdateFormPayload): void {
  if (Object.keys(payload).length === 0) return
  const keys = Object.keys(payload)
  const sets = keys.map(k => `${k} = @${k}`).join(', ')
  const stmt = db.prepare(`UPDATE podiatry_history_forms SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = @id`)
  stmt.run({ ...payload, id: formId })
}

export function getAppointments(start: string, end: string): (Appointment & { patient_phone?: string | null })[] {
  const stmt = db.prepare(`
    SELECT a.*, p.phone AS patient_phone
    FROM appointments a
    LEFT JOIN patients p ON a.patient_id = p.id
    WHERE a.start_time >= ? AND a.start_time <= ?
    ORDER BY a.start_time ASC
  `)
  return stmt.all(start, end) as (Appointment & { patient_phone?: string | null })[]
}

export function getAllAppointments(): (Appointment & { patient_phone?: string | null })[] {
  const stmt = db.prepare(`
    SELECT a.*, p.phone AS patient_phone
    FROM appointments a
    LEFT JOIN patients p ON a.patient_id = p.id
    ORDER BY a.start_time ASC
  `)
  return stmt.all() as (Appointment & { patient_phone?: string | null })[]
}

export function createAppointment(payload: CreateAppointmentPayload): number {
  const stmt = db.prepare(`
    INSERT INTO appointments (patient_id, title, start_time, end_time, notes, google_event_id, status, service_type, price, custom_data)
    VALUES (@patient_id, @title, @start_time, @end_time, @notes, @google_event_id, @status, @service_type, @price, @custom_data)
  `)
  const info = stmt.run({
    patient_id: payload.patient_id ?? null,
    title: payload.title,
    start_time: payload.start_time,
    end_time: payload.end_time,
    notes: payload.notes ?? null,
    google_event_id: payload.google_event_id ?? null,
    status: payload.status ?? 'SCHEDULED',
    service_type: payload.service_type ?? null,
    price: payload.price ?? null,
    custom_data: payload.custom_data ?? '{}'
  })
  return info.lastInsertRowid as number
}

export function updateAppointment(id: number, payload: UpdateAppointmentPayload): void {
  if (Object.keys(payload).length === 0) return
  const keys = Object.keys(payload)
  const sets = keys.map(k => `${k} = @${k}`).join(', ')
  const stmt = db.prepare(`UPDATE appointments SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = @id`)
  stmt.run({ ...payload, id })
}

export function deleteAppointment(id: number): void {
  const stmt = db.prepare(`DELETE FROM appointments WHERE id = ?`)
  stmt.run(id)
}

export function markPassedAppointmentsAsCompleted(upToIsoString?: string): number {
  if (!db) return 0
  const cutoffDate = upToIsoString ? new Date(upToIsoString) : new Date()
  const cutoffIso = !isNaN(cutoffDate.getTime()) ? cutoffDate.toISOString() : new Date().toISOString()
  try {
    const candidateStmt = db.prepare(`
      SELECT id, end_time, status 
      FROM appointments 
      WHERE (status IS NULL OR status = '' OR status IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'))
    `)
    const candidates = candidateStmt.all() as { id: number; end_time: string; status: string }[]

    const cutoffTimestamp = new Date(cutoffIso).getTime()
    const idsToComplete: number[] = []

    for (const appt of candidates) {
      if (!appt.end_time) continue
      const endTimestamp = new Date(appt.end_time).getTime()
      if (!isNaN(endTimestamp) && endTimestamp <= cutoffTimestamp) {
        idsToComplete.push(appt.id)
      }
    }

    if (idsToComplete.length === 0) return 0

    const placeholders = idsToComplete.map(() => '?').join(', ')
    const updateStmt = db.prepare(`
      UPDATE appointments 
      SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP 
      WHERE id IN (${placeholders})
    `)
    const info = updateStmt.run(...idsToComplete)
    return info.changes
  } catch (error) {
    console.error('Erro ao executar markPassedAppointmentsAsCompleted:', error)
    throw error
  }
}

export function updateAppointmentReminderSent(appointmentId: number, sentAtIso?: string): void {
  if (!db) return
  const timestamp = sentAtIso || new Date().toISOString()
  db.prepare(`UPDATE appointments SET whatsapp_reminder_sent_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(timestamp, appointmentId)
}

export function getTodayBirthdays(): any[] {
  if (!db) return []
  try {
    const today = new Date()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const matchSuffix = `-${mm}-${dd}`

    const rows = db.prepare(`
      SELECT id, first_name, last_name, date_of_birth, phone
      FROM patients
      WHERE date_of_birth IS NOT NULL
        AND date_of_birth LIKE '%' || ?
      ORDER BY first_name ASC
    `).all(matchSuffix) as any[]

    return rows.map((r) => {
      let age = 0
      try {
        const birthDate = new Date(r.date_of_birth)
        age = today.getFullYear() - birthDate.getFullYear()
        const m = today.getMonth() - birthDate.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--
        }
      } catch {
        age = 0
      }
      return {
        ...r,
        age: Math.max(0, age),
        is_today: true,
        birth_day_and_month: `${dd}/${mm}`
      }
    })
  } catch (err) {
    console.error('Erro ao buscar aniversariantes do dia:', err)
    return []
  }
}

export function getWeekBirthdays(): any[] {
  if (!db) return []
  try {
    const today = new Date()
    const currentYear = today.getFullYear()
    const targetDays: { mm: string; dd: string; formatted: string; isToday: boolean }[] = []

    for (let i = 0; i < 7; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      targetDays.push({
        mm,
        dd,
        formatted: `${dd}/${mm}`,
        isToday: i === 0
      })
    }

    const allPatients = db.prepare(`
      SELECT id, first_name, last_name, date_of_birth, phone
      FROM patients
      WHERE date_of_birth IS NOT NULL AND date_of_birth != ''
    `).all() as any[]

    const birthdays: any[] = []

    for (const p of allPatients) {
      if (!p.date_of_birth) continue
      // Matches YYYY-MM-DD or MM-DD
      const parts = p.date_of_birth.split('-')
      if (parts.length < 3) continue
      const pMonth = parts[1]
      const pDay = parts[2].substring(0, 2)

      const matchedTarget = targetDays.find(t => t.mm === pMonth && t.dd === pDay)
      if (matchedTarget) {
        let age = 0
        try {
          const birthYear = parseInt(parts[0], 10)
          age = currentYear - birthYear
        } catch {
          age = 0
        }

        birthdays.push({
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          date_of_birth: p.date_of_birth,
          phone: p.phone,
          age: Math.max(0, age),
          is_today: matchedTarget.isToday,
          birth_day_and_month: matchedTarget.formatted
        })
      }
    }

    // Sort by is_today first, then day
    return birthdays.sort((a, b) => {
      if (a.is_today && !b.is_today) return -1
      if (!a.is_today && b.is_today) return 1
      return a.birth_day_and_month.localeCompare(b.birth_day_and_month)
    })
  } catch (err) {
    console.error('Erro ao buscar aniversariantes da semana:', err)
    return []
  }
}

export function getOverdueRecallPatients(daysThreshold: number = 30): any[] {
  if (!db) return []
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysThreshold)
    const cutoffIso = cutoffDate.toISOString()
    const nowIso = new Date().toISOString()

    // 1. Encontra a última consulta/atendimento de cada paciente
    // que ocorreu há mais de daysThreshold dias
    // E que NÃO possui agendamento futuro agendado a partir de agora
    const rows = db.prepare(`
      SELECT 
        p.id AS patient_id,
        p.first_name,
        p.last_name,
        p.phone,
        COALESCE(MAX(a.start_time), MAX(f.visit_date)) AS last_visit_raw,
        COALESCE(MAX(a.service_type), MAX(f.procedures_performed), 'Procedimento de Rotina') AS last_procedure_name
      FROM patients p
      LEFT JOIN appointments a ON a.patient_id = p.id AND (a.status = 'COMPLETED' OR a.start_time <= ?)
      LEFT JOIN podiatry_history_forms f ON f.patient_id = p.id
      WHERE (a.id IS NOT NULL OR f.id IS NOT NULL)
        AND p.id NOT IN (
          -- Exclui pacientes que já têm consulta futura marcada
          SELECT DISTINCT patient_id 
          FROM appointments 
          WHERE patient_id IS NOT NULL 
            AND start_time >= ? 
            AND status IN ('SCHEDULED', 'CONFIRMED')
        )
      GROUP BY p.id
      HAVING last_visit_raw IS NOT NULL AND last_visit_raw <= ?
      ORDER BY last_visit_raw ASC
      LIMIT 15
    `).all(nowIso, nowIso, cutoffIso) as any[]

    const todayMs = Date.now()

    return rows.map(r => {
      let days = 30
      let formattedDate = ''
      try {
        const visitMs = new Date(r.last_visit_raw).getTime()
        days = Math.max(1, Math.floor((todayMs - visitMs) / (1000 * 60 * 60 * 24)))
        formattedDate = new Date(r.last_visit_raw).toLocaleDateString('pt-BR')
      } catch {
        days = daysThreshold
        formattedDate = r.last_visit_raw
      }

      return {
        patient_id: r.patient_id,
        first_name: r.first_name,
        last_name: r.last_name,
        phone: r.phone,
        last_procedure_date: formattedDate,
        last_procedure_name: r.last_procedure_name || 'Procedimento Clínico',
        days_since_last_visit: days
      }
    })
  } catch (err) {
    console.error('Erro ao buscar pacientes com retorno atrasado:', err)
    return []
  }
}

export function getDueReceivables(): any[] {
  if (!db) return []
  try {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const endOfToday = `${todayStr}T23:59:59`

    const rows = db.prepare(`
      SELECT 
        t.id,
        t.patient_id,
        t.description,
        t.amount,
        COALESCE(t.due_date, t.date) AS due_date,
        CASE 
          WHEN p.first_name IS NOT NULL THEN (p.first_name || ' ' || COALESCE(p.last_name, ''))
          ELSE NULL 
        END AS patient_name,
        p.phone
      FROM financial_transactions t
      LEFT JOIN patients p ON t.patient_id = p.id
      WHERE t.type = 'INCOME'
        AND t.status = 'PENDING'
        AND COALESCE(t.due_date, t.date) <= ?
      ORDER BY COALESCE(t.due_date, t.date) ASC
      LIMIT 20
    `).all(endOfToday) as any[]

    return rows.map(r => {
      let isOverdue = false
      try {
        const dueVal = (r.due_date || '').split('T')[0]
        if (dueVal < todayStr) {
          isOverdue = true
        }
      } catch {
        isOverdue = false
      }

      return {
        id: r.id,
        patient_id: r.patient_id,
        patient_name: r.patient_name || 'Recebível Clínico',
        phone: r.phone,
        description: r.description,
        amount: r.amount,
        due_date: r.due_date,
        is_overdue: isOverdue
      }
    })
  } catch (err) {
    console.error('Erro ao buscar recebíveis vencendo hoje:', err)
    return []
  }
}

export function getCalendarConflicts(): any[] {
  if (!db) return []
  try {
    const nowIso = new Date().toISOString()
    const endWindow = new Date()
    endWindow.setDate(endWindow.getDate() + 7)
    const endWindowIso = endWindow.toISOString()

    const rows = db.prepare(`
      SELECT 
        a1.id AS id1,
        a1.title AS title1,
        a2.id AS id2,
        a2.title AS title2,
        a1.start_time,
        a1.end_time
      FROM appointments a1
      JOIN appointments a2 ON a1.id < a2.id
      WHERE a1.start_time < a2.end_time 
        AND a1.end_time > a2.start_time
        AND a1.status NOT IN ('CANCELLED', 'NO_SHOW')
        AND a2.status NOT IN ('CANCELLED', 'NO_SHOW')
        AND a1.start_time >= ? 
        AND a1.start_time <= ?
      ORDER BY a1.start_time ASC
      LIMIT 10
    `).all(nowIso, endWindowIso) as any[]

    return rows
  } catch (err) {
    console.error('Erro ao buscar conflitos de agendamento:', err)
    return []
  }
}

export function getClinicalNotifications(): any {
  const overdueRecalls = getOverdueRecallPatients(30)
  const upcomingBirthdays = getWeekBirthdays()
  const dueReceivables = getDueReceivables()
  const calendarConflicts = getCalendarConflicts()

  const googleTokens = getSetting('google_auth_tokens')
  const googleConfigured = Boolean(getSetting('google_client_id'))
  const hasGoogleSyncError = Boolean(googleConfigured && !googleTokens)

  const totalAlertsCount = 
    overdueRecalls.length + 
    upcomingBirthdays.length + 
    dueReceivables.length + 
    calendarConflicts.length + 
    (hasGoogleSyncError ? 1 : 0)

  return {
    overdueRecalls,
    upcomingBirthdays,
    dueReceivables,
    calendarConflicts,
    hasGoogleSyncError,
    googleSyncErrorMessage: hasGoogleSyncError ? 'Sessão do Google Agenda expirou ou foi desconectada.' : null,
    totalAlertsCount
  }
}


const SENSITIVE_SETTING_KEYS = new Set([
  'google_auth_tokens',
  'google_client_secret'
])

export function getSetting(key: string): string | null {
  const stmt = db.prepare(`SELECT value FROM settings WHERE key = ?`)
  const result = stmt.get(key) as { value: string } | undefined
  if (!result || !result.value) return null

  const rawValue = result.value

  // Descriptografa com safeStorage se estiver criptografado com o prefixo 'enc:'
  if (rawValue.startsWith('enc:') && safeStorage && safeStorage.isEncryptionAvailable()) {
    try {
      const buffer = Buffer.from(rawValue.slice(4), 'base64')
      return safeStorage.decryptString(buffer)
    } catch (err) {
      console.error('Falha ao descriptografar configuração segura com safeStorage:', err)
      return null
    }
  }

  return rawValue
}

export function setSetting(key: string, value: string): void {
  let valueToStore = value

  // Criptografa chaves sensíveis em repouso usando o cofre seguro do SO (safeStorage)
  if (
    SENSITIVE_SETTING_KEYS.has(key) &&
    value &&
    value !== '' &&
    safeStorage &&
    safeStorage.isEncryptionAvailable()
  ) {
    try {
      const encryptedBuffer = safeStorage.encryptString(value)
      valueToStore = 'enc:' + encryptedBuffer.toString('base64')
    } catch (err) {
      console.error('Falha ao criptografar configuração com safeStorage:', err)
      valueToStore = value
    }
  }

  const stmt = db.prepare(`
    INSERT INTO settings (key, value) VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET value = @value, updated_at = CURRENT_TIMESTAMP
  `)
  stmt.run({ key, value: valueToStore })
}


export function getPatientImages(patientId: number): any[] {
  const stmt = db.prepare(`
    SELECT * FROM patient_images 
    WHERE patient_id = ? 
    ORDER BY COALESCE(photo_date, substr(created_at, 1, 10)) DESC, created_at DESC
  `)
  return stmt.all(patientId)
}

export function addPatientImage(
  patientId: number, 
  fileName: string, 
  metadata?: { description?: string; tag?: string; category?: string; photo_date?: string }
): number {
  const stmt = db.prepare(`
    INSERT INTO patient_images (patient_id, file_name, description, tag, category, photo_date)
    VALUES (@patient_id, @file_name, @description, @tag, @category, @photo_date)
  `)
  const info = stmt.run({ 
    patient_id: patientId, 
    file_name: fileName, 
    description: metadata?.description || '',
    tag: metadata?.tag || 'ANTES',
    category: metadata?.category || 'Geral',
    photo_date: metadata?.photo_date || new Date().toISOString().split('T')[0]
  })
  return info.lastInsertRowid as number
}

export function updatePatientImageDescription(id: number, description: string): void {
  const stmt = db.prepare(`UPDATE patient_images SET description = @description WHERE id = @id`)
  stmt.run({ id, description })
}

export function updatePatientImageMetadata(
  id: number, 
  data: { description?: string; tag?: string; category?: string; photo_date?: string }
): void {
  const currentStmt = db.prepare(`SELECT * FROM patient_images WHERE id = ?`)
  const current = currentStmt.get(id) as any
  if (!current) return

  const stmt = db.prepare(`
    UPDATE patient_images 
    SET description = @description,
        tag = @tag,
        category = @category,
        photo_date = @photo_date
    WHERE id = @id
  `)
  stmt.run({
    id,
    description: data.description !== undefined ? data.description : current.description,
    tag: data.tag !== undefined ? data.tag : (current.tag || 'ANTES'),
    category: data.category !== undefined ? data.category : (current.category || 'Geral'),
    photo_date: data.photo_date !== undefined ? data.photo_date : (current.photo_date || current.created_at?.split('T')[0] || current.created_at?.split(' ')[0])
  })
}

export function deletePatientImage(id: number): void {
  const stmt = db.prepare(`DELETE FROM patient_images WHERE id = ?`)
  stmt.run(id)
}

export function createTransaction(payload: CreateTransactionPayload): number {
  const status = payload.status || 'COMPLETED'
  const feeAmount = payload.fee_amount || 0
  const netAmount = payload.net_amount !== undefined && payload.net_amount !== null ? payload.net_amount : (payload.amount - feeAmount)
  const dueDate = payload.due_date || payload.date
  const paymentDate = payload.payment_date || (status === 'COMPLETED' ? payload.date : null)
  const instCurrent = payload.installment_current || 1
  const instTotal = payload.installment_total || 1

  const stmt = db.prepare(`
    INSERT INTO financial_transactions (
      type, amount, description, date, category, payment_method, patient_id,
      status, due_date, payment_date, installment_current, installment_total,
      notes, fee_amount, net_amount
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const info = stmt.run(
    payload.type,
    payload.amount,
    payload.description,
    payload.date,
    payload.category,
    payload.payment_method,
    payload.patient_id,
    status,
    dueDate,
    paymentDate,
    instCurrent,
    instTotal,
    payload.notes || null,
    feeAmount,
    netAmount
  )
  return info.lastInsertRowid as number
}

export function updateTransaction(id: number, payload: UpdateTransactionPayload): void {
  const sets: string[] = []
  const values: any[] = []

  for (const [key, value] of Object.entries(payload)) {
    sets.push(`${key} = ?`)
    values.push(value)
  }

  if (sets.length === 0) return

  values.push(id)
  const stmt = db.prepare(`UPDATE financial_transactions SET ${sets.join(', ')} WHERE id = ?`)
  stmt.run(...values)
}

export function deleteTransaction(id: number): void {
  const stmt = db.prepare(`DELETE FROM financial_transactions WHERE id = ?`)
  stmt.run(id)
}

export function getTransactions(startDate: string, endDate: string): FinancialTransaction[] {
  const stmt = db.prepare(`
    SELECT 
      t.*,
      CASE 
        WHEN p.first_name IS NOT NULL THEN (p.first_name || ' ' || COALESCE(p.last_name, ''))
        ELSE NULL 
      END AS patient_name
    FROM financial_transactions t
    LEFT JOIN patients p ON t.patient_id = p.id
    WHERE t.date >= ? AND t.date <= ?
    ORDER BY t.date DESC, t.id DESC
  `)
  return stmt.all(startDate, endDate) as FinancialTransaction[]
}

export function getFinancialSummary(startDate: string, endDate: string): FinancialSummary {
  const stmt = db.prepare(`
    SELECT 
      type, 
      COALESCE(status, 'COMPLETED') as status,
      SUM(amount) as total_amount,
      COUNT(id) as count
    FROM financial_transactions
    WHERE date >= ? AND date <= ?
    GROUP BY type, COALESCE(status, 'COMPLETED')
  `)
  
  const results = stmt.all(startDate, endDate) as { 
    type: 'INCOME' | 'EXPENSE', 
    status: string, 
    total_amount: number, 
    count: number 
  }[]
  
  let totalIncome = 0
  let totalExpense = 0
  let pendingIncome = 0
  let pendingExpense = 0
  let completedIncome = 0
  let completedExpense = 0
  let completedIncomeCount = 0
  let completedCount = 0
  let pendingCount = 0
  let totalTransactions = 0
  
  for (const row of results) {
    const isCompleted = row.status === 'COMPLETED'
    const isPending = row.status === 'PENDING'
    const isCancelled = row.status === 'CANCELLED'

    if (isCancelled) continue

    totalTransactions += row.count

    if (row.type === 'INCOME') {
      totalIncome += row.total_amount
      if (isCompleted) {
        completedIncome += row.total_amount
        completedIncomeCount += row.count
        completedCount += row.count
      } else if (isPending) {
        pendingIncome += row.total_amount
        pendingCount += row.count
      }
    } else if (row.type === 'EXPENSE') {
      totalExpense += row.total_amount
      if (isCompleted) {
        completedExpense += row.total_amount
        completedCount += row.count
      } else if (isPending) {
        pendingExpense += row.total_amount
        pendingCount += row.count
      }
    }
  }

  const averageTicket = completedIncomeCount > 0 ? (completedIncome / completedIncomeCount) : 0
  
  return {
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
    pendingIncome,
    pendingExpense,
    completedIncome,
    completedExpense,
    averageTicket,
    totalTransactions,
    completedCount,
    pendingCount
  }
}

export function runQuery(sql: string, params: any[] = []): void {
  if (!db) return
  const stmt = db.prepare(sql)
  stmt.run(...params)
}
