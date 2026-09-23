import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Calendar, 
  Users, 
  Plus, 
  Coffee, 
  Settings, 
  Clock, 
  RefreshCw, 
  TrendingUp, 
  CheckCircle2, 
  MessageCircle, 
  DollarSign, 
  ChevronRight, 
  Sparkles,
  User,
  ArrowUpRight,
  AlertCircle
} from 'lucide-react'
import { format, differenceInMinutes, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { FinancialSummary, AppointmentStatus } from '../../../shared/types'

export default function DashboardScreen(): React.JSX.Element {
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState<any[]>([])
  const [totalPatients, setTotalPatients] = useState(0)
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [profName, setProfName] = useState('')

  // WhatsApp Status
  const [botStatus, setBotStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED'>('DISCONNECTED')

  useEffect(() => {
    window.api.getWhatsappStatus().then((res) => {
      setBotStatus(res.status)
    }).catch(console.error)

    const unsubscribe = window.api.onWhatsappStatus((data) => {
      setBotStatus(data.status)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const getStatusDetails = () => {
    switch (botStatus) {
      case 'CONNECTED':
        return { label: 'Conectado', className: 'connected' }
      case 'CONNECTING':
        return { label: 'Conectando...', className: 'connecting' }
      case 'QR_READY':
        return { label: 'Aguardando QR', className: 'qr-ready' }
      case 'DISCONNECTED':
      default:
        return { label: 'Desconectado', className: 'disconnected' }
    }
  }

  const [sendingWhatsappId, setSendingWhatsappId] = useState<number | null>(null)
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null)
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const statusInfo = getStatusDetails()

  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    loadData()
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 15000)

    const handleSettingsUpdated = () => {
      loadData()
    }
    window.addEventListener('podonly-settings-updated', handleSettingsUpdated)

    return () => {
      clearInterval(timer)
      window.removeEventListener('podonly-settings-updated', handleSettingsUpdated)
    }
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const autoComp = await window.api.getSetting('auto_complete_past_appointments')
      if (autoComp === 'true') {
        try {
          await window.api.markPassedAppointmentsAsCompleted()
        } catch (autoErr) {
          console.error('Falha na auto-conclusão de consultas passadas:', autoErr)
        }
      }

      const todayStart = startOfDay(new Date()).toISOString()
      const todayEnd = endOfDay(new Date()).toISOString()

      const appts = await window.api.getAppointments(todayStart, todayEnd)
      const sortedAppts = appts.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      setAppointments(sortedAppts)

      const prof = await window.api.getSetting('profile_professional_name')
      setProfName(prof || '')

      const patients = await window.api.listPatients('alphabetical', '')
      setTotalPatients(patients.length)

      const monthStart = startOfMonth(new Date()).toISOString()
      const monthEnd = endOfMonth(new Date()).toISOString()
      const summary = await window.api.getFinancialSummary(monthStart, monthEnd)
      setFinancialSummary(summary)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSendReminder = async (e: React.MouseEvent, apptId: number, patientName: string) => {
    e.stopPropagation()
    setSendingWhatsappId(apptId)
    try {
      const res = await window.api.sendSingleAppointmentReminder(apptId)
      if (res.success) {
        showToast(`Lembrete enviado para ${patientName}!`, 'success')
      } else {
        showToast(res.error || 'Não foi possível enviar o lembrete.', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao enviar lembrete.', 'error')
    } finally {
      setSendingWhatsappId(null)
    }
  }

  const handleToggleStatus = async (e: React.MouseEvent, apptId: number, currentStatus?: string) => {
    e.stopPropagation()
    setUpdatingStatusId(apptId)
    const newStatus: AppointmentStatus = currentStatus === 'COMPLETED' ? 'SCHEDULED' : 'COMPLETED'
    try {
      const appt = appointments.find(a => a.id === apptId)
      if (!appt) return
      await window.api.updateAppointment(apptId, { ...appt, status: newStatus })
      setAppointments(prev => prev.map(a => a.id === apptId ? { ...a, status: newStatus } : a))
      showToast(newStatus === 'COMPLETED' ? 'Consulta marcada como concluída!' : 'Consulta reaberta!', 'success')
    } catch (err: any) {
      showToast('Erro ao atualizar status.', 'error')
    } finally {
      setUpdatingStatusId(null)
    }
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return { label: 'Em andamento', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.12)', border: 'rgba(2, 132, 199, 0.25)' }
      case 'COMPLETED':
        return { label: 'Concluído', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.12)', border: 'rgba(22, 163, 74, 0.25)' }
      case 'CONFIRMED':
        return { label: 'Confirmado', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.12)', border: 'rgba(2, 132, 199, 0.25)' }
      case 'MISSED':
        return { label: 'Faltou', color: '#dc2626', bg: 'rgba(220, 38, 38, 0.12)', border: 'rgba(220, 38, 38, 0.25)' }
      case 'CANCELLED':
        return { label: 'Cancelado', color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)', border: 'rgba(100, 116, 139, 0.25)' }
      case 'SCHEDULED':
      default:
        return { label: 'Agendado', color: 'var(--accent-color)', bg: 'rgba(14, 145, 168, 0.12)', border: 'rgba(14, 145, 168, 0.25)' }
    }
  }

  const now = currentTime
  const nowMs = now.getTime()

  // Uma consulta é considerada em andamento se o horário atual estiver rigorosamente dentro do intervalo
  // [start_time, end_time) ou com status IN_PROGRESS, exceto se cancelada/faltou
  const isApptInProgress = (a: any) => {
    if (a.status === 'CANCELLED' || a.status === 'MISSED' || a.status === 'NO_SHOW') return false
    const s = new Date(a.start_time).getTime()
    const e = new Date(a.end_time).getTime()
    return (s <= nowMs && nowMs < e) || a.status === 'IN_PROGRESS'
  }

  const completedCount = appointments.filter(a => a.status === 'COMPLETED' && !isApptInProgress(a)).length
  const pendingCount = appointments.filter(a => (a.status !== 'COMPLETED' || isApptInProgress(a)) && a.status !== 'CANCELLED').length

  // Um agendamento é o "próximo" se for estritamente futuro (start_time > now) e não estiver concluído/cancelado
  const nextAppt = appointments.find(a => {
    const s = new Date(a.start_time).getTime()
    return s > nowMs && a.status !== 'COMPLETED' && a.status !== 'CANCELLED'
  })
  const nextApptId = nextAppt?.id || null

  const getNextApptCountdown = (appt: any) => {
    const start = new Date(appt.start_time)
    const diff = differenceInMinutes(start, now)
    if (diff <= 0) return 'Agora'
    if (diff < 60) return `Em ${diff} min`
    const hours = Math.floor(diff / 60)
    const mins = diff % 60
    return mins > 0 ? `Em ${hours}h ${mins}m` : `Em ${hours}h`
  }

  const renderTimeline = () => {
    if (appointments.length === 0) {
      return (
        <div className="empty-state" style={{ padding: '3.5rem 1.5rem', background: 'rgba(255, 255, 255, 0.5)', borderRadius: '16px', border: '1px solid var(--surface-border)' }}>
          <Calendar size={52} color="var(--accent-color)" style={{ opacity: 0.8, marginBottom: '0.5rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.4rem 0', color: 'var(--text-primary)' }}>Nenhum agendamento para hoje</h3>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Você tem a agenda livre no dia de hoje.</p>
          <button className="btn btn-primary" onClick={() => navigate('/calendar')} style={{ marginTop: '1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
            <Plus size={18} /> Novo Agendamento
          </button>
        </div>
      )
    }

    const items: React.ReactNode[] = []

    for (let i = 0; i < appointments.length; i++) {
      const appt = appointments[i]
      const start = new Date(appt.start_time)
      const end = new Date(appt.end_time)
      const sMs = start.getTime()
      const eMs = end.getTime()
      const isDuringAppt = sMs <= nowMs && nowMs < eMs
      const isInProgress = appt.status !== 'CANCELLED' && appt.status !== 'MISSED' && appt.status !== 'NO_SHOW' && (appt.status === 'IN_PROGRESS' || isDuringAppt)
      const isCompleted = !isInProgress && appt.status === 'COMPLETED'
      const isPastAppt = !isInProgress && eMs <= nowMs
      const isNext = !isInProgress && appt.id === nextApptId
      const badge = getStatusBadge(isInProgress ? 'IN_PROGRESS' : appt.status)

      items.push(
        <div 
          key={`appt-${appt.id}`} 
          className={`agenda-card ${isInProgress ? 'agenda-card-in-progress' : ''} ${isNext ? 'agenda-card-next' : ''} ${isPastAppt ? 'agenda-card-past' : ''}`}
          onClick={() => appt.patient_id ? navigate(`/patient/${appt.patient_id}`) : navigate('/calendar')}
          style={{ cursor: 'pointer' }}
        >
          {/* Time Pill */}
          <div className="agenda-time-pill">
            <span className="agenda-time-start">{format(start, 'HH:mm')}</span>
            <span className="agenda-time-end">{format(end, 'HH:mm')}</span>
          </div>

          {/* Details */}
          <div className="agenda-details">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h4 className="agenda-patient-name">{appt.title}</h4>
              {isInProgress && (
                <span className="in-progress-badge">
                  <span className="active-patient-pulse" style={{ width: 6, height: 6 }} />
                  EM ANDAMENTO
                </span>
              )}
              {isNext && (
                <span className="next-badge" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>
                  PRÓXIMO ({getNextApptCountdown(appt)})
                </span>
              )}
            </div>

            <div className="agenda-meta-row">
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: badge.color,
                background: badge.bg,
                border: `1px solid ${badge.border}`,
                padding: '0.15rem 0.5rem',
                borderRadius: '6px'
              }}>
                {badge.label}
              </span>

              {appt.service_type && (
                <span style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  background: 'rgba(241, 245, 249, 0.8)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '6px',
                  border: '1px solid var(--surface-border)'
                }}>
                  {appt.service_type}
                </span>
              )}

              {appt.price ? (
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(appt.price)}
                </span>
              ) : null}

              {appt.notes && (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  · {appt.notes}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="agenda-actions-row" onClick={(e) => e.stopPropagation()}>
            {/* 1-Click WhatsApp Reminder */}
            <button
              type="button"
              className="btn btn-secondary"
              title="Enviar lembrete via WhatsApp"
              disabled={sendingWhatsappId === appt.id}
              onClick={(e) => handleSendReminder(e, appt.id, appt.title)}
              style={{
                padding: '0.4rem 0.65rem',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: '#16a34a',
                borderColor: 'rgba(22, 163, 74, 0.3)',
                background: 'rgba(22, 163, 74, 0.04)'
              }}
            >
              <MessageCircle size={14} className={sendingWhatsappId === appt.id ? 'spin' : ''} />
              <span style={{ display: 'inline' }}>{sendingWhatsappId === appt.id ? 'Enviando...' : 'WhatsApp'}</span>
            </button>

            {/* Quick Status Toggle: Mark as Completed */}
            <button
              type="button"
              className="btn btn-secondary"
              title={isCompleted ? 'Reabrir consulta' : 'Marcar como concluída'}
              disabled={updatingStatusId === appt.id}
              onClick={(e) => handleToggleStatus(e, appt.id, isCompleted ? 'COMPLETED' : 'IN_PROGRESS')}
              style={{
                padding: '0.4rem 0.65rem',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: isCompleted ? '#16a34a' : (isInProgress ? '#0284c7' : 'var(--text-secondary)'),
                borderColor: isCompleted ? 'rgba(22, 163, 74, 0.3)' : (isInProgress ? 'rgba(2, 132, 199, 0.4)' : 'var(--surface-border)'),
                background: isCompleted ? 'rgba(22, 163, 74, 0.08)' : (isInProgress ? 'rgba(2, 132, 199, 0.06)' : 'white')
              }}
            >
              <CheckCircle2 size={14} color={isCompleted ? '#16a34a' : (isInProgress ? '#0284c7' : 'currentColor')} />
              <span>{isCompleted ? 'Concluído' : 'Concluir'}</span>
            </button>

            {/* View Patient Chart */}
            {appt.patient_id && (
              <button
                type="button"
                className="btn btn-secondary"
                title="Abrir prontuário do paciente"
                onClick={() => navigate(`/patient/${appt.patient_id}`)}
                style={{ padding: '0.4rem 0.65rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <User size={13} />
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      )

      if (i < appointments.length - 1) {
        const nextApptStart = new Date(appointments[i + 1].start_time)
        const gapMinutes = differenceInMinutes(nextApptStart, end)

        if (gapMinutes >= 15) {
          items.push(
            <div key={`break-${appt.id}`} className="timeline-break-pill">
              <Coffee size={14} color="var(--accent-color)" />
              <span>Intervalo de {gapMinutes >= 60 ? `${Math.floor(gapMinutes / 60)}h ${gapMinutes % 60}min` : `${gapMinutes} min`}</span>
            </div>
          )
        }
      }
    }

    return items
  }

  const hour = now.getHours()
  let greeting = 'Bom dia'
  if (hour >= 12 && hour < 18) greeting = 'Boa tarde'
  if (hour >= 18 || hour < 5) greeting = 'Boa noite'

  return (
    <div className="dashboard-container">
      {/* Toast */}
      {toast && (
        <div className={`toast-notification ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="dashboard-top-bar animate-fade-in-up stagger-1">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className="bot-status-compact">
            <span className={`bot-status-dot ${statusInfo.className}`} />
            <span className="bot-status-text">WhatsApp: {statusInfo.label}</span>
          </div>
        </div>

        <button
          className="btn-icon-subtle"
          onClick={() => window.dispatchEvent(new CustomEvent('podonly-open-settings'))}
          title="Configurações Gerais"
        >
          <Settings size={14} />
          <span>Configurações</span>
        </button>
      </div>

      {/* Greeting & Date Banner */}
      <div className="dashboard-greeting animate-fade-in-up stagger-2" style={{ marginBottom: '1.5rem' }}>
        <h2>{greeting}{profName ? `, ${profName}` : ''}!</h2>
        <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', textTransform: 'capitalize' }}>
          <Sparkles size={15} color="var(--accent-color)" />
          {format(now, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* 4-Column Modern KPI Cards Grid */}
      <div className="dashboard-kpi-grid animate-fade-in-up stagger-3">
        {/* KPI 1: Consultas Hoje */}
        <div className="kpi-card" onClick={() => navigate('/calendar')} style={{ cursor: 'pointer' }}>
          <div className="kpi-header">
            <span className="kpi-title">Consultas Hoje</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(14, 145, 168, 0.1)', color: 'var(--accent-color)' }}>
              <Calendar size={18} />
            </div>
          </div>
          <div className="kpi-value">{appointments.length}</div>
          <div className="kpi-subtitle">
            {appointments.length > 0 ? (
              <span style={{ color: '#16a34a' }}>✓ {completedCount} concluídas · {pendingCount} pendentes</span>
            ) : (
              <span>Nenhuma consulta agendada</span>
            )}
          </div>
        </div>

        {/* KPI 2: Próximo Paciente */}
        <div className="kpi-card" onClick={() => navigate('/calendar')} style={{ cursor: 'pointer' }}>
          <div className="kpi-header">
            <span className="kpi-title">Próximo Atendimento</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
              <Clock size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ fontSize: nextAppt ? '1.5rem' : '1.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {nextAppt ? format(new Date(nextAppt.start_time), 'HH:mm') : 'Livre'}
          </div>
          <div className="kpi-subtitle" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {nextAppt ? (
              <span>👤 {nextAppt.title} ({getNextApptCountdown(nextAppt)})</span>
            ) : (
              <span>Nenhum atendimento pendente hoje</span>
            )}
          </div>
        </div>

        {/* KPI 3: Total Pacientes */}
        <div className="kpi-card" onClick={() => navigate('/patients')} style={{ cursor: 'pointer' }}>
          <div className="kpi-header">
            <span className="kpi-title">Pacientes Cadastrados</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
              <Users size={18} />
            </div>
          </div>
          <div className="kpi-value">{totalPatients}</div>
          <div className="kpi-subtitle" style={{ color: 'var(--accent-color)' }}>
            <span>Ver lista de pacientes</span> <ArrowUpRight size={13} />
          </div>
        </div>

        {/* KPI 4: Saldo do Mês */}
        <div className="kpi-card" onClick={() => navigate('/financial')} style={{ cursor: 'pointer' }}>
          <div className="kpi-header">
            <span className="kpi-title">Saldo do Mês</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(22, 163, 74, 0.1)', color: '#16a34a' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ fontSize: '1.45rem', color: financialSummary?.netBalance && financialSummary.netBalance >= 0 ? '#16a34a' : (financialSummary?.netBalance && financialSummary.netBalance < 0 ? '#dc2626' : 'inherit') }}>
            {financialSummary ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialSummary.netBalance) : 'R$ 0,00'}
          </div>
          <div className="kpi-subtitle">
            {financialSummary ? (
              <span>Receitas {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialSummary.totalIncome)}</span>
            ) : (
              <span>Ver fluxo financeiro</span>
            )}
          </div>
        </div>
      </div>

      {/* Fast Action Bar */}
      <div className="dashboard-action-bar animate-fade-in-up stagger-3">
        <div className="dashboard-action-left">
          <button className="btn btn-primary" onClick={() => navigate('/calendar')} style={{ fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={16} /> Novo Agendamento
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/patient/new')} style={{ fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Users size={16} /> Novo Paciente
          </button>
        </div>

        <div className="dashboard-action-right">
          <button className="btn btn-secondary" onClick={() => navigate('/calendar')} style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Calendar size={14} /> Ver Calendário Completo
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/financial')} style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <DollarSign size={14} /> Financeiro
          </button>
        </div>
      </div>

      {/* Agenda Timeline Feed */}
      <section className="dashboard-agenda-section animate-fade-in-up stagger-4">
        <div className="dashboard-section-header">
          <h3>
            <Calendar size={20} color="var(--accent-color)" /> Agenda de Hoje ({appointments.length})
          </h3>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            {completedCount} de {appointments.length} atendimentos concluídos
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <RefreshCw size={20} className="spin" style={{ marginBottom: '0.5rem' }} />
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Carregando agenda do dia...</p>
          </div>
        ) : (
          <div className="timeline">{renderTimeline()}</div>
        )}
      </section>
    </div>
  )
}
