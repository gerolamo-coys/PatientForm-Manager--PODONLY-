import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { 
  X, 
  Bell, 
  Clock, 
  Cake, 
  DollarSign, 
  AlertTriangle, 
  MessageCircle, 
  Calendar, 
  User, 
  ExternalLink,
  CheckCircle2,
  Filter
} from 'lucide-react'
import type { ClinicalNotifications } from '../../../shared/types'
import { format } from 'date-fns'

interface ClinicalNotificationsModalProps {
  isOpen: boolean
  onClose: () => void
  notifications: ClinicalNotifications | null
  onOpenWhatsapp: (ctx: {
    patientName: string
    phone: string
    patientId?: number | null
    appointmentId?: number
    reason: 'reminder' | 'post_procedure' | 'birthday' | 'recall' | 'custom'
  }) => void
  onNavigatePatient: (patientId: number) => void
  onNavigateCalendar: (dateIso?: string) => void
  onNavigateFinancial: () => void
}

type TabType = 'all' | 'recalls' | 'birthdays' | 'receivables' | 'conflicts'

export default function ClinicalNotificationsModal({
  isOpen,
  onClose,
  notifications,
  onOpenWhatsapp,
  onNavigatePatient,
  onNavigateCalendar,
  onNavigateFinancial
}: ClinicalNotificationsModalProps): React.JSX.Element | null {
  const [activeTab, setActiveTab] = useState<TabType>('all')

  if (!isOpen || !notifications) return null

  const {
    overdueRecalls,
    upcomingBirthdays,
    dueReceivables,
    calendarConflicts,
    hasGoogleSyncError,
    googleSyncErrorMessage,
    totalAlertsCount
  } = notifications

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const formatTimeSlot = (startIso: string, endIso: string) => {
    try {
      const s = new Date(startIso)
      const e = new Date(endIso)
      return `${format(s, 'dd/MM HH:mm')} às ${format(e, 'HH:mm')}`
    } catch {
      return startIso
    }
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div 
        className="glass-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '760px',
          maxWidth: '95vw',
          maxHeight: '90vh',
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
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: totalAlertsCount > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: totalAlertsCount > 0 ? '#ef4444' : '#10b981'
            }}>
              <Bell size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.18rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                  Central de Notificações &amp; Alertas Clínicos
                </h3>
                {totalAlertsCount > 0 && (
                  <span style={{
                    background: '#ef4444',
                    color: 'white',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.55rem',
                    borderRadius: '20px'
                  }}>
                    {totalAlertsCount} {totalAlertsCount === 1 ? 'pendência' : 'pendências'}
                  </span>
                )}
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Acompanhe retornos preventivos, aniversariantes da semana, contas a receber e alertas de agenda.
              </p>
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

        {/* Filter Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.4rem',
          overflowX: 'auto',
          paddingBottom: '0.6rem',
          borderBottom: '1px solid var(--surface-border)',
          marginBottom: '1rem'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            style={{
              padding: '0.45rem 0.8rem',
              borderRadius: '8px',
              border: activeTab === 'all' ? '1.5px solid var(--brand-dark)' : '1px solid var(--surface-border)',
              background: activeTab === 'all' ? 'rgba(5, 129, 157, 0.08)' : 'var(--surface-color)',
              color: activeTab === 'all' ? 'var(--brand-dark)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'all' ? 700 : 500,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              whiteSpace: 'nowrap'
            }}
          >
            <Filter size={13} />
            <span>Todos ({totalAlertsCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('recalls')}
            style={{
              padding: '0.45rem 0.8rem',
              borderRadius: '8px',
              border: activeTab === 'recalls' ? '1.5px solid #0284c7' : '1px solid var(--surface-border)',
              background: activeTab === 'recalls' ? 'rgba(2, 132, 199, 0.08)' : 'var(--surface-color)',
              color: activeTab === 'recalls' ? '#0284c7' : 'var(--text-secondary)',
              fontWeight: activeTab === 'recalls' ? 700 : 500,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              whiteSpace: 'nowrap'
            }}
          >
            <Clock size={13} />
            <span>Retornos Atrasados ({overdueRecalls.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('birthdays')}
            style={{
              padding: '0.45rem 0.8rem',
              borderRadius: '8px',
              border: activeTab === 'birthdays' ? '1.5px solid #f59e0b' : '1px solid var(--surface-border)',
              background: activeTab === 'birthdays' ? 'rgba(245, 158, 11, 0.08)' : 'var(--surface-color)',
              color: activeTab === 'birthdays' ? '#b45309' : 'var(--text-secondary)',
              fontWeight: activeTab === 'birthdays' ? 700 : 500,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              whiteSpace: 'nowrap'
            }}
          >
            <Cake size={13} />
            <span>Aniversariantes ({upcomingBirthdays.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('receivables')}
            style={{
              padding: '0.45rem 0.8rem',
              borderRadius: '8px',
              border: activeTab === 'receivables' ? '1.5px solid #16a34a' : '1px solid var(--surface-border)',
              background: activeTab === 'receivables' ? 'rgba(22, 163, 74, 0.08)' : 'var(--surface-color)',
              color: activeTab === 'receivables' ? '#16a34a' : 'var(--text-secondary)',
              fontWeight: activeTab === 'receivables' ? 700 : 500,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              whiteSpace: 'nowrap'
            }}
          >
            <DollarSign size={13} />
            <span>Contas a Receber ({dueReceivables.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('conflicts')}
            style={{
              padding: '0.45rem 0.8rem',
              borderRadius: '8px',
              border: activeTab === 'conflicts' ? '1.5px solid #ef4444' : '1px solid var(--surface-border)',
              background: activeTab === 'conflicts' ? 'rgba(239, 68, 68, 0.08)' : 'var(--surface-color)',
              color: activeTab === 'conflicts' ? '#dc2626' : 'var(--text-secondary)',
              fontWeight: activeTab === 'conflicts' ? 700 : 500,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              whiteSpace: 'nowrap'
            }}
          >
            <AlertTriangle size={13} />
            <span>Agenda &amp; Sistema ({calendarConflicts.length + (hasGoogleSyncError ? 1 : 0)})</span>
          </button>
        </div>

        {/* Notifications Scroll List */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Empty State */}
          {totalAlertsCount === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '3rem 1.5rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981'
              }}>
                <CheckCircle2 size={32} />
              </div>
              <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.05rem' }}>Tudo em dia por aqui!</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', maxWidth: '380px', lineHeight: 1.5 }}>
                Não há alertas críticos pendentes. Seus retornos, parcelas e compromissos estão perfeitamente alinhados.
              </p>
            </div>
          )}

          {/* Section 1: Google Sync Alert */}
          {(activeTab === 'all' || activeTab === 'conflicts') && hasGoogleSyncError && (
            <div style={{
              padding: '0.85rem 1rem',
              borderRadius: '12px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              background: 'rgba(239, 68, 68, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <AlertTriangle size={20} color="#dc2626" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#dc2626' }}>
                    Sessão do Google Agenda Desconectada
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {googleSyncErrorMessage || 'As credenciais expiraram. Conecte novamente nas Configurações para manter a sincronização ativa.'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  onClose()
                  window.dispatchEvent(new CustomEvent('podonly-open-settings'))
                }}
                style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#dc2626' }}
              >
                Reconectar Google
              </button>
            </div>
          )}

          {/* Section 2: Calendar Conflicts */}
          {(activeTab === 'all' || activeTab === 'conflicts') && calendarConflicts.map((conf) => (
            <div 
              key={`conf-${conf.id1}-${conf.id2}`}
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                background: 'rgba(254, 242, 242, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <AlertTriangle size={18} color="#ef4444" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#b91c1c' }}>
                    Conflito de Horário Sobreposto
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    <strong>{conf.title1}</strong> e <strong>{conf.title2}</strong> estão no mesmo intervalo ({formatTimeSlot(conf.start_time, conf.end_time)}).
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  onClose()
                  onNavigateCalendar(conf.start_time)
                }}
                style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Calendar size={13} /> Ajustar Agenda
              </button>
            </div>
          ))}

          {/* Section 3: Overdue Patient Recalls */}
          {(activeTab === 'all' || activeTab === 'recalls') && overdueRecalls.length > 0 && (
            <div>
              {activeTab === 'all' && (
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Clock size={13} /> Pacientes com Retorno Preventivo Atrasado ({overdueRecalls.length})
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {overdueRecalls.map((recall) => (
                  <div
                    key={`recall-${recall.patient_id}`}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '12px',
                      border: '1px solid rgba(2, 132, 199, 0.18)',
                      background: 'rgba(240, 249, 255, 0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        background: 'rgba(2, 132, 199, 0.15)',
                        color: '#0284c7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.82rem'
                      }}>
                        {recall.first_name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                          {recall.first_name} {recall.last_name}
                        </div>
                        <div style={{ fontSize: '0.77rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Último procedimento: <strong>{recall.last_procedure_name}</strong> em {recall.last_procedure_date} (há <strong style={{ color: '#0284c7' }}>{recall.days_since_last_visit} dias</strong>).
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.45rem' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          onClose()
                          onNavigatePatient(recall.patient_id)
                        }}
                        style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        title="Abrir Prontuário do Paciente"
                      >
                        <User size={13} /> Prontuário
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          onClose()
                          onOpenWhatsapp({
                            patientId: recall.patient_id,
                            patientName: `${recall.first_name} ${recall.last_name}`.trim(),
                            phone: recall.phone || '',
                            reason: 'recall'
                          })
                        }}
                        style={{
                          fontSize: '0.78rem',
                          padding: '0.35rem 0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          color: '#16a34a',
                          borderColor: 'rgba(22, 163, 74, 0.35)',
                          background: 'rgba(22, 163, 74, 0.05)',
                          fontWeight: 600
                        }}
                        title="Convidar para retorno pelo WhatsApp"
                      >
                        <MessageCircle size={13} />
                        <span>Convidar Retorno</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Upcoming Birthdays */}
          {(activeTab === 'all' || activeTab === 'birthdays') && upcomingBirthdays.length > 0 && (
            <div style={{ marginTop: activeTab === 'all' ? '0.4rem' : 0 }}>
              {activeTab === 'all' && (
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Cake size={13} /> Aniversariantes da Semana ({upcomingBirthdays.length})
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {upcomingBirthdays.map((b) => (
                  <div
                    key={`bday-${b.id}`}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '12px',
                      border: b.is_today ? '1.5px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(245, 158, 11, 0.2)',
                      background: b.is_today ? 'linear-gradient(135deg, rgba(254, 243, 199, 0.85) 0%, rgba(253, 230, 138, 0.5) 100%)' : 'rgba(254, 252, 232, 0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span style={{ fontSize: '1.4rem' }}>{b.is_today ? '🎂' : '🎈'}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span>{b.first_name} {b.last_name}</span>
                          {b.is_today && (
                            <span style={{
                              background: '#f59e0b',
                              color: 'white',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '0.1rem 0.45rem',
                              borderRadius: '10px'
                            }}>
                              HOJE!
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.77rem', color: '#78350f', marginTop: '2px' }}>
                          Completa <strong>{b.age} anos</strong> em {b.birth_day_and_month}.
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        onClose()
                        onOpenWhatsapp({
                          patientId: b.id,
                          patientName: `${b.first_name} ${b.last_name}`.trim(),
                          phone: b.phone || '',
                          reason: 'birthday'
                        })
                      }}
                      style={{
                        fontSize: '0.78rem',
                        padding: '0.35rem 0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        background: 'white',
                        borderColor: 'rgba(245, 158, 11, 0.4)',
                        color: '#b45309',
                        fontWeight: 600
                      }}
                      title="Enviar mensagem de aniversário"
                    >
                      <MessageCircle size={13} color="#25D366" />
                      <span>Parabenizar</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 5: Due Receivables */}
          {(activeTab === 'all' || activeTab === 'receivables') && dueReceivables.length > 0 && (
            <div style={{ marginTop: activeTab === 'all' ? '0.4rem' : 0 }}>
              {activeTab === 'all' && (
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <DollarSign size={13} /> Contas a Receber / Parcelas Vencendo ({dueReceivables.length})
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {dueReceivables.map((rec) => (
                  <div
                    key={`rec-${rec.id}`}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '12px',
                      border: rec.is_overdue ? '1.5px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(22, 163, 74, 0.2)',
                      background: rec.is_overdue ? 'rgba(254, 242, 242, 0.6)' : 'rgba(240, 253, 244, 0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        background: rec.is_overdue ? 'rgba(239, 68, 68, 0.15)' : 'rgba(22, 163, 74, 0.15)',
                        color: rec.is_overdue ? '#dc2626' : '#15803d',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700
                      }}>
                        $
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span>{rec.patient_name}</span>
                          {rec.is_overdue ? (
                            <span style={{
                              background: '#ef4444',
                              color: 'white',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '0.1rem 0.45rem',
                              borderRadius: '10px'
                            }}>
                              ATRASADO
                            </span>
                          ) : (
                            <span style={{
                              background: '#16a34a',
                              color: 'white',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '0.1rem 0.45rem',
                              borderRadius: '10px'
                            }}>
                              VENCE HOJE
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.77rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {rec.description} • Valor: <strong style={{ color: '#15803d' }}>{formatCurrency(rec.amount)}</strong> • Vencimento: {new Date(rec.due_date).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.45rem' }}>
                      {rec.phone && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            onClose()
                            onOpenWhatsapp({
                              patientId: rec.patient_id,
                              patientName: rec.patient_name || 'Paciente',
                              phone: rec.phone || '',
                              reason: 'custom'
                            })
                          }}
                          style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#16a34a' }}
                          title="Enviar lembrete amigável via WhatsApp"
                        >
                          <MessageCircle size={13} /> Cobrança
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          onClose()
                          onNavigateFinancial()
                        }}
                        style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        title="Abrir no módulo financeiro"
                      >
                        <ExternalLink size={13} /> Financeiro
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid var(--surface-border)',
          paddingTop: '0.85rem',
          marginTop: '0.85rem'
        }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
            Atualizado automaticamente com base nos seus dados clínicos e financeiros.
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onClose}
            style={{ fontSize: '0.82rem', padding: '0.45rem 1.1rem' }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
