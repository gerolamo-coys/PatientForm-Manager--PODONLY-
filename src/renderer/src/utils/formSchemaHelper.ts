import type { FormsCustomizationConfig } from '../../../shared/types'

export const DEFAULT_FORMS_CONFIG: FormsCustomizationConfig = {
  patient: {
    showAddress: true,
    showProfession: true,
    showPracticesSports: true,
    showPastMedicalHistory: true,
    showMedications: true,
    showMedicalProblems: true,
    showShoeType: true,
    showNailShape: true,
    medicalProblemsOptions: [
      'Alergia',
      'Cardiopatia',
      'Hipertensão',
      'Diabetes',
      'Colesterol',
      'Fumante',
      'Artrite Reumatóide',
      'Artrose',
      'Gota',
      'Possui Marca Passo'
    ],
    shoeTypeOptions: ['Aberto', 'Fechado'],
    nailShapeOptions: ['Normal', 'Telha', 'Funil', 'Gancho', 'Caracol', 'Distrófica', 'Torquês'],
    customBlocks: []
  },
  consultation: {
    showDermatologicalPathologies: true,
    showFootSpecificHistory: true,
    showClinicalPrescription: true,
    showGeneralObservations: true,
    dermatologicalPathologiesOptions: [
      'Bromidrose',
      'Desidrose',
      'Exostose',
      'Hiperidrose',
      'Hiperqueratose',
      'Micose Interdigital',
      'Micose Plantar',
      'Onicocriptose',
      'Onicofose',
      'Onicomicose',
      'Psoríase',
      'Ressecamento'
    ],
    customBlocks: []
  },
  appointment: {
    serviceOptions: [
      { name: 'Podoprofilaxia Padrão', defaultPrice: 120 },
      { name: 'Tratamento de Onicocriptose', defaultPrice: 180 },
      { name: 'Laserterapia / PDT', defaultPrice: 150 },
      { name: 'Retorno / Curativo', defaultPrice: 0 },
      { name: 'Avaliação Podológica', defaultPrice: 80 }
    ],
    customFields: []
  }
}

export async function loadFormsConfig(): Promise<FormsCustomizationConfig> {
  try {
    const raw = await window.api.getSetting('custom_forms_config')
    if (!raw) return structuredClone(DEFAULT_FORMS_CONFIG)
    const parsed = JSON.parse(raw)
    return {
      patient: {
        ...DEFAULT_FORMS_CONFIG.patient,
        ...(parsed.patient || {}),
        medicalProblemsOptions: Array.isArray(parsed.patient?.medicalProblemsOptions)
          ? parsed.patient.medicalProblemsOptions
          : [...DEFAULT_FORMS_CONFIG.patient.medicalProblemsOptions],
        shoeTypeOptions: Array.isArray(parsed.patient?.shoeTypeOptions)
          ? parsed.patient.shoeTypeOptions
          : [...DEFAULT_FORMS_CONFIG.patient.shoeTypeOptions],
        nailShapeOptions: Array.isArray(parsed.patient?.nailShapeOptions)
          ? parsed.patient.nailShapeOptions
          : [...DEFAULT_FORMS_CONFIG.patient.nailShapeOptions],
        customBlocks: Array.isArray(parsed.patient?.customBlocks)
          ? parsed.patient.customBlocks
          : []
      },
      consultation: {
        ...DEFAULT_FORMS_CONFIG.consultation,
        ...(parsed.consultation || {}),
        dermatologicalPathologiesOptions: Array.isArray(parsed.consultation?.dermatologicalPathologiesOptions)
          ? parsed.consultation.dermatologicalPathologiesOptions
          : [...DEFAULT_FORMS_CONFIG.consultation.dermatologicalPathologiesOptions],
        customBlocks: Array.isArray(parsed.consultation?.customBlocks)
          ? parsed.consultation.customBlocks
          : []
      },
      appointment: {
        ...DEFAULT_FORMS_CONFIG.appointment,
        ...(parsed.appointment || {}),
        serviceOptions: Array.isArray(parsed.appointment?.serviceOptions)
          ? parsed.appointment.serviceOptions
          : [...DEFAULT_FORMS_CONFIG.appointment.serviceOptions],
        customFields: Array.isArray(parsed.appointment?.customFields)
          ? parsed.appointment.customFields
          : []
      }
    }
  } catch {
    return structuredClone(DEFAULT_FORMS_CONFIG)
  }
}

export async function saveFormsConfig(config: FormsCustomizationConfig): Promise<void> {
  await window.api.setSetting('custom_forms_config', JSON.stringify(config))
  window.dispatchEvent(new CustomEvent('podonly-forms-config-updated'))
}

export function parseCustomData(raw?: string | null): Record<string, any> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}
