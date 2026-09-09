import { describe, it, expect } from 'vitest'
import {
  generateFullRecordHtml,
  generateConsultationHtml,
  generateAttendanceCertificateHtml,
  generatePaymentReceiptHtml,
  ClinicInfo
} from '../renderer/src/utils/pdfTemplates'
import { Patient, PodiatryHistoryForm } from '../shared/types'

describe('PDF Templates Module', () => {
  const mockClinic: ClinicInfo = {
    name: 'Clínica Podologia Avançada',
    address: 'Av. Paulista, 1000 - São Paulo, SP',
    phone: '(11) 98765-4321',
    professionalName: 'Dra. Maria Podóloga',
    logoBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  }

  const mockPatient: Patient = {
    id: 1,
    first_name: 'Carlos',
    last_name: 'Eduardo <script>alert(1)</script>',
    date_of_birth: '1985-05-15',
    phone: '(11) 91234-5678',
    address: 'Rua das Flores, 123',
    profession: 'Engenheiro',
    practices_sports: 'Corrida',
    past_medical_history: null,
    past_surgical_history: 'Apendicectomia',
    medications: 'Metformina 500mg',
    allergies: 'Dipirona',
    medical_problems: JSON.stringify({ diabetes: 'sim', hipertensao: 'sim' }),
    shoe_type: JSON.stringify(['Esportivo', 'Social']),
    nail_shape: JSON.stringify(['Involuta', 'Telha']),
    created_at: '2026-01-01T10:00:00Z',
    updated_at: '2026-01-01T10:00:00Z'
  }

  const mockForm: PodiatryHistoryForm = {
    id: 10,
    patient_id: 1,
    visit_date: '2026-03-01',
    chief_complaint: 'Dor no hálux direito ao caminhar',
    foot_specific_history: 'Sensibilidade aumentada na borda ungueal',
    foot_map_image: 'data:image/png;base64,mockfootmap',
    dermatological_pathologies: JSON.stringify(['Onicocriptose', 'Hiperqueratose']),
    clinical_prescription: 'Higienização diária com soro e pomada antibiótica.',
    general_observations: 'Retorno agendado em 15 dias para avaliação.',
    procedures_performed: 'Espícula ectomia e curativo oclusivo.',
    created_at: '2026-03-01T14:00:00Z',
    updated_at: '2026-03-01T14:00:00Z'
  }

  describe('generateFullRecordHtml', () => {
    it('should generate complete HTML with clinic, patient, alerts, and escape XSS', () => {
      const html = generateFullRecordHtml(mockPatient, [mockForm], mockClinic)
      
      expect(html).toContain('Clínica Podologia Avançada')
      expect(html).toContain('Dra. Maria Podóloga')
      expect(html).toContain('Carlos')
      // Ensure XSS tag is escaped
      expect(html).not.toContain('<script>alert(1)</script>')
      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
      // Check medical alerts
      expect(html).toContain('DIABÉTICO')
      expect(html).toContain('HIPERTENSO')
      expect(html).toContain('Dipirona')
      expect(html).toContain('Metformina 500mg')
      // Check history form presence
      expect(html).toContain('Dor no hálux direito ao caminhar')
      expect(html).toContain('Espícula ectomia e curativo oclusivo.')
      // Check logo presence
      expect(html).toContain('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
    })

    it('should respect toggle options (exclude alerts / signature)', () => {
      const html = generateFullRecordHtml(mockPatient, [], mockClinic, {
        includeAlerts: false,
        includeSignature: false
      })

      expect(html).not.toContain('Alertas Clínicos e Cuidados Especiais')
      expect(html).not.toContain('Carimbo & Assinatura')
    })
  })

  describe('generateConsultationHtml', () => {
    it('should generate consultation document with foot map and home care prescription', () => {
      const html = generateConsultationHtml(mockPatient, mockForm, mockClinic, {
        includeFootMap: true,
        includeSignature: true
      })

      expect(html).toContain('Atendimento Podológico')
      expect(html).toContain('Dor no hálux direito ao caminhar')
      expect(html).toContain('Onicocriptose')
      expect(html).toContain('Hiperqueratose')
      expect(html).toContain('Espícula ectomia e curativo oclusivo.')
      expect(html).toContain('Higienização diária com soro e pomada antibiótica.')
      expect(html).toContain('data:image/png;base64,mockfootmap')
      expect(html).toContain('Carimbo & Assinatura')
    })

    it('should omit foot map when toggle is false', () => {
      const html = generateConsultationHtml(mockPatient, mockForm, mockClinic, {
        includeFootMap: false
      })

      expect(html).not.toContain('data:image/png;base64,mockfootmap')
      expect(html).not.toContain('Podograma / Mapa das Lesões')
    })
  })

  describe('generateAttendanceCertificateHtml', () => {
    it('should generate official attendance declaration with dates and times', () => {
      const html = generateAttendanceCertificateHtml(mockPatient, mockClinic, {
        date: '2026-03-01',
        startTime: '14:30',
        endTime: '15:30',
        purpose: 'atendimento podológico emergencial'
      })

      expect(html).toContain('Declaração de Comparecimento')
      expect(html).toContain('01/03/2026')
      expect(html).toContain('14:30')
      expect(html).toContain('15:30')
      expect(html).toContain('atendimento podológico emergencial')
      expect(html).toContain('Dra. Maria Podóloga')
    })
  })

  describe('generatePaymentReceiptHtml', () => {
    it('should format payment receipt with currency and payment details', () => {
      const html = generatePaymentReceiptHtml(mockPatient, mockClinic, {
        amount: 150,
        paymentMethod: 'Pix',
        description: 'Tratamento de Onicocriptose e órtese',
        date: '2026-03-01'
      })

      expect(html).toContain('Recibo de Prestação de Serviços')
      expect(html).toContain('150,00')
      expect(html).toContain('Pix')
      expect(html).toContain('Tratamento de Onicocriptose e órtese')
      expect(html).toContain('01/03/2026')
    })
  })
})
