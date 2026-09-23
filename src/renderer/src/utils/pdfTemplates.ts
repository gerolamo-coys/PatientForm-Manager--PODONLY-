import { Patient, PodiatryHistoryForm, PatientImage, CustomBlockDefinition, FormsCustomizationConfig } from '../../../shared/types'
import { calculateAge } from './ageHelper'
import { DEFAULT_FORMS_CONFIG, parseCustomData } from './formSchemaHelper'

function renderCustomBlocksHtml(blocks: CustomBlockDefinition[], customDataJson: string | null | undefined): string {
  const customMap = parseCustomData(customDataJson)
  if (!blocks || blocks.length === 0 || Object.keys(customMap).length === 0) return ''

  const renderedBlocks: string[] = []
  for (const block of blocks) {
    const itemsHtml: string[] = []
    for (const field of block.fields) {
      const val = customMap[field.id]
      if (val === undefined || val === null || val === '') continue
      if (Array.isArray(val) && val.length === 0) continue

      let formattedVal = ''
      if (Array.isArray(val)) {
        formattedVal = val.map((v: string) => `<span class="tag tag-highlight">${escapeHtml(String(v))}</span>`).join('')
      } else if (typeof val === 'object') {
        const subItems = Object.entries(val as Record<string, { status?: boolean; details?: string }>)
          .filter(([, item]) => item && (item.status === true || (item.details && item.details.trim())))
          .map(([k, item]) => `${escapeHtml(k)}: <strong>${item.status ? 'Sim' : 'Não'}</strong>${item.details ? ` (${escapeHtml(item.details)})` : ''}`)
        if (subItems.length === 0) continue
        formattedVal = subItems.join(' • ')
      } else {
        formattedVal = escapeHtml(String(val))
      }

      itemsHtml.push(`
        <div style="margin-bottom: 5px; font-size: 8.5pt;">
          <strong>${escapeHtml(field.label)}:</strong> ${formattedVal}
        </div>
      `)
    }

    if (itemsHtml.length > 0) {
      renderedBlocks.push(`
        <div class="section-card">
          <div class="section-title">${escapeHtml(block.title)}</div>
          ${itemsHtml.join('')}
        </div>
      `)
    }
  }

  return renderedBlocks.join('')
}

export interface ClinicInfo {
  name?: string | null
  address?: string | null
  phone?: string | null
  professionalName?: string | null
  logoBase64?: string | null
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  try {
    const [year, month, day] = dateStr.split('T')[0].split('-')
    if (year && month && day) {
      return `${day}/${month}/${year}`
    }
    return dateStr
  } catch {
    return dateStr
  }
}

function resolveFootMapImage(rawImage: string | null | undefined): string | null {
  if (!rawImage) return null
  const trimmed = rawImage.trim()
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed)
      return parsed.composite || parsed.drawing || null
    } catch {
      return null
    }
  }
  return rawImage
}

