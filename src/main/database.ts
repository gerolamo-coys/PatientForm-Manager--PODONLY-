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
    "ALTER TABLE podiatry_history_forms ADD COLUMN procedures_performed TEXT;"
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
  let query = `SELECT * FROM patients`
  const params: any[] = []

  if (searchQuery) {
    query += ` WHERE first_name LIKE ? OR last_name LIKE ?`
    params.push(`%${searchQuery}%`, `%${searchQuery}%`)
  }

  if (sortMode === 'alphabetical') {
    query += ` ORDER BY first_name ASC, last_name ASC`
  } else if (sortMode === 'last_created') {
    query += ` ORDER BY created_at DESC`
  }

  const stmt = db.prepare(query)
  return stmt.all(...params) as PatientListItem[]
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
      past_medical_history, past_surgical_history, medications, allergies, medical_problems, shoe_type, nail_shape
    )
    VALUES (
      @first_name, @last_name, @date_of_birth, @phone, @address, @profession, @practices_sports,
      @past_medical_history, @past_surgical_history, @medications, @allergies, @medical_problems, @shoe_type, @nail_shape
    )
  `)

  const insertForm = db.prepare(`
    INSERT INTO podiatry_history_forms (
      patient_id, visit_date, chief_complaint,
      foot_specific_history, foot_map_image, dermatological_pathologies,
      clinical_prescription, general_observations, procedures_performed
    ) VALUES (
      @patient_id, @visit_date, @chief_complaint,
      @foot_specific_history, @foot_map_image, @dermatological_pathologies,
      @clinical_prescription, @general_observations, @procedures_performed
    )
  `)

  const transaction = db.transaction((data: CreatePatientWithFormPayload) => {
    const pInfo = insertPatient.run(data.patient)
    const patientId = pInfo.lastInsertRowid as number

    insertForm.run({
      ...data.form,
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
            clinical_prescription, general_observations, procedures_performed
          ) VALUES (
            @id, @visit_date, @chief_complaint,
            @foot_specific_history, @foot_map_image, @dermatological_pathologies,
            @clinical_prescription, @general_observations, @procedures_performed
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
          procedures_performed: data.form.procedures_performed || null
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
      past_medical_history, past_surgical_history, medications, allergies, medical_problems, shoe_type, nail_shape
    )
    VALUES (
      @first_name, @last_name, @date_of_birth, @phone, @address, @profession, @practices_sports,
      @past_medical_history, @past_surgical_history, @medications, @allergies, @medical_problems, @shoe_type, @nail_shape
    )
  `)
  const info = stmt.run(payload)
  return info.lastInsertRowid as number
}

export function createPatientForm(patientId: number, payload: CreateFormPayload): number {
  const insertForm = db.prepare(`
    INSERT INTO podiatry_history_forms (
      patient_id, visit_date, chief_complaint,
      foot_specific_history, foot_map_image, dermatological_pathologies,
      clinical_prescription, general_observations, procedures_performed
    ) VALUES (
      @patient_id, @visit_date, @chief_complaint,
      @foot_specific_history, @foot_map_image, @dermatological_pathologies,
      @clinical_prescription, @general_observations, @procedures_performed
    )
  `)
  const info = insertForm.run({
    ...payload,
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

export function getAppointments(start: string, end: string): Appointment[] {
  const stmt = db.prepare(`
    SELECT * FROM appointments 
    WHERE start_time >= ? AND start_time <= ?
    ORDER BY start_time ASC
  `)
  return stmt.all(start, end) as Appointment[]
}

export function getAllAppointments(): Appointment[] {
  const stmt = db.prepare(`SELECT * FROM appointments ORDER BY start_time ASC`)
  return stmt.all() as Appointment[]
}

export function createAppointment(payload: CreateAppointmentPayload): number {
  const stmt = db.prepare(`
    INSERT INTO appointments (patient_id, title, start_time, end_time, notes, google_event_id)
    VALUES (@patient_id, @title, @start_time, @end_time, @notes, @google_event_id)
  `)
  const info = stmt.run(payload)
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
  const stmt = db.prepare(`SELECT * FROM patient_images WHERE patient_id = ? ORDER BY created_at DESC`)
  return stmt.all(patientId)
}

export function addPatientImage(patientId: number, fileName: string): number {
  const stmt = db.prepare(`
    INSERT INTO patient_images (patient_id, file_name, description)
    VALUES (@patient_id, @file_name, @description)
  `)
  const info = stmt.run({ patient_id: patientId, file_name: fileName, description: '' })
  return info.lastInsertRowid as number
}

export function updatePatientImageDescription(id: number, description: string): void {
  const stmt = db.prepare(`UPDATE patient_images SET description = @description WHERE id = @id`)
  stmt.run({ id, description })
}

export function deletePatientImage(id: number): void {
  const stmt = db.prepare(`DELETE FROM patient_images WHERE id = ?`)
  stmt.run(id)
}

export function createTransaction(payload: CreateTransactionPayload): number {
  const stmt = db.prepare(`
    INSERT INTO financial_transactions (type, amount, description, date, category, payment_method, patient_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const info = stmt.run(
    payload.type,
    payload.amount,
    payload.description,
    payload.date,
    payload.category,
    payload.payment_method,
    payload.patient_id
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
    SELECT * FROM financial_transactions
    WHERE date >= ? AND date <= ?
    ORDER BY date DESC, id DESC
  `)
  return stmt.all(startDate, endDate) as FinancialTransaction[]
}

export function getFinancialSummary(startDate: string, endDate: string): FinancialSummary {
  const stmt = db.prepare(`
    SELECT type, SUM(amount) as total
    FROM financial_transactions
    WHERE date >= ? AND date <= ?
    GROUP BY type
  `)
  
  const results = stmt.all(startDate, endDate) as { type: string, total: number }[]
  
  let totalIncome = 0
  let totalExpense = 0
  
  for (const row of results) {
    if (row.type === 'INCOME') totalIncome += row.total
    if (row.type === 'EXPENSE') totalExpense += row.total
  }
  
  return {
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense
  }
}
