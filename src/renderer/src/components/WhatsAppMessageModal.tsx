import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { 
  X, 
  Send, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  MessageCircle, 
  Sparkles,
  User,
  Phone
} from 'lucide-react'
import { format } from 'date-fns'

export interface WhatsAppMessageContext {
  patientId?: number | null
  patientName: string
  phone: string
  appointmentId?: number
  appointmentDate?: string
  appointmentTime?: string
  serviceType?: string
  reason?: 'reminder' | 'post_procedure' | 'birthday' | 'recall' | 'custom'
}

interface WhatsAppMessageModalProps {
  isOpen: boolean
  onClose: () => void
  context: WhatsAppMessageContext
  onSuccess?: () => void
}

export default function WhatsAppMessageModal({
  isOpen,
  onClose,
  context,
  onSuccess
}: WhatsAppMessageModalProps): React.JSX.Element | null {
  const [botStatus, setBotStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED'>('DISCONNECTED')
  const [clinicName, setClinicName] = useState('Clínica de Podologia')
  const [clinicAddress, setClinicAddress] = useState('')
  const [clinicPhone, setClinicPhone] = useState('')
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('reminder')
  const [messageText, setMessageText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sendSuccess, setSendSuccess] = useState(false)

  // Load WhatsApp status and clinic info
  useEffect(() => {
    if (!isOpen) return

    setSendError(null)
    setSendSuccess(false)

    window.api.getWhatsappStatus().then((res) => {
      setBotStatus(res.status)
    }).catch(console.error)

    const unsubscribe = window.api.onWhatsappStatus((data) => {
      setBotStatus(data.status)
    })

    Promise.all([
      window.api.getSetting('profile_clinic_name'),
      window.api.getSetting('profile_clinic_address'),
      window.api.getSetting('profile_clinic_phone'),
      window.api.getSetting('whatsapp_template')
    ]).then(([name, address, phone, savedTemplate]) => {
      if (name) setClinicName(name)
      if (address) setClinicAddress(address)
      if (phone) setClinicPhone(phone)

      // Set initial template
      applyTemplate(context.reason || 'reminder', {
        cName: name || 'Clínica de Podologia',
        cAddress: address || '',
        cPhone: phone || '',
        customTpl: savedTemplate || undefined
      })
    })

    return () => {
      unsubscribe()
    }
  }, [isOpen, context])

  if (!isOpen) return null

  const firstName = context.patientName ? context.patientName.trim().split(' ')[0] : 'Paciente'
  const dateFormatted = context.appointmentDate || format(new Date(), 'dd/MM/yyyy')
  const timeFormatted = context.appointmentTime || '09:00'
  const service = context.serviceType || 'Procedimento Podológico'

  const templatesList = [
    {
      id: 'reminder',
      name: '⏰ Lembrete & Confirmação',
      description: 'Lembrete de consulta com pedido de confirmação de presença',
      build: (cName: string, cAddr: string) => 
        `Olá ${firstName}! 👋\n\nPassando para lembrar do seu agendamento de *${service}* no *${cName}*:\n\n📅 Data: *${dateFormatted}*\n⏰ Horário: *${timeFormatted}*${cAddr ? `\n📍 Endereço: ${cAddr}` : ''}\n\nPodemos confirmar sua presença? Por favor, responda com *Sim* ou avise-nos se precisar reagendar. Obrigado!`
    },
    {
      id: 'post_procedure',
      name: '🩹 Cuidados Pós-Procedimento',
      description: 'Orientações pós-tratamento de unhas/pele',
      build: (cName: string) => 
        `Olá ${firstName}! 👣\n\nSeguem algumas orientações importantes após o seu procedimento no *${cName}*:\n\n1. Mantenha o curativo limpo e seco pelo tempo orientado.\n2. Evite calçados apertados ou de bico fino nos próximos dias.\n3. Aplique a medicação/pomada prescrita conforme indicado.\n4. Em caso de dor excessiva, inchaço ou calor local, entre em contato conosco imediatamente.\n\nDesejamos uma ótima recuperação! ✨`
    },
    {
      id: 'birthday',
      name: '🎂 Parabéns Aniversariante',
      description: 'Mensagem carinhosa de aniversário para o paciente',
      build: (cName: string) => 
        `Parabéns, ${firstName}! 🎉🎂✨\n\nToda a equipe do *${cName}* deseja a você um feliz aniversário, repleto de saúde, realizações e muitos passos firmes rumo aos seus sonhos!\n\nPara comemorar, preparamos um carinho especial: apresente esta mensagem em seu próximo atendimento para um desconto exclusivo em nossos cuidados de podologia. Um grande abraço!`
    },
    {
      id: 'recall',
      name: '📅 Retorno Preventivo',
      description: 'Convite amigável para revisão periódica dos pés',
      build: (cName: string) => 
        `Olá ${firstName}! Como estão seus pés? 👣\n\nNotamos que já faz algum tempo desde a sua última avaliação no *${cName}*. Para manter a saúde, o conforto e prevenir problemas como unhas encravadas e calosidades, recomendamos uma revisão preventiva a cada 30 a 45 dias.\n\nPodemos agendar um horário confortável para você esta semana? Ficaremos muito felizes em recebê-lo(a)!`
    },
    {
      id: 'custom',
      name: '✍️ Mensagem Livre',
      description: 'Comece um texto em branco com saudação pronta',
      build: (cName: string) => 
        `Olá ${firstName}! Tudo bem? Aqui é do *${cName}*.\n\n`
    }
  ]

  const applyTemplate = (key: string, overrides?: { cName?: string; cAddress?: string; cPhone?: string; customTpl?: string }) => {
    setSelectedTemplateKey(key)
    const cName = overrides?.cName || clinicName
    const cAddr = overrides?.cAddress || clinicAddress

    if (key === 'reminder' && overrides?.customTpl) {
      // Use saved template if available
      let filled = overrides.customTpl
        .replace(/{nome}/g, context.patientName)
        .replace(/{primeiro_nome}/g, firstName)
        .replace(/{data}/g, dateFormatted)
        .replace(/{hora}/g, timeFormatted)
        .replace(/{procedimento}/g, service)
        .replace(/{clinica}/g, cName)
        .replace(/{endereco}/g, cAddr)
        .replace(/{telefone}/g, overrides?.cPhone || clinicPhone)
      setMessageText(filled)
      return
    }

    const tpl = templatesList.find(t => t.id === key)
    if (tpl) {
      setMessageText(tpl.build(cName, cAddr))
    }
  }

  const cleanPhoneForWeb = (rawPhone: string) => {
    let clean = rawPhone.replace(/\D/g, '')
    if (clean.startsWith('0')) clean = clean.substring(1)
    if (clean.length === 10 || clean.length === 11) {
      clean = '55' + clean
    }
    return clean
  }

  const handleSendRobot = async () => {
    if (!messageText.trim()) {
      setSendError('Por favor, digite a mensagem antes de enviar.')
      return
    }

    if (!context.phone) {
      setSendError('O paciente não possui telefone cadastrado.')
      return
    }

    setIsSending(true)
    setSendError(null)

    try {
      const res = await window.api.sendCustomPatientMessage(
        context.phone,
        messageText,
        context.appointmentId
      )

      if (res.success) {
        setSendSuccess(true)
        if (onSuccess) onSuccess()
        setTimeout(() => {
          onClose()
        }, 1500)
      } else {
        setSendError(res.error || 'Não foi possível enviar a mensagem via WhatsApp.')
      }
    } catch (err: any) {
      setSendError(err?.message || 'Erro inesperado ao enviar mensagem.')
    } finally {
      setIsSending(false)
    }
  }

  const handleOpenWhatsAppWeb = () => {
    if (!context.phone) {
      setSendError('O paciente não possui telefone cadastrado.')
      return
    }
    const cleanNum = cleanPhoneForWeb(context.phone)
    if (!cleanNum) {
      setSendError('Telefone do paciente inválido.')
      return
    }
    const encodedText = encodeURIComponent(messageText)
    const url = `https://wa.me/${cleanNum}?text=${encodedText}`
    window.api.openExternalBrowser(url)
    
    // Mark appointment as sent if applicable
    if (context.appointmentId) {
      window.api.sendCustomPatientMessage(context.phone, messageText, context.appointmentId).catch(() => {})
    }

    setSendSuccess(true)
    if (onSuccess) onSuccess()
    setTimeout(() => {
      onClose()
    }, 1200)
  }

  const isConnected = botStatus === 'CONNECTED'

  return createPortal(
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div 
        className="glass-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '720px',
          maxWidth: '95vw',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem',
          borderRadius: '16px',
          background: 'white',
          boxShadow: '0 20px 45px rgba(0,0,0,0.18)',
          animation: 'pageFadeInUp 0.22s ease-out',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--surface-border)',
          paddingBottom: '0.85rem',
          marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#25D366',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <MessageCircle size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                Central WhatsApp
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px', fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <User size={12} /> {context.patientName || 'Paciente'}
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>•</span>
                <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Phone size={12} /> {context.phone || 'Sem telefone'}
                </span>
              </div>
            </div>
          </div>

          <button 
            type="button" 
            className="modal-close-btn" 
            onClick={onClose}
            title="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body: Two columns (Left: templates & editor, Right: WhatsApp live preview) */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1.1fr 1fr', 
          gap: '1.25rem', 
          flex: 1, 
          minHeight: 0, 
          overflowY: 'auto',
          paddingRight: '4px'
        }}>
          {/* Left Column: Template selection and editing */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* Quick Templates Buttons */}
            <div>
              <label style={{ 
                fontSize: '0.8rem', 
                fontWeight: 600, 
                color: 'var(--text-primary)', 
                marginBottom: '0.4rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.35rem' 
              }}>
                <Sparkles size={13} color="var(--accent-color)" /> Modelos Prontos
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {templatesList.map((tpl) => {
                  const isSelected = selectedTemplateKey === tpl.id
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => applyTemplate(tpl.id)}
                      style={{
                        padding: '0.4rem 0.65rem',
                        fontSize: '0.76rem',
                        fontWeight: isSelected ? 700 : 500,
                        borderRadius: '8px',
                        border: isSelected ? '1.5px solid #25D366' : '1px solid var(--surface-border)',
                        background: isSelected ? 'rgba(37, 211, 102, 0.1)' : 'var(--surface-color)',
                        color: isSelected ? '#15803d' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      title={tpl.description}
                    >
                      {tpl.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Message Textarea */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '180px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Mensagem Personalizada:
                </label>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  {messageText.length} caracteres
                </span>
              </div>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={8}
                className="form-control"
                style={{
                  fontSize: '0.85rem',
                  lineHeight: '1.45',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  resize: 'none',
                  flex: 1
                }}
                placeholder="Escreva a mensagem aqui..."
              />
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                Dica: Você pode usar <strong>*negrito*</strong> e emojis do WhatsApp normalmente.
              </div>
            </div>
          </div>

          {/* Right Column: WhatsApp Smartphone Live Chat Bubble Preview */}
          <div style={{
            background: '#e5ddd5',
            backgroundImage: 'radial-gradient(rgba(0,0,0,0.06) 1px, transparent 1px)',
            backgroundSize: '16px 16px',
            borderRadius: '14px',
            border: '1px solid rgba(0,0,0,0.1)',
            padding: '1.25rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Mock Chat Header */}
            <div style={{
              background: '#075e54',
              color: 'white',
              margin: '-1.25rem -1rem 1rem -1rem',
              padding: '0.65rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: '#ece5dd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#555',
                fontWeight: 600,
                fontSize: '0.8rem'
              }}>
                {firstName.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.84rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {context.patientName || 'Paciente'}
                </div>
                <div style={{ fontSize: '0.68rem', opacity: 0.85 }}>online</div>
              </div>
            </div>

            {/* Mock WhatsApp Bubble */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, overflowY: 'auto' }}>
              <div style={{
                alignSelf: 'flex-end',
                background: '#d9fdd3',
                color: '#111b21',
                padding: '0.65rem 0.85rem 0.4rem 0.85rem',
                borderRadius: '8px 0px 8px 8px',
                maxWidth: '92%',
                boxShadow: '0 1px 1px rgba(0,0,0,0.13)',
                fontSize: '0.83rem',
                lineHeight: '1.4',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {messageText || (
                  <span style={{ color: '#888', fontStyle: 'italic' }}>
                    Sua mensagem aparecerá aqui em tempo real...
                  </span>
                )}
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: '3px',
                  marginTop: '0.2rem',
                  fontSize: '0.68rem',
                  color: '#667781'
                }}>
                  <span>{format(new Date(), 'HH:mm')}</span>
                  <span style={{ color: '#53bdeb', fontWeight: 'bold' }}>✓✓</span>
                </div>
              </div>
            </div>

            {/* Connection Status Banner in Preview */}
            <div style={{
              marginTop: '0.75rem',
              padding: '0.45rem 0.65rem',
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(4px)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.74rem',
              border: '1px solid rgba(0,0,0,0.06)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: isConnected ? '#10b981' : '#94a3b8'
                }} />
                <span style={{ fontWeight: 600, color: isConnected ? '#15803d' : '#64748b' }}>
                  {isConnected ? 'Robô Conectado' : 'Robô Desconectado'}
                </span>
              </div>
              <span style={{ color: '#64748b' }}>
                {isConnected ? 'Envio direto em 1 clique' : 'Disponível via WhatsApp Web'}
              </span>
            </div>
          </div>
        </div>

        {/* Feedback alerts */}
        {sendError && (
          <div style={{
            marginTop: '0.85rem',
            padding: '0.65rem 0.85rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--danger-color)',
            borderRadius: '8px',
            color: '#dc2626',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            <AlertCircle size={15} /> {sendError}
          </div>
        )}

        {sendSuccess && (
          <div style={{
            marginTop: '0.85rem',
            padding: '0.65rem 0.85rem',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid var(--success-color)',
            borderRadius: '8px',
            color: '#15803d',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            <CheckCircle2 size={15} /> Mensagem enviada com sucesso!
          </div>
        )}

        {/* Footer Actions */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid var(--surface-border)',
          paddingTop: '0.9rem',
          marginTop: '0.9rem'
        }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isSending}
            style={{ fontSize: '0.84rem' }}
          >
            Cancelar
          </button>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            {/* Alternative: Open in WhatsApp Web */}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleOpenWhatsAppWeb}
              disabled={isSending || !context.phone}
              style={{
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: '#0369a1',
                borderColor: 'rgba(3, 105, 161, 0.3)'
              }}
              title="Abre o WhatsApp no seu navegador ou aplicativo com o texto preenchido"
            >
              <ExternalLink size={14} /> Abrir no WhatsApp Web
            </button>

            {/* Primary: Send via connected robot */}
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSendRobot}
              disabled={isSending || !context.phone || !isConnected}
              style={{
                fontSize: '0.84rem',
                background: isConnected ? '#16a34a' : 'var(--text-secondary)',
                borderColor: isConnected ? '#16a34a' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                opacity: (!isConnected || !context.phone) ? 0.6 : 1,
                cursor: (!isConnected || !context.phone) ? 'not-allowed' : 'pointer'
              }}
              title={!isConnected ? 'Conecte o robô WhatsApp nas Configurações para envio automático direto' : 'Enviar agora pelo robô conectado'}
            >
              <Send size={14} className={isSending ? 'spin' : ''} />
              <span>{isSending ? 'Enviando...' : 'Enviar pelo Robô'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