function getBaseStyles(): string {
  return `
    <style>
      @page {
        size: A4;
        margin: 12mm 15mm;
      }
      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        color: #1e293b;
        background: #ffffff;
        margin: 0;
        padding: 0;
        font-size: 10pt;
        line-height: 1.45;
      }
      .header-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #0e7490;
        padding-bottom: 12px;
        margin-bottom: 18px;
      }
      .clinic-brand {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .clinic-logo {
        max-height: 65px;
        max-width: 140px;
        object-fit: contain;
      }
      .clinic-title {
        font-size: 16pt;
        font-weight: 800;
        color: #0e7490;
        margin: 0;
        line-height: 1.2;
      }
      .clinic-subtitle {
        font-size: 8.5pt;
        color: #64748b;
        margin-top: 3px;
      }
      .doc-badge {
        text-align: right;
      }
      .doc-badge-tag {
        display: inline-block;
        background: #0e7490;
        color: white;
        font-weight: 700;
        font-size: 8.5pt;
        padding: 4px 10px;
        border-radius: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .doc-date {
        font-size: 8pt;
        color: #64748b;
        margin-top: 4px;
      }
      .section-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 10px 14px;
        margin-bottom: 14px;
        page-break-inside: avoid;
      }
      .section-title {
        font-size: 10.5pt;
        font-weight: 700;
        color: #0f172a;
        border-bottom: 1px solid #cbd5e1;
        padding-bottom: 5px;
        margin-top: 0;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .info-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 6px 14px;
        font-size: 9pt;
      }
      .info-item {
        display: flex;
        gap: 5px;
      }
      .info-label {
        font-weight: 700;
        color: #475569;
        min-width: 90px;
      }
      .info-value {
        color: #0f172a;
        flex: 1;
      }
      .alert-box {
        background: #fef2f2;
        border: 1px solid #fca5a5;
        border-radius: 6px;
        padding: 8px 12px;
        margin-bottom: 14px;
        page-break-inside: avoid;
      }
      .alert-title {
        color: #b91c1c;
        font-weight: 700;
        font-size: 9pt;
        margin-bottom: 4px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .tag {
        display: inline-block;
        background: #e2e8f0;
        color: #334155;
        font-size: 8pt;
        font-weight: 600;
        padding: 2px 7px;
        border-radius: 12px;
        margin-right: 4px;
        margin-bottom: 4px;
      }
      .tag-alert {
        background: #fee2e2;
        color: #991b1b;
        border: 1px solid #fecaca;
      }
      .tag-highlight {
        background: #e0f2fe;
        color: #0369a1;
      }
      .text-block {
        font-size: 9pt;
        color: #334155;
        white-space: pre-wrap;
        line-height: 1.5;
      }
      .prescription-box {
        background: #ecfdf5;
        border: 1px solid #6ee7b7;
        border-radius: 6px;
        padding: 10px 14px;
        margin-bottom: 14px;
        page-break-inside: avoid;
      }
      .prescription-title {
        color: #065f46;
        font-weight: 700;
        font-size: 9.5pt;
        margin-bottom: 6px;
      }
      .history-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 8.5pt;
        margin-top: 6px;
      }
      .history-table th {
        background: #e2e8f0;
        color: #334155;
        font-weight: 700;
        text-align: left;
        padding: 6px 8px;
        border: 1px solid #cbd5e1;
      }
      .history-table td {
        padding: 6px 8px;
        border: 1px solid #cbd5e1;
        vertical-align: top;
      }
      .history-table tr:nth-child(even) {
        background: #f8fafc;
      }
      .foot-map-container {
        text-align: center;
        margin: 10px 0;
        page-break-inside: avoid;
      }
      .foot-map-img {
        max-height: 220px;
        max-width: 100%;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
      }
      .signature-section {
        margin-top: 30px;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        page-break-inside: avoid;
      }
      .signature-box {
        width: 250px;
        text-align: center;
        border-top: 1px solid #475569;
        padding-top: 6px;
        font-size: 8.5pt;
        color: #334155;
      }
      .footer-legal {
        font-size: 7.5pt;
        color: #94a3b8;
        text-align: center;
        margin-top: 25px;
        border-top: 1px solid #e2e8f0;
        padding-top: 8px;
      }
    </style>
  `
}

function renderHeader(clinic: ClinicInfo, docTitle: string): string {
  const clinicName = clinic.name || 'Podonly Podologia Clínica'
  const clinicAddress = clinic.address || ''
  const clinicPhone = clinic.phone ? `Tel/WhatsApp: ${clinic.phone}` : ''
  const profName = clinic.professionalName ? `Resp. Técnico: ${clinic.professionalName}` : ''
  const subParts = [clinicAddress, clinicPhone, profName].filter(Boolean).join(' • ')

  return `
    <div class="header-container">
      <div class="clinic-brand">
        ${clinic.logoBase64 ? `<img class="clinic-logo" src="${clinic.logoBase64}" alt="Logo" />` : ''}
        <div>
          <h1 class="clinic-title">${escapeHtml(clinicName)}</h1>
          ${subParts ? `<div class="clinic-subtitle">${escapeHtml(subParts)}</div>` : ''}
        </div>
      </div>
      <div class="doc-badge">
        <div class="doc-badge-tag">${escapeHtml(docTitle)}</div>
        <div class="doc-date">Emissão: ${formatDate(new Date().toISOString())}</div>
      </div>
    </div>
  `
}

