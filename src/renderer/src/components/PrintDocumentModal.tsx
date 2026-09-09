import { useState, useEffect, useMemo, useRef } from 'react'
import {
  X,
  Printer,
  FileDown,
  FileText,
  ClipboardList,
  Award,
  Receipt
} from 'lucide-react'
import { Patient, PodiatryHistoryForm } from '../../../shared/types'
import {
  ClinicInfo,
  generateFullRecordHtml,
  generateConsultationHtml,
  generateAttendanceCertificateHtml,
  generatePaymentReceiptHtml
} from '../utils/pdfTemplates'

export type DocumentType = 'full_record' | 'consultation' | 'certificate' | 'receipt'

interface PrintDocumentModalProps {
  patient: Patient
  forms?: PodiatryHistoryForm[]
  currentForm?: PodiatryHistoryForm
  defaultDocType?: DocumentType
  onClose: () => void
}

export default function PrintDocumentModal({
  patient,
  forms = [],
  currentForm,
  defaultDocType,
  onClose
}: PrintDocumentModalProps) {
  // Determine initial document type
  const initialType: DocumentType = defaultDocType || (currentForm ? 'consultation' : 'full_record')
  const [docType, setDocType] = useState<DocumentType>(initialType)

  // Clinic information
  const [clinic, setClinic] = useState<ClinicInfo>({
    name: '',
    address: '',
    phone: '',
    professionalName: '',
    logoBase64: null
  })

  // Document custom options
  const [includeLogo, setIncludeLogo] = useState(true)
  const [includeAlerts, setIncludeAlerts] = useState(true)
  const [includeFootMap, setIncludeFootMap] = useState(true)
  const [includeSignature, setIncludeSignature] = useState(true)

  // Specific state for Attendance Certificate
  const [certDate, setCertDate] = useState(new Date().toISOString().split('T')[0])
  const [certStartTime, setCertStartTime] = useState('14:00')
  const [certEndTime, setCertEndTime] = useState('15:00')
  const [certPurpose, setCertPurpose] = useState('atendimento e procedimento podológico')

  // Specific state for Payment Receipt
  const [receiptAmount, setReceiptAmount] = useState<number>(120)
  const [receiptMethod, setReceiptMethod] = useState('Pix')
  const [receiptDesc, setReceiptDesc] = useState('procedimento podológico clínico')
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0])

  // Processing state
  const [isExporting, setIsExporting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusType, setStatusType] = useState<'success' | 'error'>('success')
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Load clinic information on mount
  useEffect(() => {
    Promise.all([
      window.api?.getSetting?.('profile_clinic_name'),
      window.api?.getSetting?.('profile_clinic_address'),
      window.api?.getSetting?.('profile_clinic_phone'),
      window.api?.getSetting?.('profile_professional_name'),
      window.api?.getClinicLogoBase64?.()
    ]).then(([name, address, phone, professionalName, logoBase64]) => {
      setClinic({
        name: name || '',
        address: address || '',
        phone: phone || '',
        professionalName: professionalName || '',
        logoBase64: logoBase64 || null
      })
    }).catch(console.error)
  }, [])

  // Effective clinic info with toggleable logo
  const effectiveClinic = useMemo<ClinicInfo>(() => ({
    ...clinic,
    logoBase64: includeLogo ? clinic.logoBase64 : null
  }), [clinic, includeLogo])

  // Generate HTML based on active configuration
  const generatedHtml = useMemo<string>(() => {
    switch (docType) {
      case 'full_record':
        return generateFullRecordHtml(patient, forms, effectiveClinic, {
          includeAlerts,
          includeSignature
        })
      case 'consultation':
        if (currentForm) {
          return generateConsultationHtml(patient, currentForm, effectiveClinic, {
            includeFootMap,
            includeSignature
          })
        } else if (forms.length > 0) {
          return generateConsultationHtml(patient, forms[0], effectiveClinic, {
            includeFootMap,
            includeSignature
          })
        }
        return generateFullRecordHtml(patient, forms, effectiveClinic, {
          includeAlerts,
          includeSignature
        })
      case 'certificate':
        return generateAttendanceCertificateHtml(patient, effectiveClinic, {
          date: certDate,
          startTime: certStartTime,
          endTime: certEndTime,
          purpose: certPurpose
        })
      case 'receipt':
        return generatePaymentReceiptHtml(patient, effectiveClinic, {
          amount: Number(receiptAmount) || 0,
          paymentMethod: receiptMethod,
          description: receiptDesc,
          date: receiptDate
        })
      default:
        return ''
    }
  }, [
    docType,
    patient,
    forms,
    currentForm,
    effectiveClinic,
    includeAlerts,
    includeFootMap,
    includeSignature,
    certDate,
    certStartTime,
    certEndTime,
    certPurpose,
    receiptAmount,
    receiptMethod,
    receiptDesc,
    receiptDate
  ])

  // Get sanitized default file name for download
  const defaultFileName = useMemo<string>(() => {
    const pName = `${patient.first_name}_${patient.last_name}`.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const today = new Date().toISOString().split('T')[0]
    switch (docType) {
      case 'full_record':
        return `prontuario_${pName}_${today}.pdf`
      case 'consultation':
        return `atendimento_${pName}_${today}.pdf`
      case 'certificate':
        return `declaracao_comparecimento_${pName}_${today}.pdf`
      case 'receipt':
        return `recibo_${pName}_${today}.pdf`
    }
  }, [docType, patient])

  // Handler: Export to PDF file
  const handleExportPdf = async () => {
    setIsExporting(true)
    setStatusMessage(null)
    try {
      // 1. Tenta a API direta do preload
      if (typeof window.api?.exportHtmlToPdf === 'function') {
        const res = await window.api.exportHtmlToPdf(generatedHtml, defaultFileName)
        if (res.success) {
          setStatusType('success')
          setStatusMessage('PDF gerado e salvo com sucesso!')
          setTimeout(() => setStatusMessage(null), 3500)
          return
        } else if (res.canceled) {
          return
        } else {
          setStatusType('error')
          setStatusMessage(res.error || 'Falha ao gerar o arquivo PDF.')
          return
        }
      }

      // 2. Fallback via ipcRenderer (caso o preload ainda não tenha recarregado)
      if (window.electron?.ipcRenderer?.invoke) {
        try {
          const res = await window.electron.ipcRenderer.invoke('exportHtmlToPdf', generatedHtml, defaultFileName)
          if (res && res.success) {
            setStatusType('success')
            setStatusMessage('PDF gerado e salvo com sucesso!')
            setTimeout(() => setStatusMessage(null), 3500)
            return
          } else if (res && res.canceled) {
            return
          }
        } catch {
          // Segue para o fallback visual do Chromium
        }
      }

      // 3. Fallback nativo do Chromium (abre diálogo de impressão com opção "Salvar como PDF")
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.focus()
        iframeRef.current.contentWindow.print()
        setStatusType('success')
        setStatusMessage('Dica: Selecione "Salvar como PDF" no diálogo de impressão.')
        setTimeout(() => setStatusMessage(null), 5000)
        return
      }

      setStatusType('error')
      setStatusMessage('Pressione Ctrl+R ou reinicie o aplicativo para carregar as novas funções.')
    } catch (err: any) {
      setStatusType('error')
      setStatusMessage(err.message || 'Erro ao exportar PDF.')
    } finally {
      setIsExporting(false)
    }
  }

  // Handler: Direct Native Print
  const handlePrint = async () => {
    setIsExporting(true)
    setStatusMessage(null)
    try {
      if (typeof window.api?.printHtml === 'function') {
        const res = await window.api.printHtml(generatedHtml)
        if (res.success) {
          setStatusType('success')
          setStatusMessage('Documento enviado para a impressora!')
          setTimeout(() => setStatusMessage(null), 3500)
          return
        }
      }

      if (window.electron?.ipcRenderer?.invoke) {
        try {
          const res = await window.electron.ipcRenderer.invoke('printHtml', generatedHtml)
          if (res && res.success) {
            setStatusType('success')
            setStatusMessage('Documento enviado para a impressora!')
            setTimeout(() => setStatusMessage(null), 3500)
            return
          }
        } catch {
          // Segue para fallback do iframe
        }
      }

      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.focus()
        iframeRef.current.contentWindow.print()
        return
      }
    } catch (err: any) {
      setStatusType('error')
      setStatusMessage(err.message || 'Falha ao acionar a impressora.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        backdropFilter: 'blur(6px)',
        padding: '1rem'
      }}
    >
      <div
        className="glass-card"
        style={{
          width: '1100px',
          maxWidth: '96vw',
          height: '92vh',
          background: '#ffffff',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          animation: 'zoomIn 0.2s ease-out'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--surface-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#ffffff'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(14, 145, 168, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-color)'
              }}
            >
              <Printer size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Emissão de Documentos & Prontuário em PDF
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Paciente: <strong>{patient.first_name} {patient.last_name}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {statusMessage && (
              <span
                style={{
                  fontSize: '0.8rem',
                  color: statusType === 'success' ? 'var(--success-color)' : 'var(--danger-color)',
                  fontWeight: 600
                }}
              >
                {statusMessage}
              </span>
            )}
            <button
              className="modal-close-btn"
              onClick={onClose}
              style={{ padding: '0.4rem', borderRadius: '6px' }}
              title="Fechar (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body: Left Controls & Right Live Preview */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left Panel: Configuration Options */}
          <div
            style={{
              width: '360px',
              borderRight: '1px solid var(--surface-border)',
              background: '#f8fafc',
              padding: '1.25rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}
          >
            {/* Document Type Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                Tipo de Documento:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => setDocType('full_record')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: docType === 'full_record' ? 'var(--accent-color)' : 'var(--surface-border)',
                    background: docType === 'full_record' ? '#ffffff' : 'transparent',
                    color: docType === 'full_record' ? 'var(--accent-color)' : 'var(--text-primary)',
                    fontWeight: docType === 'full_record' ? 700 : 500,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <FileText size={16} />
                  <div>
                    <div>Prontuário Completo</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 400 }}>Anamnese + todas as evoluções</div>
                  </div>
                </button>

                {(currentForm || forms.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setDocType('consultation')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: '0.6rem 0.8rem',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: docType === 'consultation' ? 'var(--accent-color)' : 'var(--surface-border)',
                      background: docType === 'consultation' ? '#ffffff' : 'transparent',
                      color: docType === 'consultation' ? 'var(--accent-color)' : 'var(--text-primary)',
                      fontWeight: docType === 'consultation' ? 700 : 500,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <ClipboardList size={16} />
                    <div>
                      <div>Ficha de Atendimento & Home Care</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 400 }}>Procedimentos de hoje e cuidados</div>
                    </div>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setDocType('certificate')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: docType === 'certificate' ? 'var(--accent-color)' : 'var(--surface-border)',
                    background: docType === 'certificate' ? '#ffffff' : 'transparent',
                    color: docType === 'certificate' ? 'var(--accent-color)' : 'var(--text-primary)',
                    fontWeight: docType === 'certificate' ? 700 : 500,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <Award size={16} />
                  <div>
                    <div>Declaração de Comparecimento</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 400 }}>Comprovante formal de presença</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDocType('receipt')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: docType === 'receipt' ? 'var(--accent-color)' : 'var(--surface-border)',
                    background: docType === 'receipt' ? '#ffffff' : 'transparent',
                    color: docType === 'receipt' ? 'var(--accent-color)' : 'var(--text-primary)',
                    fontWeight: docType === 'receipt' ? 700 : 500,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <Receipt size={16} />
                  <div>
                    <div>Recibo de Pagamento</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 400 }}>Comprovante financeiro de serviço</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Dynamic Configuration per Document Type */}
            {docType === 'certificate' && (
              <div style={{ background: '#ffffff', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem' }}>
                  Dados do Comparecimento:
                </label>
                <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Data</label>
                  <input
                    type="date"
                    className="form-control"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
                    value={certDate}
                    onChange={(e) => setCertDate(e.target.value)}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.72rem' }}>Início</label>
                    <input
                      type="time"
                      className="form-control"
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
                      value={certStartTime}
                      onChange={(e) => setCertStartTime(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.72rem' }}>Término</label>
                    <input
                      type="time"
                      className="form-control"
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
                      value={certEndTime}
                      onChange={(e) => setCertEndTime(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Finalidade</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
                    value={certPurpose}
                    onChange={(e) => setCertPurpose(e.target.value)}
                  />
                </div>
              </div>
            )}

            {docType === 'receipt' && (
              <div style={{ background: '#ffffff', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem' }}>
                  Dados do Recibo:
                </label>
                <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
                    value={receiptAmount}
                    onChange={(e) => setReceiptAmount(Number(e.target.value))}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Forma de Pagamento</label>
                  <select
                    className="form-control"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
                    value={receiptMethod}
                    onChange={(e) => setReceiptMethod(e.target.value)}
                  >
                    <option value="Pix">Pix</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Transferência Bancária">Transferência Bancária</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Descrição do Serviço</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
                    value={receiptDesc}
                    onChange={(e) => setReceiptDesc(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Data</label>
                  <input
                    type="date"
                    className="form-control"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Inclusions & Toggles */}
            <div style={{ background: '#ffffff', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem' }}>
                Opções de Conteúdo:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.8rem' }}>
                {clinic.logoBase64 && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={includeLogo}
                      onChange={(e) => setIncludeLogo(e.target.checked)}
                    />
                    <span>Incluir Logotipo da Clínica</span>
                  </label>
                )}

                {docType === 'full_record' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={includeAlerts}
                      onChange={(e) => setIncludeAlerts(e.target.checked)}
                    />
                    <span>Incluir Alertas (Diabetes / Alergias)</span>
                  </label>
                )}

                {docType === 'consultation' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={includeFootMap}
                      onChange={(e) => setIncludeFootMap(e.target.checked)}
                    />
                    <span>Incluir Podograma (Mapa do Pé)</span>
                  </label>
                )}

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={includeSignature}
                    onChange={(e) => setIncludeSignature(e.target.checked)}
                  />
                  <span>Linha para Carimbo e Assinatura</span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExportPdf}
                disabled={isExporting}
                style={{ width: '100%', padding: '0.75rem', fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <FileDown size={18} /> {isExporting ? 'Processando...' : 'Salvar em PDF'}
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handlePrint}
                disabled={isExporting}
                style={{ width: '100%', padding: '0.65rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <Printer size={16} /> Imprimir Agora
              </button>
            </div>
          </div>

          {/* Right Panel: Live Document Preview */}
          <div
            style={{
              flex: 1,
              background: '#334155',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              overflow: 'hidden'
            }}
          >
            <div style={{ width: '100%', maxWidth: '780px', height: '100%', background: '#ffffff', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
              <iframe
                ref={iframeRef}
                title="Pré-visualização do Documento"
                srcDoc={generatedHtml}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  background: '#ffffff'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
