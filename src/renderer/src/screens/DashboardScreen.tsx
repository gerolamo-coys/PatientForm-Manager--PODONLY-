import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Calendar, Users, Plus, Coffee, Settings, Send, Save, X, Download, Briefcase, Clock, Database, Globe, RefreshCw, Trash2, TrendingUp, CreditCard } from 'lucide-react'
import { format, isFuture, differenceInMinutes, startOfDay, endOfDay, isBefore, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { FinancialSummary } from '../../../shared/types'


export default function DashboardScreen(): React.JSX.Element {
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState<any[]>([])
  const [totalPatients, setTotalPatients] = useState(0)
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null)
  const [loading, setLoading] = useState(true)

  // WhatsApp States
  const [botStatus, setBotStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED'>('DISCONNECTED')
  const [qrDataUri, setQrDataUri] = useState('')
  const [botEnabled, setBotEnabled] = useState(false)
  const [botTime, setBotTime] = useState('09:00')
  const [botTemplate, setBotTemplate] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const testMessage = 'Olá! Esta é uma mensagem de teste do seu WhatsApp.'
  const [sendingTest, setSendingTest] = useState(false)
  const [testSuccess, setTestSuccess] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)
  
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'preferences' | 'whatsapp' | 'google' | 'storage' | 'subscription'>('profile')
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null)
  const [backupLoading, setBackupLoading] = useState(false)
  const [backupSuccessPath, setBackupSuccessPath] = useState<string | null>(null)
  const [backupError, setBackupError] = useState<string | null>(null)

  // Profile settings states
  const [profName, setProfName] = useState('')
  const [clinicName, setClinicName] = useState('')
  const [clinicAddress, setClinicAddress] = useState('')
  const [clinicPhone, setClinicPhone] = useState('')
  const [clinicLogo, setClinicLogo] = useState<string | null>(null)

  // Preferences settings states
  const [defaultDuration, setDefaultDuration] = useState('60')

  // Google settings states
  const [googleClientId, setGoogleClientId] = useState('')
  const [googleClientSecret, setGoogleClientSecret] = useState('')
  const [googleIsAuthenticated, setGoogleIsAuthenticated] = useState(false)
  const [googleIsSyncing, setGoogleIsSyncing] = useState(false)

  // Storage settings states
  const [diskUsage, setDiskUsage] = useState<{ dbSize: number; imagesSize: number; totalSize: number } | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetConfirmText, setResetConfirmText] = useState('')

  // Subscription state
  const [subDetails, setSubDetails] = useState<any>(null)
  const [subLoading, setSubLoading] = useState(false)
  const [subError, setSubError] = useState<string | null>(null)

  useEffect(() => {
    if (showSettingsModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [showSettingsModal])

  useEffect(() => {
    window.api.getWhatsappStatus().then((res) => {
      setBotStatus(res.status)
      setQrDataUri(res.qrDataUri)
    }).catch(console.error)

    const unsubscribe = window.api.onWhatsappStatus((data) => {
      setBotStatus(data.status)
      setQrDataUri(data.qrDataUri)
    })

    Promise.all([
      window.api.getSetting('whatsapp_enabled'),
      window.api.getSetting('whatsapp_time'),
      window.api.getSetting('whatsapp_template'),
      window.api.getSetting('last_backup_date')
    ]).then(([enabled, time, template, lastBackup]) => {
      setBotEnabled(enabled === 'true')
      if (time) setBotTime(time)
      if (template) setBotTemplate(template)
      else setBotTemplate('Olá {nome}! Passando para lembrar da sua consulta de podologia amanhã, {data}, às {hora}.')
      
      if (lastBackup) setLastBackupDate(lastBackup)
    }).catch(console.error)

    return () => {
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (showSettingsModal) {
      Promise.all([
        window.api.getSetting('profile_professional_name'),
        window.api.getSetting('profile_clinic_name'),
        window.api.getSetting('profile_clinic_address'),
        window.api.getSetting('profile_clinic_phone'),
        window.api.getSetting('default_appointment_duration'),
        window.api.getSetting('google_client_id'),
        window.api.getSetting('google_client_secret'),
        window.api.getSetting('google_auth_tokens'),
        window.api.getSetting('last_backup_date')
      ]).then(([prof, clinic, addr, phone, duration, gClientId, gClientSecret, gTokens, lastBackup]) => {
        setProfName(prof || '')
        setClinicName(clinic || '')
        setClinicAddress(addr || '')
        setClinicPhone(phone || '')
        setDefaultDuration(duration || '60')
        setGoogleClientId(gClientId || '')
        setGoogleClientSecret(gClientSecret || '')
        setGoogleIsAuthenticated(!!gTokens)
        if (lastBackup) setLastBackupDate(lastBackup)
      }).catch(console.error)

      window.api.getClinicLogoBase64().then((logo) => {
        setClinicLogo(logo)
      }).catch(console.error)

      window.api.getDiskUsage().then((usage) => {
        setDiskUsage(usage)
      }).catch(console.error)
      
      setShowResetConfirm(false)
      setResetConfirmText('')
      setSaveSuccess(false)
      setBackupSuccessPath(null)
      setBackupError(null)
      setSubDetails(null)
      setSubError(null)
    }
  }, [showSettingsModal])

  useEffect(() => {
    if (activeSettingsTab === 'subscription') {
      loadSubscriptionDetails()
    }
  }, [activeSettingsTab])

  const loadSubscriptionDetails = async () => {
    setSubLoading(true)
    setSubError(null)
    try {
      const res = await window.api.getSubscriptionDetails()
      if (res && res.success && res.data) {
        setSubDetails(res.data)
      } else {
        setSubError(res?.error || 'Não foi possível carregar os detalhes da assinatura.')
      }
    } catch (err: any) {
      setSubError(err.message || 'Erro ao comunicar com o servidor.')
    } finally {
      setSubLoading(false)
    }
  }

  const handleOpenInvoice = () => {
    if (subDetails && subDetails.invoiceUrl) {
      window.api.openExternalBrowser(subDetails.invoiceUrl)
    }
  }

  const handleCancelSubscription = async () => {
    if (window.confirm('Tem certeza que deseja cancelar sua assinatura? O acesso ao sistema será interrompido após o vencimento atual.')) {
      setSubLoading(true)
      try {
        const res = await window.api.cancelSubscription()
        if (res && res.success) {
          alert('Assinatura cancelada com sucesso.')
          loadSubscriptionDetails()
        } else {
          alert(`Erro ao cancelar: ${res?.error || 'Tente novamente.'}`)
        }
      } catch (err: any) {
        alert(`Erro: ${err.message}`)
      } finally {
        setSubLoading(false)
      }
    }
  }

  const handleStartBot = async () => {
    try {
      await window.api.startWhatsapp()
    } catch (err) {
      console.error(err)
    }
  }

  const handleLogoutBot = async () => {
    if (window.confirm('Tem certeza que deseja desconectar o WhatsApp?')) {
      try {
        await window.api.logoutWhatsapp()
      } catch (err) {
        console.error(err)
      }
    }
  }

  const handleSaveSettings = async () => {
    try {
      await window.api.setSetting('whatsapp_enabled', botEnabled ? 'true' : 'false')
      await window.api.setSetting('whatsapp_time', botTime)
      await window.api.setSetting('whatsapp_template', botTemplate)
      // Limpa a data de última execução para que o usuário possa testar hoje de novo se mudar a hora.
      await window.api.setSetting('whatsapp_last_run_date', '')
      
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error(err)
    }
  }

  const handleSendTestMessage = async () => {
    if (!testPhone) {
      alert('Por favor, insira um número de telefone para o teste.')
      return
    }
    setSendingTest(true)
    setTestError(null)
    setTestSuccess(false)
    try {
      const success = await window.api.sendTestWhatsappMessage(testPhone, testMessage)
      if (success) {
        setTestSuccess(true)
      }
    } catch (err: any) {
      setTestError(err.message || 'Erro ao enviar a mensagem de teste.')
    } finally {
      setSendingTest(false)
    }
  }

  const handleBackup = async () => {
    setBackupLoading(true)
    setBackupError(null)
    setBackupSuccessPath(null)
    try {
      const path = await window.api.createBackup()
      if (path) {
        setBackupSuccessPath(path)
        const date = new Date().toISOString()
        setLastBackupDate(date)
      }
    } catch (err: any) {
      console.error(err)
      setBackupError(err.message || 'Erro ao realizar backup.')
    } finally {
      setBackupLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      await window.api.setSetting('profile_professional_name', profName)
      await window.api.setSetting('profile_clinic_name', clinicName)
      await window.api.setSetting('profile_clinic_address', clinicAddress)
      await window.api.setSetting('profile_clinic_phone', clinicPhone)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error(err)
    }
  }

  const handleImportLogo = async () => {
    try {
      const logoBase64 = await window.api.pickAndSaveClinicLogo()
      if (logoBase64) {
        setClinicLogo(logoBase64)
      }
    } catch (err) {
      console.error('Erro ao importar logotipo:', err)
    }
  }

  const handleRemoveLogo = async () => {
    if (window.confirm('Tem certeza que deseja remover o logotipo da clínica?')) {
      try {
        const success = await window.api.deleteClinicLogo()
        if (success) {
          setClinicLogo(null)
        }
      } catch (err) {
        console.error('Erro ao remover logotipo:', err)
      }
    }
  }

  const handleSavePreferences = async () => {
    try {
      await window.api.setSetting('default_appointment_duration', defaultDuration)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error(err)
    }
  }

  const handleSaveGoogleConfig = async () => {
    try {
      await window.api.setSetting('google_client_id', googleClientId)
      await window.api.setSetting('google_client_secret', googleClientSecret)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error(err)
    }
  }

  const handleGoogleAuthenticate = async () => {
    if (!googleClientId || !googleClientSecret) {
      alert("Por favor, configure o Client ID e Secret primeiro.")
      return
    }
    const success = await window.api.authenticateGoogle()
    if (success) {
      setGoogleIsAuthenticated(true)
      setGoogleIsSyncing(true)
      const result = await window.api.pullFromGoogleCalendar()
      if (result && !result.success) {
        alert(`Erro na sincronização inicial: ${result.error}`)
      }
      setGoogleIsSyncing(false)
    }
  }

  const handleGoogleDisconnect = async () => {
    if (window.confirm('Tem certeza que deseja desconectar sua conta do Google?')) {
      await window.api.setSetting('google_auth_tokens', '')
      setGoogleIsAuthenticated(false)
    }
  }

  const handleGoogleSync = async () => {
    setGoogleIsSyncing(true)
    const result = await window.api.pullFromGoogleCalendar()
    if (result && !result.success) {
      if (result.error === 'AUTH_ERROR') {
        setGoogleIsAuthenticated(false)
        alert('Sua sessão do Google Agenda expirou. Por favor, clique em "Autenticar Conta Google" novamente.')
      } else {
        alert(`Erro na sincronização: ${result.error}`)
      }
    }
    setGoogleIsSyncing(false)
  }

  const handleFactoryReset = async () => {
    if (resetConfirmText !== 'APAGAR') {
      alert('Por favor, digite APAGAR exatamente para confirmar.')
      return
    }
    if (window.confirm('ATENÇÃO EXTREMA: Isso apagará TODOS os pacientes, consultas, fotos e configurações permanentemente! O aplicativo será reiniciado totalmente limpo. Deseja prosseguir?')) {
      await window.api.factoryReset('APAGAR')
    }
  }


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

  const statusInfo = getStatusDetails()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const todayStart = startOfDay(new Date()).toISOString()
      const todayEnd = endOfDay(new Date()).toISOString()

      const appts = await window.api.getAppointments(todayStart, todayEnd)
      const sortedAppts = appts.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      setAppointments(sortedAppts)

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

  const now = new Date()
  let nextApptId: number | null = null
  for (const appt of appointments) {
    if (isFuture(new Date(appt.end_time))) {
      nextApptId = appt.id
      break
    }
  }

  const renderTimeline = () => {
    if (appointments.length === 0) {
      return (
        <div className="empty-state">
          <Calendar size={48} />
          <h3>Nenhum agendamento para hoje</h3>
          <p>Você tem o dia livre!</p>
          <button className="btn btn-primary" onClick={() => navigate('/calendar')} style={{ marginTop: '1.5rem', display: 'inline-flex', alignItems: 'center' }}>
            <Plus size={18} style={{ transform: 'translateY(1px)' }} /> <span>Novo Agendamento</span>
          </button>
        </div>
      )
    }

    const items: React.ReactNode[] = []

    for (let i = 0; i < appointments.length; i++) {
      const appt = appointments[i]
      const start = new Date(appt.start_time)
      const end = new Date(appt.end_time)
      const isNext = appt.id === nextApptId
      const isPastAppt = isBefore(end, now)

      items.push(
        <div key={`appt-${appt.id}`} className={`timeline-item ${isNext ? 'timeline-item-next' : ''} ${isPastAppt ? 'timeline-item-past' : ''}`}>
          <div className="timeline-time">
            <strong>{format(start, 'HH:mm')}</strong>
            <span>{format(end, 'HH:mm')}</span>
          </div>
          <div className="timeline-line"></div>
          <div className="timeline-content glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '1.05rem', color: isNext ? 'var(--accent-color)' : 'inherit' }}>{appt.title}</h4>
              {isNext && <span className="next-badge">PRÓXIMO</span>}
            </div>
            {appt.notes && <p className="timeline-notes">{appt.notes}</p>}
          </div>
        </div>
      )

      if (i < appointments.length - 1) {
        const nextApptStart = new Date(appointments[i + 1].start_time)
        const gapMinutes = differenceInMinutes(nextApptStart, end)

        if (gapMinutes >= 15) {
          items.push(
            <div key={`break-${appt.id}`} className="timeline-break">
              <div className="timeline-time"></div>
              <div className="timeline-line break-line"></div>
              <div className="break-content">
                <Coffee size={16} />
                <span>Intervalo de {gapMinutes >= 60 ? `${Math.floor(gapMinutes / 60)}h ${gapMinutes % 60}min` : `${gapMinutes} min`}</span>
              </div>
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
  else if (hour >= 18) greeting = 'Boa noite'

  return (
    <div className="dashboard-container animate-fade-in-up">
      {/* Compact top bar: bot status (left) + settings trigger (right) */}
      <div className="dashboard-top-bar animate-fade-in-up stagger-1">
        <div className="bot-status-compact">
          <span className={`bot-status-dot ${statusInfo.className}`} />
          <span className="bot-status-text">WhatsApp: {statusInfo.label}</span>
        </div>
        <button
          className="btn-icon-subtle"
          onClick={() => setShowSettingsModal(true)}
          title="Configurações"
        >
          <span>Configurações</span>
          <Settings size={13} />
        </button>
      </div>

      {/* Greeting */}
      <div className="dashboard-greeting animate-fade-in-up stagger-2">
        <h2>{greeting}!</h2>
        <p>Hoje é {format(now, "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
      </div>

      {/* Stats + Quick Actions */}
      <div className="dashboard-stats-row animate-fade-in-up stagger-3">
        <div className="stat-card-mini">
          <div className="stat-card-mini-value">{appointments.length}</div>
          <div className="stat-card-mini-label">Consultas Hoje</div>
        </div>
        <div className="stat-card-mini" onClick={() => navigate('/patients')} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
          <div className="stat-card-mini-value">{totalPatients}</div>
          <div className="stat-card-mini-label">Total de Pacientes</div>
        </div>
        <div className="stat-card-mini" onClick={() => navigate('/financial')} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
          <div className="stat-card-mini-value" style={{ color: financialSummary?.netBalance && financialSummary.netBalance >= 0 ? '#16a34a' : (financialSummary?.netBalance && financialSummary.netBalance < 0 ? '#dc2626' : 'inherit') }}>
            {financialSummary ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialSummary.netBalance) : 'R$ 0,00'}
          </div>
          <div className="stat-card-mini-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <TrendingUp size={12} /> Saldo do Mês
          </div>
        </div>
        <div className="stat-card-mini dashboard-quick-actions">
          <button className="btn btn-primary" onClick={() => navigate('/calendar')} style={{ width: '100%', justifyContent: 'flex-start' }}>
            <Plus size={16} /> Novo Agendamento
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/patient/new')} style={{ width: '100%', justifyContent: 'flex-start' }}>
            <Users size={16} /> Novo Paciente
          </button>
        </div>
      </div>

      {/* Full-width Agenda Timeline */}
      <section className="dashboard-agenda-section animate-fade-in-up stagger-4">
        <div className="dashboard-section-header">
          <h3><Calendar size={20} /> Agenda do Dia</h3>
        </div>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)', padding: '1rem 0' }}>Carregando agenda...</p>
        ) : (
          <div className="timeline">{renderTimeline()}</div>
        )}
      </section>

      {/* Unified Settings Modal */}
      {showSettingsModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="whatsapp-modal settings-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="whatsapp-modal-header" style={{ borderBottom: '1px solid var(--surface-border)' }}>
              <h3><Settings size={18} style={{ marginRight: '0.5rem' }} /> Configurações Gerais</h3>
              <button className="modal-close-btn" onClick={() => setShowSettingsModal(false)}>
                <X size={16} />
              </button>
            </div>

            {/* Main Settings Area */}
            <div className="settings-layout">
              {/* Sidebar */}
              <div className="settings-sidebar">
                <button
                  className={`settings-tab-btn ${activeSettingsTab === 'profile' ? 'active' : ''}`}
                  onClick={() => { setActiveSettingsTab('profile'); setSaveSuccess(false); }}
                >
                  <Briefcase size={16} /> Clínica & Perfil
                </button>
                <button
                  className={`settings-tab-btn ${activeSettingsTab === 'preferences' ? 'active' : ''}`}
                  onClick={() => { setActiveSettingsTab('preferences'); setSaveSuccess(false); }}
                >
                  <Clock size={16} /> Preferências Agenda
                </button>
                <button
                  className={`settings-tab-btn ${activeSettingsTab === 'whatsapp' ? 'active' : ''}`}
                  onClick={() => { setActiveSettingsTab('whatsapp'); setSaveSuccess(false); }}
                >
                  <Send size={16} /> Lembretes WhatsApp
                </button>
                <button
                  className={`settings-tab-btn ${activeSettingsTab === 'google' ? 'active' : ''}`}
                  onClick={() => { setActiveSettingsTab('google'); setSaveSuccess(false); }}
                >
                  <Globe size={16} /> Google Agenda
                </button>
                <button
                  className={`settings-tab-btn ${activeSettingsTab === 'storage' ? 'active' : ''}`}
                  onClick={() => { setActiveSettingsTab('storage'); setSaveSuccess(false); }}
                >
                  <Database size={16} /> Dados & Backup
                </button>
                <button
                  className={`settings-tab-btn ${activeSettingsTab === 'subscription' ? 'active' : ''}`}
                  onClick={() => { setActiveSettingsTab('subscription'); setSaveSuccess(false); }}
                >
                  <CreditCard size={16} /> Minha Assinatura
                </button>
              </div>

              {/* Content Panels */}
              <div className="settings-content">
                {/* 1. CLINIC PROFILE */}
                {activeSettingsTab === 'profile' && (
                  <>
                    <div className="modal-section">
                      <div className="modal-section-title">Perfil Profissional</div>
                      
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Nome Completo do Profissional</label>
                        <input
                          type="text"
                          className="form-control"
                          style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
                          placeholder="Ex: Dra. Mariana Silva"
                          value={profName}
                          onChange={(e) => setProfName(e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Nome da Clínica ou Consultório</label>
                        <input
                          type="text"
                          className="form-control"
                          style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
                          placeholder="Ex: Espaço Saúde dos Pés"
                          value={clinicName}
                          onChange={(e) => setClinicName(e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Endereço Completo</label>
                        <input
                          type="text"
                          className="form-control"
                          style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
                          placeholder="Ex: Av. Paulista, 1000 - Cj 52"
                          value={clinicAddress}
                          onChange={(e) => setClinicAddress(e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Telefone Comercial</label>
                        <input
                          type="text"
                          className="form-control"
                          style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
                          placeholder="Ex: (11) 99999-9999"
                          value={clinicPhone}
                          onChange={(e) => setClinicPhone(e.target.value)}
                        />
                      </div>

                      <button className="btn btn-primary" onClick={handleSaveProfile} style={{ width: '100%', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                        <Save size={14} style={{ marginRight: '0.25rem' }} /> Salvar Dados do Perfil
                      </button>

                      {saveSuccess && (
                        <div style={{ color: 'var(--success-color)', fontSize: '0.75rem', textAlign: 'center', fontWeight: 500 }}>
                          Perfil atualizado com sucesso!
                        </div>
                      )}
                    </div>

                    <div className="modal-section" style={{ marginTop: '1.5rem' }}>
                      <div className="modal-section-title">Logotipo da Clínica</div>
                      <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Adicione um logotipo para personalizar seus futuros documentos e prontuários impressos em PDF.
                      </p>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.25rem',
                        padding: '1.25rem',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px dashed rgba(255, 255, 255, 0.15)',
                        borderRadius: '12px',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        textAlign: 'center',
                        minHeight: '160px',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        {clinicLogo ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%' }}>
                            <div style={{
                              width: '120px',
                              height: '120px',
                              borderRadius: '8px',
                              background: '#fff',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              padding: '8px',
                              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)'
                            }}>
                              <img 
                                src={clinicLogo} 
                                alt="Logotipo da clínica" 
                                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                              />
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                type="button" 
                                className="btn btn-secondary" 
                                style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }} 
                                onClick={handleImportLogo}
                              >
                                Alterar Logotipo
                              </button>
                              <button 
                                type="button" 
                                className="btn btn-secondary" 
                                style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#fca5a5' }} 
                                onClick={handleRemoveLogo}
                              >
                                Remover
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              width: '56px',
                              height: '56px',
                              borderRadius: '50%',
                              background: 'rgba(255, 255, 255, 0.05)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid rgba(255, 255, 255, 0.1)'
                            }}>
                              <Briefcase size={24} color="var(--accent-color)" style={{ opacity: 0.8 }} />
                            </div>
                            <div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Nenhum logotipo importado</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Suporta arquivos PNG, JPG, JPEG ou WEBP</div>
                            </div>
                            <button 
                              type="button" 
                              className="btn btn-primary" 
                              style={{ fontSize: '0.8rem', padding: '0.45rem 1rem', marginTop: '0.25rem' }} 
                              onClick={handleImportLogo}
                            >
                              Importar Logotipo
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* 2. PREFERENCES (Default Duration) */}
                {activeSettingsTab === 'preferences' && (
                  <>
                    <div className="modal-section">
                      <div className="modal-section-title">Preferências do Calendário</div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Ajuste o comportamento padrão das telas de agendamento e agenda.
                      </p>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Duração Padrão da Consulta</label>
                        <select
                          className="form-control"
                          style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', background: 'var(--surface-color)', color: 'var(--text-primary)' }}
                          value={defaultDuration}
                          onChange={(e) => setDefaultDuration(e.target.value)}
                        >
                          <option value="30">30 Minutos</option>
                          <option value="45">45 Minutos</option>
                          <option value="60">1 Hora (Padrão)</option>
                          <option value="90">1 Hora e 30 Minutos</option>
                          <option value="120">2 Horas</option>
                        </select>
                      </div>

                      <button className="btn btn-primary" onClick={handleSavePreferences} style={{ width: '100%', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                        <Save size={14} style={{ marginRight: '0.25rem' }} /> Salvar Preferências
                      </button>

                      {saveSuccess && (
                        <div style={{ color: 'var(--success-color)', fontSize: '0.75rem', textAlign: 'center', fontWeight: 500 }}>
                          Preferências salvas com sucesso!
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* 3. WHATSAPP */}
                {activeSettingsTab === 'whatsapp' && (
                  <>
                    <div className="modal-section">
                      <div className="modal-section-title">Conexão WhatsApp</div>
                      <div className="whatsapp-modal-status">
                        <span className={`bot-status-dot ${statusInfo.className}`} />
                        <span style={{ fontWeight: 500 }}>{statusInfo.label}</span>
                      </div>

                      {botStatus === 'DISCONNECTED' && (
                        <>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Conecte seu WhatsApp para habilitar o disparo automático dos lembretes de consultas.
                          </p>
                          <button className="btn btn-primary" onClick={handleStartBot} style={{ width: '100%' }}>
                            Conectar WhatsApp
                          </button>
                        </>
                      )}

                      {botStatus === 'CONNECTING' && (
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                          Inicializando serviço... Isso pode levar alguns segundos.
                        </p>
                      )}

                      {botStatus === 'QR_READY' && (
                        <div className="whatsapp-qr-container">
                          {qrDataUri ? (
                            <img src={qrDataUri} alt="WhatsApp QR Code" className="whatsapp-qr-image" />
                          ) : (
                            <p style={{ fontSize: '0.85rem' }}>Gerando QR Code...</p>
                          )}
                          <div className="whatsapp-qr-instructions">
                            <strong>Como conectar:</strong><br />
                            1. Abra o WhatsApp no seu aparelho.<br />
                            2. Vá em <strong>Aparelhos conectados</strong> &gt; <strong>Conectar aparelho</strong>.<br />
                            3. Aponte a câmera para ler este QR Code.
                          </div>
                          <button className="btn btn-secondary" onClick={handleLogoutBot} style={{ width: '100%' }}>
                            Cancelar
                          </button>
                        </div>
                      )}

                      {botStatus === 'CONNECTED' && (
                        <>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--success-color)', fontWeight: 500 }}>
                            ✓ Aparelho pareado e pronto para envio.
                          </p>
                          <button className="btn btn-secondary" onClick={handleLogoutBot} style={{ width: '100%' }}>
                            Desconectar Aparelho
                          </button>
                        </>
                      )}
                    </div>

                    <div className="modal-section">
                      <div className="modal-section-title">Mensagem de Envio</div>

                      <label className="modal-checkbox-label">
                        <input
                          type="checkbox"
                          checked={botEnabled}
                          onChange={(e) => setBotEnabled(e.target.checked)}
                        />
                        Habilitar Lembretes Automáticos
                      </label>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Horário Oficial do Disparo</label>
                        <input
                          type="time"
                          className="form-control"
                          style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
                          value={botTime}
                          onChange={(e) => setBotTime(e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Texto do Lembrete (Modelo)</label>
                        <textarea
                          className="form-control modal-textarea"
                          rows={3}
                          value={botTemplate}
                          onChange={(e) => setBotTemplate(e.target.value)}
                          placeholder="Ex: Olá {nome}! Lembrete da sua consulta amanhã..."
                        />
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          Tags utilizáveis: <strong>{`{nome}`}</strong>, <strong>{`{data}`}</strong>, <strong>{`{hora}`}</strong>
                        </div>
                      </div>

                      <button className="btn btn-primary" onClick={handleSaveSettings} style={{ width: '100%', fontSize: '0.85rem' }}>
                        <Save size={14} style={{ marginRight: '0.25rem' }} /> Salvar Lembretes WhatsApp
                      </button>

                      {saveSuccess && (
                        <div style={{ color: 'var(--success-color)', fontSize: '0.75rem', textAlign: 'center', fontWeight: 500 }}>
                          Configurações do WhatsApp salvas!
                        </div>
                      )}
                    </div>

                    {botStatus === 'CONNECTED' && (
                      <div className="modal-section">
                        <div className="modal-section-title">Disparar Lembrete de Teste</div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <input
                            type="text"
                            className="form-control"
                            style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
                            placeholder="Telefone com DDD (Ex: 11999998888)"
                            value={testPhone}
                            onChange={(e) => setTestPhone(e.target.value)}
                          />
                        </div>
                        <button
                          className="btn btn-secondary"
                          onClick={handleSendTestMessage}
                          disabled={sendingTest}
                          style={{ width: '100%', fontSize: '0.85rem' }}
                        >
                          {sendingTest ? 'Enviando...' : (
                            <>
                              <Send size={12} style={{ marginRight: '0.25rem' }} /> Enviar Mensagem de Teste
                            </>
                          )}
                        </button>
                        {testSuccess && (
                          <div style={{ color: 'var(--success-color)', fontSize: '0.75rem', textAlign: 'center', fontWeight: 500 }}>
                            ✓ Mensagem enviada!
                          </div>
                        )}
                        {testError && (
                          <div style={{ color: 'var(--danger-color)', fontSize: '0.75rem', textAlign: 'center', fontWeight: 500 }}>
                            {testError}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* 4. GOOGLE CALENDAR */}
                {activeSettingsTab === 'google' && (
                  <>
                    <div className="modal-section">
                      <div className="modal-section-title">Credenciais Google Cloud</div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Para sincronizar com sua Google Agenda, insira suas credenciais da API do Google Console.
                      </p>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Client ID</label>
                        <input
                          type="text"
                          className="form-control"
                          style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
                          placeholder="Coloque seu Google Client ID aqui"
                          value={googleClientId}
                          onChange={(e) => setGoogleClientId(e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Client Secret</label>
                        <input
                          type="password"
                          className="form-control"
                          style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
                          placeholder="Coloque seu Google Client Secret aqui"
                          value={googleClientSecret}
                          onChange={(e) => setGoogleClientSecret(e.target.value)}
                        />
                      </div>

                      <button className="btn btn-primary" onClick={handleSaveGoogleConfig} style={{ width: '100%', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                        <Save size={14} style={{ marginRight: '0.25rem' }} /> Salvar Credenciais
                      </button>

                      {saveSuccess && (
                        <div style={{ color: 'var(--success-color)', fontSize: '0.75rem', textAlign: 'center', fontWeight: 500 }}>
                          Credenciais salvas com sucesso!
                        </div>
                      )}
                    </div>

                    <div className="modal-section" style={{ marginTop: '0.5rem' }}>
                      <div className="modal-section-title">Status da Conexão</div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.25rem 0' }}>
                        <span className={`bot-status-dot ${googleIsAuthenticated ? 'connected' : 'disconnected'}`} />
                        <span style={{ fontWeight: 500, fontSize: '0.88rem' }}>
                          {googleIsAuthenticated ? 'Conectado com o Google Agenda' : 'Não autenticado'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        {!googleIsAuthenticated ? (
                          <button className="btn btn-primary" onClick={handleGoogleAuthenticate} style={{ flex: 1, fontSize: '0.85rem' }}>
                            Autenticar Conta Google
                          </button>
                        ) : (
                          <>
                            <button
                              className="btn btn-secondary"
                              onClick={handleGoogleSync}
                              disabled={googleIsSyncing}
                              style={{ flex: 1, fontSize: '0.85rem' }}
                            >
                              {googleIsSyncing ? 'Sincronizando...' : (
                                <><RefreshCw size={12} style={{ marginRight: '0.25rem' }} /> Forçar Sincronização</>
                              )}
                            </button>
                            <button className="btn btn-secondary" onClick={handleGoogleDisconnect} style={{ flex: 1, fontSize: '0.85rem', color: 'var(--danger-color)' }}>
                              Desconectar Conta
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* 5. STORAGE / BACKUP */}
                {activeSettingsTab === 'storage' && (
                  <>
                    <div className="modal-section">
                      <div className="modal-section-title">Uso de Armazenamento</div>
                      
                      {diskUsage ? (
                        <div style={{ background: 'rgba(14, 145, 168, 0.05)', borderRadius: 'var(--radius)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Banco de Dados:</span>
                            <span style={{ fontWeight: 600 }}>{diskUsage.dbSize} MB</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Fotos dos Pacientes:</span>
                            <span style={{ fontWeight: 600 }}>{diskUsage.imagesSize} MB</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--surface-border)', paddingTop: '0.5rem', fontWeight: 700 }}>
                            <span>Espaço Total Utilizado:</span>
                            <span style={{ color: 'var(--accent-color)' }}>{diskUsage.totalSize} MB</span>
                          </div>
                        </div>
                      ) : (
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Calculando espaço em disco...</p>
                      )}
                    </div>

                    <div className="modal-section">
                      <div className="modal-section-title">Gerar Backup Completo</div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        Gera um arquivo `.zip` com todos os dados e fotos dos pacientes para você salvar no computador ou importar no Google Drive.
                      </p>
                      {lastBackupDate && (
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                          Último backup realizado: <strong>{format(new Date(lastBackupDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</strong>
                        </p>
                      )}
                      
                      <button
                        className="btn btn-primary"
                        onClick={handleBackup}
                        disabled={backupLoading}
                        style={{ width: '100%', fontSize: '0.85rem' }}
                      >
                        {backupLoading ? 'Compactando arquivos...' : (
                          <><Download size={14} style={{ marginRight: '0.25rem' }} /> Fazer Backup do Sistema</>
                        )}
                      </button>

                      {backupSuccessPath && (
                        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--success-color)', color: '#fff', borderRadius: 'var(--radius)', fontSize: '0.8rem' }}>
                          <strong>✓ Backup criado!</strong><br />
                          Salvo em: <span style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{backupSuccessPath}</span>
                        </div>
                      )}
                      
                      {backupError && (
                        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--danger-color)', color: '#fff', borderRadius: 'var(--radius)', fontSize: '0.8rem' }}>
                          Erro ao criar backup: {backupError}
                        </div>
                      )}
                    </div>

                    <div className="modal-section" style={{ marginTop: '1rem' }}>
                      <div className="modal-section-title" style={{ color: 'var(--danger-color)', borderBottomColor: 'rgba(239, 68, 68, 0.2)' }}>Zona de Perigo</div>
                      
                      <div className="danger-zone-box">
                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          A restauração de fábrica apagará <strong>todos</strong> os registros e fotos permanentemente.
                        </p>

                        {!showResetConfirm ? (
                          <button
                            className="btn btn-secondary"
                            onClick={() => setShowResetConfirm(true)}
                            style={{ background: 'transparent', border: '1px solid var(--danger-color)', color: 'var(--danger-color)', fontSize: '0.85rem' }}
                          >
                            <Trash2 size={12} style={{ marginRight: '0.25rem' }} /> Limpar Todos os Dados
                          </button>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--danger-color)' }}>
                              Digite "APAGAR" em maiúsculas para confirmar:
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              style={{ borderColor: 'var(--danger-color)', padding: '0.4rem 0.75rem' }}
                              value={resetConfirmText}
                              onChange={(e) => setResetConfirmText(e.target.value)}
                              placeholder="Digite APAGAR"
                            />
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                              <button
                                className="btn btn-secondary"
                                onClick={handleFactoryReset}
                                style={{ flex: 1, background: 'var(--danger-color)', color: 'white', borderColor: 'var(--danger-color)', fontSize: '0.85rem' }}
                              >
                                Confirmar Destruição
                              </button>
                              <button
                                className="btn btn-secondary"
                                onClick={() => { setShowResetConfirm(false); setResetConfirmText(''); }}
                                style={{ flex: 1, fontSize: '0.85rem' }}
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* 6. SUBSCRIPTION */}
                {activeSettingsTab === 'subscription' && (
                  <div className="modal-section">
                    <div className="modal-section-title">Gerenciar Assinatura</div>
                    
                    {subLoading ? (
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Carregando dados da assinatura...</p>
                    ) : subError ? (
                      <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '8px', color: 'var(--danger-color)', fontSize: '0.85rem' }}>
                        {subError}
                      </div>
                    ) : subDetails ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ background: 'rgba(14, 145, 168, 0.05)', borderRadius: 'var(--radius)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Status da Assinatura</span>
                            <span style={{ 
                              padding: '0.25rem 0.5rem', 
                              borderRadius: '4px', 
                              fontSize: '0.75rem', 
                              fontWeight: 600,
                              background: subDetails.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: subDetails.status === 'ACTIVE' ? '#22c55e' : '#ef4444'
                            }}>
                              {subDetails.status === 'ACTIVE' ? 'ATIVA' : subDetails.status}
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Ciclo de Cobrança</span>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                              {subDetails.cycle === 'MONTHLY' ? 'Mensal' : subDetails.cycle === 'YEARLY' ? 'Anual' : subDetails.cycle}
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Valor da Fatura</span>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subDetails.value)}
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Próximo Vencimento</span>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                              {subDetails.nextDueDate ? format(new Date(subDetails.nextDueDate), 'dd/MM/yyyy') : 'N/A'}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                          <button 
                            className="btn btn-primary" 
                            style={{ flex: 1, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={handleOpenInvoice}
                            disabled={!subDetails.invoiceUrl}
                          >
                            <CreditCard size={14} style={{ marginRight: '0.5rem' }} /> 
                            Alterar Cartão / Ver Faturas
                          </button>
                          
                          <button 
                            className="btn btn-secondary" 
                            style={{ flex: 1, fontSize: '0.85rem', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }}
                            onClick={handleCancelSubscription}
                            disabled={subDetails.status !== 'ACTIVE'}
                          >
                            Cancelar Assinatura
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Nenhum dado encontrado.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