function renderSignature(clinic: ClinicInfo, cityDate?: string): string {
  const profName = clinic.professionalName || clinic.name || 'Podólogo Responsável'
  const currentDate = cityDate || `Emitido em ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`

  return `
    <div class="signature-section">
      <div style="font-size: 8.5pt; color: #64748b;">
        ${escapeHtml(currentDate)}
      </div>
      <div class="signature-box">
        <strong>${escapeHtml(profName)}</strong><br />
        <span style="font-size: 7.5pt; color: #64748b;">Carimbo & Assinatura</span>
      </div>
    </div>
    <div class="footer-legal">
      Documento gerado eletronicamente através do Podonly • Software de Gestão Podológica
    </div>
  `
}

/**
 * 1. PRONTUÁRIO COMPLETO DO PACIENTE (ANAMNESE + HISTÓRICO DE CONSULTAS)
 */
export function generateFullRecordHtml(
  patient: Patient,
  forms: PodiatryHistoryForm[],
  clinic: ClinicInfo,
  options?: { includeAlerts?: boolean; includeSignature?: boolean; formsConfig?: FormsCustomizationConfig }
): string {
  const includeAlerts = options?.includeAlerts !== false
  const includeSignature = options?.includeSignature !== false
  const activeConfig = options?.formsConfig || DEFAULT_FORMS_CONFIG

  const age = calculateAge(patient.date_of_birth)
  const ageText = age !== null ? `${age} anos` : '-'

  // Parse medical problems
  let medicalProblems: Record<string, string> = {}
  try {
    medicalProblems = JSON.parse(patient.medical_problems || '{}')
  } catch {
    medicalProblems = {}
  }

  // Parse nail shapes & shoe types
  let nailShapes: string[] = []
  try {
    nailShapes = JSON.parse(patient.nail_shape || '[]')
  } catch {
    nailShapes = []
  }

  let shoeTypes: string[] = []
  try {
    shoeTypes = JSON.parse(patient.shoe_type || '[]')
  } catch {
    shoeTypes = []
  }

  // Check critical health alerts
  const isDiabetic = medicalProblems['diabetes'] === 'sim' || medicalProblems['diabetes'] === 'true'
  const isHypertensive = medicalProblems['hipertensao'] === 'sim' || medicalProblems['hipertensao'] === 'true'
  const hasCirculatory = medicalProblems['circulacao'] === 'sim' || medicalProblems['circulacao'] === 'true'
  const hasAllergies = Boolean(patient.allergies && patient.allergies.trim())
  const hasMedications = Boolean(patient.medications && patient.medications.trim())

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Prontuário - ${escapeHtml(patient.first_name)} ${escapeHtml(patient.last_name)}</title>
      ${getBaseStyles()}
    </head>
    <body>
      ${renderHeader(clinic, 'Prontuário Clínico Podológico')}

      <!-- Personal Info -->
      <div class="section-card">
        <div class="section-title">
          <span>Dados do Paciente</span>
          <span style="font-size: 8.5pt; font-weight: 500; color: #64748b;">Registro #${patient.id}</span>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Nome:</span>
            <span class="info-value"><strong>${escapeHtml(patient.first_name)} ${escapeHtml(patient.last_name)}</strong></span>
          </div>
          <div class="info-item">
            <span class="info-label">Idade / Nasc.:</span>
            <span class="info-value">${ageText} (${formatDate(patient.date_of_birth)})</span>
          </div>
          <div class="info-item">
            <span class="info-label">Telefone:</span>
            <span class="info-value">${escapeHtml(patient.phone) || '-'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Profissão:</span>
            <span class="info-value">${escapeHtml(patient.profession) || '-'}</span>
          </div>
          <div class="info-item" style="grid-column: span 2;">
            <span class="info-label">Endereço:</span>
            <span class="info-value">${escapeHtml(patient.address) || '-'}</span>
          </div>
          <div class="info-item" style="grid-column: span 2;">
            <span class="info-label">Esportes:</span>
            <span class="info-value">${escapeHtml(patient.practices_sports) || 'Nenhum informado'}</span>
          </div>
        </div>
      </div>

      <!-- Critical Health Alerts -->
      ${includeAlerts && (isDiabetic || isHypertensive || hasCirculatory || hasAllergies || hasMedications) ? `
        <div class="alert-box">
          <div class="alert-title">
            ⚠️ Alertas Clínicos e Cuidados Especiais
          </div>
          <div>
            ${isDiabetic ? '<span class="tag tag-alert">DIABÉTICO</span>' : ''}
            ${isHypertensive ? '<span class="tag tag-alert">HIPERTENSO</span>' : ''}
            ${hasCirculatory ? '<span class="tag tag-alert">ALTERAÇÃO CIRCULATÓRIA</span>' : ''}
            ${hasAllergies ? `<div style="font-size: 8.5pt; margin-top: 4px;"><strong>Alergias:</strong> ${escapeHtml(patient.allergies)}</div>` : ''}
            ${hasMedications ? `<div style="font-size: 8.5pt; margin-top: 2px;"><strong>Medicações de Uso Contínuo:</strong> ${escapeHtml(patient.medications)}</div>` : ''}
            ${patient.past_surgical_history ? `<div style="font-size: 8.5pt; margin-top: 2px;"><strong>Cirurgias Prévias:</strong> ${escapeHtml(patient.past_surgical_history)}</div>` : ''}
          </div>
        </div>
      ` : ''}

      <!-- Foot & Shoe Habits -->
      <div class="section-card">
        <div class="section-title">Características Podológicas & Calçados</div>
        <div style="font-size: 8.5pt;">
          <div style="margin-bottom: 5px;">
            <strong>Formato das Unhas:</strong> 
            ${nailShapes.length > 0 ? nailShapes.map(n => `<span class="tag tag-highlight">${escapeHtml(n)}</span>`).join('') : '<span style="color:#94a3b8">Não informado</span>'}
          </div>
          <div>
            <strong>Tipo de Calçado Habitual:</strong> 
            ${shoeTypes.length > 0 ? shoeTypes.map(s => `<span class="tag">${escapeHtml(s)}</span>`).join('') : '<span style="color:#94a3b8">Não informado</span>'}
          </div>
        </div>
      </div>

      ${renderCustomBlocksHtml(activeConfig.patient.customBlocks, patient.custom_data)}

      <!-- Historical Consultations -->
      <div class="section-card">
        <div class="section-title">
          <span>Histórico de Evolução & Procedimentos</span>
          <span style="font-size: 8pt; font-weight: 500; color: #64748b;">${forms.length} atendimento(s)</span>
        </div>

        ${forms.length > 0 ? `
          <table class="history-table">
            <thead>
              <tr>
                <th style="width: 14%;">Data</th>
                <th style="width: 25%;">Queixa Principal</th>
                <th style="width: 33%;">Procedimentos Realizados</th>
                <th style="width: 28%;">Prescrição / Home Care</th>
              </tr>
            </thead>
            <tbody>
              ${forms.map(f => `
                <tr>
                  <td><strong>${formatDate(f.visit_date)}</strong></td>
                  <td>${escapeHtml(f.chief_complaint) || '-'}</td>
                  <td>${escapeHtml(f.procedures_performed) || '-'}</td>
                  <td>${escapeHtml(f.clinical_prescription) || escapeHtml(f.general_observations) || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : `
          <div style="font-size: 8.5pt; color: #94a3b8; padding: 6px 0;">
            Nenhuma consulta registrada até o momento.
          </div>
        `}
      </div>

      ${includeSignature ? renderSignature(clinic) : ''}
    </body>
    </html>
  `
}

/**
 * 2. CONSULTA DO DIA / FICHA DE ATENDIMENTO & HOME CARE
 */
export function generateConsultationHtml(
  patient: Patient,
  form: PodiatryHistoryForm,
  clinic: ClinicInfo,
  options?: { includeFootMap?: boolean; includeSignature?: boolean; formsConfig?: FormsCustomizationConfig }
): string {
  const includeFootMap = options?.includeFootMap !== false
  const includeSignature = options?.includeSignature !== false
  const activeConfig = options?.formsConfig || DEFAULT_FORMS_CONFIG
  const age = calculateAge(patient.date_of_birth)
  const ageText = age !== null ? `${age} anos` : '-'

  // Parse dermatological pathologies
  let pathologies: string[] = []
  try {
    pathologies = JSON.parse(form.dermatological_pathologies || '[]')
  } catch {
    pathologies = []
  }

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Atendimento - ${escapeHtml(patient.first_name)} (${formatDate(form.visit_date)})</title>
      ${getBaseStyles()}
    </head>
    <body>
      ${renderHeader(clinic, 'Atendimento Podológico')}

      <!-- Patient Header -->
      <div class="section-card">
        <div class="section-title">
          <span>Identificação do Paciente</span>
          <span>Data: ${formatDate(form.visit_date)}</span>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Paciente:</span>
            <span class="info-value"><strong>${escapeHtml(patient.first_name)} ${escapeHtml(patient.last_name)}</strong></span>
          </div>
          <div class="info-item">
            <span class="info-label">Idade:</span>
            <span class="info-value">${ageText}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Telefone:</span>
            <span class="info-value">${escapeHtml(patient.phone) || '-'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Profissão:</span>
            <span class="info-value">${escapeHtml(patient.profession) || '-'}</span>
          </div>
        </div>
      </div>

      <!-- Chief Complaint & Pathologies -->
      <div class="section-card">
        <div class="section-title">Avaliação Podológica</div>
        <div style="margin-bottom: 6px;">
          <strong>Queixa Principal / Motivo da Consulta:</strong>
          <div class="text-block" style="margin-top: 3px;">${escapeHtml(form.chief_complaint) || 'Avaliação e manutenção preventiva rotineira.'}</div>
        </div>

        ${pathologies.length > 0 ? `
          <div style="margin-top: 8px;">
            <strong>Patologias Identificadas:</strong><br />
            ${pathologies.map(p => `<span class="tag tag-alert">${escapeHtml(p)}</span>`).join('')}
          </div>
        ` : ''}

        ${form.foot_specific_history ? `
          <div style="margin-top: 8px;">
            <strong>Histórico Específico dos Pés:</strong>
            <div class="text-block" style="margin-top: 3px;">${escapeHtml(form.foot_specific_history)}</div>
          </div>
        ` : ''}
      </div>

      <!-- Procedures Performed -->
      <div class="section-card">
        <div class="section-title">Procedimentos Realizados no Atendimento</div>
        <div class="text-block">${escapeHtml(form.procedures_performed) || 'Procedimento podológico padrão.'}</div>
      </div>

      <!-- Foot Map Podogram (if available and requested) -->
      ${(() => {
        const resolvedMap = resolveFootMapImage(form.foot_map_image)
        return includeFootMap && resolvedMap ? `
          <div class="section-card foot-map-container">
            <div class="section-title" style="text-align: left;">Podograma / Mapa das Lesões</div>
            <img class="foot-map-img" src="${resolvedMap}" alt="Mapa do Pé" />
          </div>
        ` : ''
      })()}

      <!-- Home Care & Prescription -->
      <div class="prescription-box">
        <div class="prescription-title">💊 Orientações de Cuidados Domiciliares (Home Care)</div>
        <div class="text-block">${escapeHtml(form.clinical_prescription) || 'Manter higienização adequada, secar bem entre os dedos e hidratar diariamente os pés.'}</div>
      </div>

      ${form.general_observations ? `
        <div class="section-card">
          <div class="section-title">Observações Complementares</div>
          <div class="text-block">${escapeHtml(form.general_observations)}</div>
        </div>
      ` : ''}

      ${renderCustomBlocksHtml(activeConfig.consultation.customBlocks, form.custom_data)}

      ${includeSignature ? renderSignature(clinic) : ''}
    </body>
    </html>
  `
}

/**
 * 3. DECLARAÇÃO DE COMPARECIMENTO
 */
export function generateAttendanceCertificateHtml(
  patient: Patient,
  clinic: ClinicInfo,
  details: {
    date: string
    startTime?: string
    endTime?: string
    purpose?: string
  }
): string {
  const patientFullName = `${patient.first_name} ${patient.last_name}`.trim()
  const dateFormatted = formatDate(details.date)
  const timeInfo = details.startTime && details.endTime
    ? `no período das <strong>${escapeHtml(details.startTime)}</strong> às <strong>${escapeHtml(details.endTime)}</strong>`
    : details.startTime
      ? `às <strong>${escapeHtml(details.startTime)}</strong>`
      : ''

  const purposeText = details.purpose || 'atendimento e procedimento podológico'

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Declaração de Comparecimento - ${escapeHtml(patientFullName)}</title>
      ${getBaseStyles()}
      <style>
        .cert-container {
          padding: 40px 20px;
          text-align: justify;
          line-height: 2;
          font-size: 12pt;
        }
        .cert-title {
          text-align: center;
          font-size: 18pt;
          font-weight: 800;
          color: #0e7490;
          letter-spacing: 1px;
          margin-bottom: 40px;
          text-transform: uppercase;
        }
      </style>
    </head>
    <body>
      ${renderHeader(clinic, 'Declaração de Comparecimento')}

      <div class="cert-container">
        <div class="cert-title">Declaração de Comparecimento</div>

        <p>
          Declaramos para os devidos fins que o(a) Sr.(a) <strong>${escapeHtml(patientFullName)}</strong>,
          ${patient.phone ? `telefone ${escapeHtml(patient.phone)},` : ''}
          compareceu a este estabelecimento de saúde podológica no dia <strong>${dateFormatted}</strong>,
          ${timeInfo}, para realização de <strong>${escapeHtml(purposeText)}</strong>.
        </p>

        <p style="margin-top: 30px;">
          Por ser a expressão da verdade, firmamos a presente declaração.
        </p>
      </div>

      ${renderSignature(clinic)}
    </body>
    </html>
  `
}

/**
 * 4. RECIBO DE PAGAMENTO DE SERVIÇOS PODOLÓGICOS
 */
export function generatePaymentReceiptHtml(
  patient: Patient,
  clinic: ClinicInfo,
  details: {
    amount: number
    paymentMethod?: string
    description?: string
    date: string
  }
): string {
  const patientFullName = `${patient.first_name} ${patient.last_name}`.trim()
  const dateFormatted = formatDate(details.date)
  const formattedAmount = details.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const serviceDesc = details.description || 'procedimentos e tratamentos podológicos'

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Recibo - ${escapeHtml(patientFullName)}</title>
      ${getBaseStyles()}
      <style>
        .receipt-container {
          border: 2px dashed #0e7490;
          padding: 30px;
          border-radius: 8px;
          margin-top: 20px;
          line-height: 1.8;
          font-size: 11pt;
        }
        .receipt-title {
          text-align: center;
          font-size: 16pt;
          font-weight: 800;
          color: #0e7490;
          margin-bottom: 25px;
          text-transform: uppercase;
        }
        .amount-highlight {
          font-size: 18pt;
          font-weight: 800;
          color: #0e7490;
          background: #e0f2fe;
          padding: 6px 14px;
          border-radius: 6px;
          display: inline-block;
          margin-bottom: 15px;
        }
      </style>
    </head>
    <body>
      ${renderHeader(clinic, 'Recibo de Pagamento')}

      <div class="receipt-container">
        <div class="receipt-title">Recibo de Prestação de Serviços</div>

        <div style="text-align: right;">
          <span class="amount-highlight">VALOR: ${formattedAmount}</span>
        </div>

        <p>
          Recebemos de <strong>${escapeHtml(patientFullName)}</strong>
          no dia <strong>${dateFormatted}</strong>
          a importância de <strong>${formattedAmount}</strong>, referente à prestação de serviços de
          <strong>${escapeHtml(serviceDesc)}</strong>
          ${details.paymentMethod ? `através de <strong>${escapeHtml(details.paymentMethod)}</strong>` : ''}.
        </p>

        <p>
          Para maior clareza e firmeza do que foi recebido, firmamos o presente recibo.
        </p>
      </div>

      ${renderSignature(clinic)}
    </body>
    </html>
  `
}

export function generateEvolutionReportHtml(
  patient: Patient,
  images: (PatientImage & { base64: string | null })[],
  clinic: ClinicInfo,
  options?: {
    notes?: string
    includeSignature?: boolean
  }
): string {
  const patientFullName = `${patient.first_name} ${patient.last_name}`.trim()
  const age = calculateAge(patient.date_of_birth)
  const ageStr = age !== null ? `${age} anos` : '-'
  const birthFormatted = formatDate(patient.date_of_birth)
  const includeSignature = options?.includeSignature !== false

  // Sort images chronologically (oldest first for timeline progression)
  const sortedImages = [...images].sort((a, b) => {
    const dateA = a.photo_date || a.created_at || ''
    const dateB = b.photo_date || b.created_at || ''
    return dateA.localeCompare(dateB)
  })

  const getTagBadge = (tag?: string | null) => {
    const cleanTag = (tag || 'ANTES').toUpperCase()
    switch (cleanTag) {
      case 'DEPOIS':
        return `<span style="background: #ecfdf5; color: #047857; border: 1px solid #6ee7b7; font-weight: 700; font-size: 8pt; padding: 2px 7px; border-radius: 4px; text-transform: uppercase;">Depois</span>`
      case 'DURANTE':
        return `<span style="background: #fef3c7; color: #b45309; border: 1px solid #fcd34d; font-weight: 700; font-size: 8pt; padding: 2px 7px; border-radius: 4px; text-transform: uppercase;">Durante</span>`
      case 'RETORNO':
        return `<span style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; font-weight: 700; font-size: 8pt; padding: 2px 7px; border-radius: 4px; text-transform: uppercase;">Retorno</span>`
      case 'ANTES':
      default:
        return `<span style="background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; font-weight: 700; font-size: 8pt; padding: 2px 7px; border-radius: 4px; text-transform: uppercase;">Antes</span>`
    }
  }

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <title>Relatório de Evolução Fotográfica - ${escapeHtml(patientFullName)}</title>
      ${getBaseStyles()}
      <style>
        .photos-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
          margin-top: 10px;
        }
        .photo-card {
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #ffffff;
          padding: 8px;
          page-break-inside: avoid;
          display: flex;
          flex-direction: column;
        }
        .photo-img-wrap {
          width: 100%;
          height: 180px;
          background: #f1f5f9;
          border-radius: 6px;
          overflow: hidden;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .photo-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .photo-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }
        .photo-date {
          font-size: 8.5pt;
          font-weight: 700;
          color: #334155;
        }
        .photo-category {
          font-size: 8pt;
          color: #64748b;
          font-weight: 500;
        }
        .photo-desc {
          font-size: 8.5pt;
          color: #1e293b;
          line-height: 1.35;
          margin-top: 4px;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      ${renderHeader(clinic, 'Relatório de Evolução Fotográfica')}

      <!-- Patient Header -->
      <div class="section-card">
        <div class="section-title">Dados do Paciente</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Nome:</span>
            <span class="info-value"><strong>${escapeHtml(patientFullName)}</strong></span>
          </div>
          <div class="info-item">
            <span class="info-label">Nascimento:</span>
            <span class="info-value">${birthFormatted} (${ageStr})</span>
          </div>
          <div class="info-item">
            <span class="info-label">Telefone:</span>
            <span class="info-value">${escapeHtml(patient.phone || '-')}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Total de Fotos:</span>
            <span class="info-value">${sortedImages.length} registro(s) fotográfico(s)</span>
          </div>
        </div>
      </div>

      ${options?.notes ? `
        <div class="section-card">
          <div class="section-title">Observações Clínicas / Parecer Podológico</div>
          <div class="text-block">${escapeHtml(options.notes)}</div>
        </div>
      ` : ''}

      <!-- Photographic Evolution Grid -->
      <div class="section-card">
        <div class="section-title" style="display: flex; justify-content: space-between; align-items: center;">
          <span>Evolução Cronológica do Tratamento</span>
          <span style="font-size: 8pt; font-weight: normal; color: #64748b;">Ordem cronológica por data de atendimento</span>
        </div>

        ${sortedImages.length > 0 ? `
          <div class="photos-grid">
            ${sortedImages.map((img, idx) => {
              const rawDate = img.photo_date || img.created_at
              const dateDisplay = formatDate(rawDate)
              return `
                <div class="photo-card">
                  <div class="photo-img-wrap">
                    ${img.base64 ? `
                      <img class="photo-img" src="${img.base64}" alt="Foto ${idx + 1}" />
                    ` : `
                      <span style="color: #94a3b8; font-size: 8.5pt;">Imagem não disponível</span>
                    `}
                  </div>
                  <div class="photo-meta">
                    <div style="display: flex; align-items: center; gap: 6px;">
                      ${getTagBadge(img.tag)}
                      <span class="photo-date">${dateDisplay}</span>
                    </div>
                    ${img.category ? `<span class="photo-category">${escapeHtml(img.category)}</span>` : ''}
                  </div>
                  ${img.description ? `
                    <div class="photo-desc">"${escapeHtml(img.description)}"</div>
                  ` : ''}
                </div>
              `
            }).join('')}
          </div>
        ` : `
          <div style="text-align: center; padding: 20px; color: #64748b; font-size: 9pt;">
            Nenhum registro fotográfico disponível para este paciente.
          </div>
        `}
      </div>

      ${includeSignature ? renderSignature(clinic) : ''}
    </body>
    </html>
  `
}
