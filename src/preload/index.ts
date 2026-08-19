import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { SortMode, CreatePatientWithFormPayload, UpdatePatientWithFormPayload, UpdatePatientPayload, CreatePatientPayload, CreateFormPayload, UpdateFormPayload, CreateAppointmentPayload, UpdateAppointmentPayload } from '../shared/types'

// Custom APIs for renderer
const api = {
  listPatients: (sortMode: SortMode, searchQuery: string) => ipcRenderer.invoke('listPatients', sortMode, searchQuery),
  getPatientWithForm: (patientId: number) => ipcRenderer.invoke('getPatientWithForm', patientId),
  createPatientWithForm: (payload: CreatePatientWithFormPayload) => ipcRenderer.invoke('createPatientWithForm', payload),
  updatePatientWithForm: (patientId: number, payload: UpdatePatientWithFormPayload) => ipcRenderer.invoke('updatePatientWithForm', patientId, payload),
  deletePatients: (patientIds: number[]) => ipcRenderer.invoke('deletePatients', patientIds),
  getPatient: (patientId: number) => ipcRenderer.invoke('getPatient', patientId),
  getPatientForms: (patientId: number) => ipcRenderer.invoke('getPatientForms', patientId),
  getForm: (formId: number) => ipcRenderer.invoke('getForm', formId),
  updatePatient: (patientId: number, payload: UpdatePatientPayload) => ipcRenderer.invoke('updatePatient', patientId, payload),
  createPatient: (payload: CreatePatientPayload) => ipcRenderer.invoke('createPatient', payload),
  createPatientForm: (patientId: number, payload: CreateFormPayload) => ipcRenderer.invoke('createPatientForm', patientId, payload),
  updatePatientForm: (formId: number, payload: UpdateFormPayload) => ipcRenderer.invoke('updatePatientForm', formId, payload),
  getAppointments: (start: string, end: string) => ipcRenderer.invoke('getAppointments', start, end),
  getAllAppointments: () => ipcRenderer.invoke('getAllAppointments'),
  createAppointment: (payload: CreateAppointmentPayload) => ipcRenderer.invoke('createAppointment', payload),
  updateAppointment: (id: number, payload: UpdateAppointmentPayload) => ipcRenderer.invoke('updateAppointment', id, payload),
  deleteAppointment: (id: number) => ipcRenderer.invoke('deleteAppointment', id),
  authenticateGoogle: () => ipcRenderer.invoke('authenticateGoogle'),
  pullFromGoogleCalendar: () => ipcRenderer.invoke('pullFromGoogleCalendar'),
  getSetting: (key: string) => ipcRenderer.invoke('getSetting', key),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('setSetting', key, value),
  getWhatsappStatus: () => ipcRenderer.invoke('getWhatsappStatus'),
  startWhatsapp: () => ipcRenderer.invoke('startWhatsapp'),
  logoutWhatsapp: () => ipcRenderer.invoke('logoutWhatsapp'),
  sendTestWhatsappMessage: (phone: string, message: string) => ipcRenderer.invoke('sendTestWhatsappMessage', phone, message),
  getPatientImages: (patientId: number) => ipcRenderer.invoke('getPatientImages', patientId),
  pickAndSavePatientImage: (patientId: number) => ipcRenderer.invoke('pickAndSavePatientImage', patientId),
  updatePatientImageDescription: (id: number, description: string) => ipcRenderer.invoke('updatePatientImageDescription', id, description),
  deletePatientImage: (id: number, fileName: string) => ipcRenderer.invoke('deletePatientImage', id, fileName),
  readPatientImageBase64: (fileName: string) => ipcRenderer.invoke('readPatientImageBase64', fileName),
  createBackup: () => ipcRenderer.invoke('createBackup'),
  getDiskUsage: () => ipcRenderer.invoke('getDiskUsage'),
  factoryReset: (confirmationToken: string) => ipcRenderer.invoke('factoryReset', confirmationToken),
  pickAndSaveClinicLogo: () => ipcRenderer.invoke('pickAndSaveClinicLogo'),
  getClinicLogoBase64: () => ipcRenderer.invoke('getClinicLogoBase64'),
  deleteClinicLogo: () => ipcRenderer.invoke('deleteClinicLogo'),
  validateLicense: (key: string) => ipcRenderer.invoke('validateLicense', key),
  checkLicenseStatus: () => ipcRenderer.invoke('checkLicenseStatus'),
  getSubscriptionDetails: () => ipcRenderer.invoke('getSubscriptionDetails'),
  cancelSubscription: () => ipcRenderer.invoke('cancelSubscription'),
  openExternalBrowser: (url: string) => ipcRenderer.invoke('openExternalBrowser', url),
  createTransaction: (payload: any) => ipcRenderer.invoke('createTransaction', payload),
  updateTransaction: (id: number, payload: any) => ipcRenderer.invoke('updateTransaction', id, payload),
  deleteTransaction: (id: number) => ipcRenderer.invoke('deleteTransaction', id),
  getTransactions: (startDate: string, endDate: string) => ipcRenderer.invoke('getTransactions', startDate, endDate),
  getFinancialSummary: (startDate: string, endDate: string) => ipcRenderer.invoke('getFinancialSummary', startDate, endDate),
  onWhatsappStatus: (callback: (data: { status: 'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED'; qrDataUri: string }) => void) => {
    const subscription = (_event: any, data: { status: 'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED'; qrDataUri: string }) => callback(data)
    ipcRenderer.on('whatsapp-status', subscription)
    return () => {
      ipcRenderer.removeListener('whatsapp-status', subscription)
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
