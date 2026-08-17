export interface Patient {
  id: number
  first_name: string
  last_name: string
  date_of_birth: string | null
  phone: string | null
  address: string | null
  profession: string | null
  practices_sports: string | null
  past_medical_history: string | null
  past_surgical_history: string | null
  medications: string | null
  allergies: string | null
  medical_problems: string | null
  shoe_type: string | null
  nail_shape: string | null
  created_at: string
  updated_at: string
}

export interface PodiatryHistoryForm {
  id: number
  patient_id: number
  visit_date: string
  chief_complaint: string | null
  foot_specific_history: string | null
  foot_map_image: string | null
  dermatological_pathologies: string | null
  clinical_prescription: string | null
  general_observations: string | null
  procedures_performed: string | null
  created_at: string
  updated_at: string
}

export interface PatientListItem extends Patient {
}

export interface PatientWithForm {
  patient: Patient
  form: PodiatryHistoryForm | null
}

export interface CreatePatientWithFormPayload {
  patient: Omit<Patient, 'id' | 'created_at' | 'updated_at'>
  form: Omit<PodiatryHistoryForm, 'id' | 'patient_id' | 'created_at' | 'updated_at'>
}

export interface UpdatePatientWithFormPayload {
  patient: Partial<Omit<Patient, 'id' | 'created_at' | 'updated_at'>>
  form: Partial<Omit<PodiatryHistoryForm, 'id' | 'patient_id' | 'created_at' | 'updated_at'>>
}

export type CreatePatientPayload = Omit<Patient, 'id' | 'created_at' | 'updated_at'>
export type UpdatePatientPayload = Partial<CreatePatientPayload>

export type CreateFormPayload = Omit<PodiatryHistoryForm, 'id' | 'patient_id' | 'created_at' | 'updated_at'>
export type UpdateFormPayload = Partial<CreateFormPayload>

export type SortMode = 'alphabetical' | 'last_created'

export interface Appointment {
  id: number
  patient_id: number | null
  title: string
  start_time: string
  end_time: string
  notes: string | null
  google_event_id: string | null
  created_at: string
  updated_at: string
}

export type CreateAppointmentPayload = Omit<Appointment, 'id' | 'created_at' | 'updated_at'>
export type UpdateAppointmentPayload = Partial<CreateAppointmentPayload>

export interface GoogleAuthTokens {
  access_token: string
  refresh_token: string
  expiry_date: number
}

export interface PatientImage {
  id: number
  patient_id: number
  file_name: string
  description: string | null
  created_at: string
}

export interface FinancialTransaction {
  id: number
  type: 'INCOME' | 'EXPENSE'
  amount: number
  description: string
  date: string
  category: string | null
  payment_method: string
  patient_id: number | null
  created_at: string
}

export type CreateTransactionPayload = Omit<FinancialTransaction, 'id' | 'created_at'>
export type UpdateTransactionPayload = Partial<CreateTransactionPayload>

export interface FinancialSummary {
  totalIncome: number
  totalExpense: number
  netBalance: number
}

