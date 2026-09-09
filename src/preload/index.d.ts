import { ElectronAPI } from '@electron-toolkit/preload'
import {
  PatientListItem,
  PatientWithForm,
  SortMode,
  CreatePatientWithFormPayload,
  UpdatePatientWithFormPayload,
  Patient,
  PodiatryHistoryForm,
  UpdatePatientPayload,
  CreatePatientPayload,
  CreateFormPayload,
  UpdateFormPayload,
  Appointment,
  CreateAppointmentPayload,
  UpdateAppointmentPayload,
  PatientImage,
  FinancialTransaction,
  CreateTransactionPayload,
  UpdateTransactionPayload,
  FinancialSummary,
  GoogleSyncResult
} from '../shared/types'

export interface IAPI {
  listPatients: (sortMode: SortMode, searchQuery: string) => Promise<PatientListItem[]>
  getPatientWithForm: (patientId: number) => Promise<PatientWithForm>
  createPatientWithForm: (payload: CreatePatientWithFormPayload) => Promise<number>
  updatePatientWithForm: (patientId: number, payload: UpdatePatientWithFormPayload) => Promise<void>
  deletePatients: (patientIds: number[]) => Promise<void>
  
  getPatient: (patientId: number) => Promise<Patient>
  getPatientForms: (patientId: number) => Promise<PodiatryHistoryForm[]>
  getForm: (formId: number) => Promise<PodiatryHistoryForm>
  updatePatient: (patientId: number, payload: UpdatePatientPayload) => Promise<void>
  createPatient: (payload: CreatePatientPayload) => Promise<number>
  createPatientForm: (patientId: number, payload: CreateFormPayload) => Promise<number>
  updatePatientForm: (formId: number, payload: UpdateFormPayload) => Promise<void>

  getAppointments: (start: string, end: string) => Promise<Appointment[]>
  getAllAppointments: () => Promise<Appointment[]>
  createAppointment: (payload: CreateAppointmentPayload) => Promise<number>
  updateAppointment: (id: number, payload: UpdateAppointmentPayload) => Promise<void>
  deleteAppointment: (id: number) => Promise<void>

  isGoogleConnected: () => Promise<boolean>
  getGoogleStatus: () => Promise<{ isConnected: boolean; isConfigured: boolean; email: string | null }>
  disconnectGoogle: () => Promise<boolean>
  cancelGoogleAuth: () => Promise<boolean>
  authenticateGoogle: () => Promise<boolean>
  pullFromGoogleCalendar: () => Promise<GoogleSyncResult>
  importGoogleCredentialsFile: () => Promise<{ success: boolean; clientId?: string; clientSecret?: string; error?: string } | null>
  sendSingleAppointmentReminder: (appointmentId: number) => Promise<{ success: boolean; error?: string }>
  getSetting: (key: string) => Promise<string | null>
  setSetting: (key: string, value: string) => Promise<void>
  getWhatsappStatus: () => Promise<{ status: 'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED'; qrDataUri: string }>
  startWhatsapp: () => Promise<void>
  logoutWhatsapp: () => Promise<void>
  sendTestWhatsappMessage: (phone: string, message: string) => Promise<boolean>
  getPatientImages: (patientId: number) => Promise<PatientImage[]>
  pickAndSavePatientImage: (patientId: number) => Promise<number | null>
  updatePatientImageDescription: (id: number, description: string) => Promise<void>
  deletePatientImage: (id: number, fileName: string) => Promise<void>
  readPatientImageBase64: (fileName: string) => Promise<string | null>
  createBackup: () => Promise<string | null>
  getDiskUsage: () => Promise<{ dbSize: number; imagesSize: number; totalSize: number }>
  factoryReset: (confirmationToken: string) => Promise<boolean>
  pickAndSaveClinicLogo: () => Promise<string | null>
  getClinicLogoBase64: () => Promise<string | null>
  deleteClinicLogo: () => Promise<boolean>
  pickAndSaveCustomFeetMap: () => Promise<string | null>
  saveCustomFeetMapBase64: (base64Data: string) => Promise<boolean>
  getCustomFeetMapBase64: () => Promise<string | null>
  deleteCustomFeetMap: () => Promise<boolean>
  validateLicense: (key: string) => Promise<{ valid: boolean; error?: string }>
  checkLicenseStatus: () => Promise<{ valid: boolean; error?: string }>
  getSubscriptionDetails: () => Promise<any>
  cancelSubscription: () => Promise<{ success: boolean; error?: string }>
  openExternalBrowser: (url: string) => Promise<void>
  
  createTransaction: (payload: CreateTransactionPayload) => Promise<number>
  updateTransaction: (id: number, payload: UpdateTransactionPayload) => Promise<void>
  deleteTransaction: (id: number) => Promise<void>
  getTransactions: (startDate: string, endDate: string) => Promise<FinancialTransaction[]>
  getFinancialSummary: (startDate: string, endDate: string) => Promise<FinancialSummary>
  
  // Auth & Security
  hasAdminUser: () => Promise<boolean>
  setupAdminPassword: (password: string) => Promise<boolean>
  unlockSession: (password: string) => Promise<boolean>
  lockSession: () => Promise<boolean>
  isSessionLocked: () => Promise<boolean>
  activityPing: () => Promise<boolean>
  onSessionLocked: (callback: () => void) => () => void
  exportEncryptedBackup: (password: string) => Promise<boolean>
  getAuditLogs: () => Promise<any[]>

  // PDF Export & Print
  exportHtmlToPdf: (htmlContent: string, defaultFileName: string) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>
  printHtml: (htmlContent: string) => Promise<{ success: boolean; error?: string }>

  onWhatsappStatus: (callback: (data: { status: 'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED'; qrDataUri: string }) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: IAPI
  }
}
