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
  custom_data?: string | null
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
  custom_data?: string | null
  created_at: string
  updated_at: string
}

export interface PatientListItem extends Patient {
  forms_count?: number
  has_pending_form?: boolean
  last_visit_date?: string | null
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

export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'

export interface Appointment {
  id: number
  patient_id: number | null
  title: string
  start_time: string
  end_time: string
  notes: string | null
  google_event_id: string | null
  status: AppointmentStatus
  service_type: string | null
  price: number | null
  custom_data?: string | null
  whatsapp_reminder_sent_at?: string | null
  patient_phone?: string | null
  created_at: string
  updated_at: string
}

export interface BirthdayPatient {
  id: number
  first_name: string
  last_name: string
  date_of_birth: string
  phone: string | null
  age: number
  is_today?: boolean
  birth_day_and_month?: string
}

export interface OverdueRecallPatient {
  patient_id: number
  first_name: string
  last_name: string
  phone: string | null
  last_procedure_date: string
  last_procedure_name: string | null
  days_since_last_visit: number
}

export interface DueReceivable {
  id: number
  patient_id: number | null
  patient_name: string | null
  phone?: string | null
  description: string
  amount: number
  due_date: string
  is_overdue: boolean
}

export interface CalendarConflict {
  id1: number
  title1: string
  id2: number
  title2: string
  start_time: string
  end_time: string
}

export interface ClinicalNotifications {
  overdueRecalls: OverdueRecallPatient[]
  upcomingBirthdays: BirthdayPatient[]
  dueReceivables: DueReceivable[]
  calendarConflicts: CalendarConflict[]
  hasGoogleSyncError: boolean
  googleSyncErrorMessage?: string | null
  totalAlertsCount: number
}

export type CreateAppointmentPayload = Omit<Appointment, 'id' | 'created_at' | 'updated_at'>
export type UpdateAppointmentPayload = Partial<CreateAppointmentPayload>

export interface GoogleSyncResult {
  success: boolean
  error?: string
  lastSyncTime?: string
  syncedCount?: number
}

export interface GoogleAuthTokens {
  access_token: string
  refresh_token: string
  expiry_date: number
}

export type PhotoEvolutionTag = 'ANTES' | 'DURANTE' | 'DEPOIS' | 'RETORNO'

export interface PatientImage {
  id: number
  patient_id: number
  file_name: string
  description: string | null
  created_at: string
  tag?: PhotoEvolutionTag | string | null
  category?: string | null
  photo_date?: string | null
}

export type TransactionStatus = 'COMPLETED' | 'PENDING' | 'CANCELLED'

export interface FinancialTransaction {
  id: number
  type: 'INCOME' | 'EXPENSE'
  amount: number
  description: string
  date: string
  category: string | null
  payment_method: string
  patient_id: number | null
  status?: TransactionStatus
  due_date?: string | null
  payment_date?: string | null
  installment_current?: number | null
  installment_total?: number | null
  notes?: string | null
  fee_amount?: number | null
  net_amount?: number | null
  patient_name?: string | null
  created_at: string
}

export type CreateTransactionPayload = Omit<FinancialTransaction, 'id' | 'created_at' | 'patient_name'>
export type UpdateTransactionPayload = Partial<CreateTransactionPayload>

export interface FinancialSummary {
  totalIncome: number
  totalExpense: number
  netBalance: number
  pendingIncome?: number
  pendingExpense?: number
  completedIncome?: number
  completedExpense?: number
  averageTicket?: number
  totalTransactions?: number
  completedCount?: number
  pendingCount?: number
}

export type CustomFieldType =
  | 'short_text'
  | 'long_text'
  | 'number'
  | 'date'
  | 'single_select'
  | 'multi_checkbox'
  | 'yes_no_table'

export interface CustomFieldDefinition {
  id: string
  label: string
  type: CustomFieldType
  options?: string[]
  placeholder?: string
  required?: boolean
  enabled: boolean
}

export interface CustomBlockDefinition {
  id: string
  title: string
  enabled: boolean
  fields: CustomFieldDefinition[]
}

export interface FormsCustomizationConfig {
  patient: {
    showAddress: boolean
    showProfession: boolean
    showPracticesSports: boolean
    showPastMedicalHistory: boolean
    showMedications: boolean
    showMedicalProblems: boolean
    showShoeType: boolean
    showNailShape: boolean
    medicalProblemsOptions: string[]
    shoeTypeOptions: string[]
    nailShapeOptions: string[]
    customBlocks: CustomBlockDefinition[]
  }
  consultation: {
    showDermatologicalPathologies: boolean
    showFootSpecificHistory: boolean
    showClinicalPrescription: boolean
    showGeneralObservations: boolean
    dermatologicalPathologiesOptions: string[]
    customBlocks: CustomBlockDefinition[]
  }
  appointment: {
    serviceOptions: { name: string; defaultPrice?: number }[]
    customFields: CustomFieldDefinition[]
  }
}


