import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { 
  Calendar, 
  Users, 
  Plus, 
  Coffee, 
  Settings, 
  Send, 
  Save, 
  X, 
  Briefcase, 
  Clock, 
  Database, 
  Globe, 
  RefreshCw, 
  TrendingUp, 
  CreditCard, 
  Shield, 
  CheckCircle2, 
  MessageCircle, 
  DollarSign, 
  ChevronRight, 
  Sparkles,
  User,
  ArrowUpRight,
  AlertCircle,
  Download,
  Trash2,
  Upload,
  RotateCcw,
  ExternalLink,
  Sliders
} from 'lucide-react'
import { format, isFuture, differenceInMinutes, startOfDay, endOfDay, isBefore, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { FinancialSummary, AppointmentStatus } from '../../../shared/types'
import feetMapDefaultImg from '../assets/feet-map.png'
import FeetCanvasBuilderModal from '../components/FeetCanvasBuilderModal'


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
  const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'preferences' | 'whatsapp' | 'google' | 'storage' | 'subscription' | 'security'>('profile')

  // Profile settings states
  const [profName, setProfName] = useState('')
  const [clinicName, setClinicName] = useState('')
  const [clinicAddress, setClinicAddress] = useState('')
  const [clinicPhone, setClinicPhone] = useState('')
  const [clinicLogo, setClinicLogo] = useState<string | null>(null)

  // Preferences settings states
  const [defaultDuration, setDefaultDuration] = useState('60')
  const [customFeetMap, setCustomFeetMap] = useState<string | null>(null)
  const [showFeetBuilderModal, setShowFeetBuilderModal] = useState(false)
  const [autoCapitalizeFirstLetter, setAutoCapitalizeFirstLetter] = useState(true)
  const [autoCorrectPortuguese, setAutoCorrectPortuguese] = useState(true)

  // Google settings states
  const [googleClientId, setGoogleClientId] = useState('')
  const [googleClientSecret, setGoogleClientSecret] = useState('')
  const [googleIsAuthenticated, setGoogleIsAuthenticated] = useState(false)
  const [googleIsConfigured, setGoogleIsConfigured] = useState(false)
  const [googleAccountEmail, setGoogleAccountEmail] = useState<string | null>(null)
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
    ]).then(([enabled, time, template, _lastBackup]) => {
      setBotEnabled(enabled === 'true')
      if (time) setBotTime(time)
      if (template) setBotTemplate(template)
      else setBotTemplate('Olá {nome}! Passando para lembrar da sua consulta de podologia amanhã, {data}, às {hora}.')
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
        window.api.getSetting('auto_capitalize_first_letter'),
        window.api.getSetting('auto_correct_portuguese'),
        window.api.getSetting('google_client_id'),
        window.api.getSetting('google_client_secret'),
        window.api.getGoogleStatus()
      ]).then(([prof, clinic, addr, phone, duration, autoCap, autoCorr, gClientId, gClientSecret, gStatus]) => {
        setProfName(prof || '')
        setClinicName(clinic || '')
        setClinicAddress(addr || '')
        setClinicPhone(phone || '')
        setDefaultDuration(duration || '60')
        setAutoCapitalizeFirstLetter(autoCap === null || autoCap === undefined || autoCap === '' ? true : autoCap === 'true')
        setAutoCorrectPortuguese(autoCorr === null || autoCorr === undefined || autoCorr === '' ? true : autoCorr === 'true')
        setGoogleClientId(gClientId || '')
        setGoogleClientSecret(gClientSecret || '')
        setGoogleIsAuthenticated(Boolean(gStatus?.isConnected))
        setGoogleIsConfigured(Boolean(gStatus?.isConfigured))
        setGoogleAccountEmail(gStatus?.email || null)
      }).catch(console.error)

      window.api.getClinicLogoBase64().then((logo) => {
        setClinicLogo(logo)
      }).catch(console.error)

      window.api.getCustomFeetMapBase64().then((map) => {
        setCustomFeetMap(map)
      }).catch(console.error)

      window.api.getDiskUsage().then((usage) => {
        setDiskUsage(usage)
      }).catch(console.error)
      
      setShowResetConfirm(false)
      setResetConfirmText('')
      setSaveSuccess(false)
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

  const handleImportFeetMap = async () => {
    try {
      const mapBase64 = await window.api.pickAndSaveCustomFeetMap()
      if (mapBase64) {
        setCustomFeetMap(mapBase64)
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    } catch (err) {
      console.error('Erro ao importar mapa dos pés:', err)
    }
  }

  const handleRemoveFeetMap = async () => {
    if (window.confirm('Tem certeza que deseja restaurar o mapa dos pés padrão do sistema?')) {
      try {
        const success = await window.api.deleteCustomFeetMap()
        if (success) {
          setCustomFeetMap(null)
          setSaveSuccess(true)
          setTimeout(() => setSaveSuccess(false), 3000)
        }
      } catch (err) {
        console.error('Erro ao restaurar mapa dos pés padrão:', err)
      }
    }
  }

  const handleSavePreferences = async () => {
    try {
      await window.api.setSetting('default_appointment_duration', defaultDuration)
      await window.api.setSetting('auto_capitalize_first_letter', autoCapitalizeFirstLetter ? 'true' : 'false')
      await window.api.setSetting('auto_correct_portuguese', autoCorrectPortuguese ? 'true' : 'false')
      // Dispatch custom events to notify all windows/inputs immediately
      window.dispatchEvent(new CustomEvent('podonly-autocapitalize-changed', { detail: { enabled: autoCapitalizeFirstLetter } }))
      window.dispatchEvent(new CustomEvent('podonly-autocorrect-changed', { detail: { enabled: autoCorrectPortuguese } }))
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggleAutoCapitalize = async () => {
    const nextVal = !autoCapitalizeFirstLetter
    setAutoCapitalizeFirstLetter(nextVal)
    try {
      await window.api.setSetting('auto_capitalize_first_letter', nextVal ? 'true' : 'false')
      window.dispatchEvent(new CustomEvent('podonly-autocapitalize-changed', { detail: { enabled: nextVal } }))
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggleAutoCorrect = async () => {
    const nextVal = !autoCorrectPortuguese
    setAutoCorrectPortuguese(nextVal)
    try {
      await window.api.setSetting('auto_correct_portuguese', nextVal ? 'true' : 'false')
      window.dispatchEvent(new CustomEvent('podonly-autocorrect-changed', { detail: { enabled: nextVal } }))
    } catch (err) {
      console.error(err)
    }
  }

  const handleSaveGoogleConfig = async () => {
    try {
      const trimmedId = googleClientId.trim()
      const trimmedSecret = googleClientSecret.trim()
      if (!trimmedId || !trimmedSecret) {
        alert('Preencha o Client ID e o Client Secret.')
        return
      }
      await window.api.setSetting('google_client_id', trimmedId)
      await window.api.setSetting('google_client_secret', trimmedSecret)
      setGoogleIsConfigured(true)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error(err)
    }
  }

  const handleImportGoogleCredentials = async () => {
    const res = await window.api.importGoogleCredentialsFile()
    if (res && res.success && res.clientId && res.clientSecret) {
      setGoogleClientId(res.clientId)
      setGoogleClientSecret(res.clientSecret)
      setGoogleIsConfigured(true)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } else if (res && !res.success) {
      alert(res.error || 'Falha ao importar arquivo JSON.')
    }
  }

  const handleGoogleAuthenticate = async () => {
    const trimmedId = googleClientId.trim()
    const trimmedSecret = googleClientSecret.trim()

    if (!googleIsConfigured && (!trimmedId || !trimmedSecret)) {
      alert("Por favor, configure o Client ID e Secret primeiro ou importe o arquivo credentials.json.")
      return
    }

    if (trimmedId && trimmedSecret) {
      await window.api.setSetting('google_client_id', trimmedId)
      await window.api.setSetting('google_client_secret', trimmedSecret)
      setGoogleIsConfigured(true)
    }

    try {
      const success = await window.api.authenticateGoogle()
      if (success) {
        const status = await window.api.getGoogleStatus()
        setGoogleIsAuthenticated(true)
        setGoogleAccountEmail(status.email)
        setGoogleIsSyncing(true)
        const result = await window.api.pullFromGoogleCalendar()
        if (result && !result.success) {
          alert(`Erro na sincronização inicial: ${result.error}`)
        }
        setGoogleIsSyncing(false)
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao autenticar com o Google.')
      setGoogleIsSyncing(false)
    }
  }

  const handleGoogleDisconnect = async () => {
    if (window.confirm('Tem certeza que deseja desconectar sua conta do Google?')) {
      await window.api.disconnectGoogle()
      setGoogleIsAuthenticated(false)
      setGoogleAccountEmail(null)
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

  const [sendingWhatsappId, setSendingWhatsappId] = useState<number | null>(null)
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null)
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
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

  const now = new Date()
  const completedCount = appointments.filter(a => a.status === 'COMPLETED').length
  const pendingCount = appointments.filter(a => a.status !== 'COMPLETED' && a.status !== 'CANCELLED').length

  const nextAppt = appointments.find(a => isFuture(new Date(a.end_time)) && a.status !== 'COMPLETED' && a.status !== 'CANCELLED')
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
      const isNext = appt.id === nextApptId
      const isPastAppt = isBefore(end, now)
      const isCompleted = appt.status === 'COMPLETED'
      const badge = getStatusBadge(appt.status)

      items.push(
        <div 
          key={`appt-${appt.id}`} 
          className={`agenda-card ${isNext ? 'agenda-card-next' : ''} ${isPastAppt ? 'agenda-card-past' : ''}`}
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
              onClick={(e) => handleToggleStatus(e, appt.id, appt.status)}
              style={{
                padding: '0.4rem 0.65rem',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: isCompleted ? '#16a34a' : 'var(--text-secondary)',
                borderColor: isCompleted ? 'rgba(22, 163, 74, 0.3)' : 'var(--surface-border)',
                background: isCompleted ? 'rgba(22, 163, 74, 0.08)' : 'white'
              }}
            >
              <CheckCircle2 size={14} color={isCompleted ? '#16a34a' : 'currentColor'} />
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
  else if (hour >= 18) greeting = 'Boa noite'

  return (
    <div className="dashboard-container animate-fade-in-up">
      {/* Toast Feedback */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: toast.type === 'error' ? '#ef4444' : '#10b981',
          color: 'white',
          padding: '0.75rem 1.25rem',
          borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          fontSize: '0.85rem',
          fontWeight: 600,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          animation: 'pageFadeInUp 0.2s ease-out'
        }}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {toast.message}
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
          onClick={() => setShowSettingsModal(true)}
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
                  <CreditCard size={15} /> Assinatura
                </button>
                <button
                  className={`settings-tab-btn ${activeSettingsTab === 'security' ? 'active' : ''}`}
                  onClick={() => { setActiveSettingsTab('security'); setSaveSuccess(false); }}
                >
                  <Shield size={15} /> Segurança & Auditoria
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

                      {/* Primeiras Letras em Maiúsculo (Caps Automático) Switch */}
                      <div
                        className="toggle-switch-wrapper"
                        onClick={handleToggleAutoCapitalize}
                        style={{ marginTop: '0.5rem' }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', paddingRight: '1rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                            Primeira Letra Maiúscula Automática (Auto Caps)
                          </span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            Inicia automaticamente campos e frases com letra maiúscula ao digitar, sem precisar pressionar Caps Lock ou Shift.
                          </span>
                        </div>

                        <div className={`toggle-switch-track ${autoCapitalizeFirstLetter ? 'active' : ''}`}>
                          <div className="toggle-switch-thumb" />
                        </div>
                      </div>

                      {/* Auto-Correção em Português (pt-BR) Switch */}
                      <div
                        className="toggle-switch-wrapper"
                        onClick={handleToggleAutoCorrect}
                        style={{ marginTop: '0.75rem' }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', paddingRight: '1rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                            Auto-Correção em Português (pt-BR)
                          </span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            Aplica automaticamente acentos em palavras comuns (ex: nao $\rightarrow$ não, voce $\rightarrow$ você) e corrige erros de digitação ao pressionar Espaço ou pontuação.
                          </span>
                        </div>

                        <div className={`toggle-switch-track ${autoCorrectPortuguese ? 'active' : ''}`}>
                          <div className="toggle-switch-thumb" />
                        </div>
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

                    {/* Feet Map Canvas Customization Section */}
                    <div className="modal-section" style={{ marginTop: '1.75rem' }}>
                      <div className="modal-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <span>Mapa Anatômico dos Pés (Canvas Clínico)</span>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '0.2rem 0.65rem',
                          borderRadius: '12px',
                          background: customFeetMap ? 'rgba(16, 185, 129, 0.15)' : 'rgba(14, 145, 168, 0.12)',
                          color: customFeetMap ? '#10b981' : 'var(--accent-color)',
                          border: `1px solid ${customFeetMap ? 'rgba(16, 185, 129, 0.3)' : 'rgba(14, 145, 168, 0.25)'}`
                        }}>
                          {customFeetMap ? '⭐ Modelo Personalizado Ativo' : '✓ Modelo Padrão do Sistema'}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Defina a imagem de fundo anatômica dos pés usada para demarcações de patologias e desenhos nas consultas clínicas.
                      </p>

                      <div style={{
                        marginTop: '1rem',
                        padding: '1.25rem',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '10px',
                        border: '1px dashed var(--surface-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1rem'
                      }}>
                        <div style={{
                          width: '100%',
                          maxWidth: '380px',
                          height: '200px',
                          borderRadius: '8px',
                          background: '#ffffff',
                          border: '1px solid rgba(0,0,0,0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          padding: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                        }}>
                          <img
                            src={customFeetMap || feetMapDefaultImg}
                            alt="Mapa dos pés"
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{
                              fontSize: '0.82rem',
                              padding: '0.45rem 1rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              background: 'linear-gradient(135deg, #0e91a8, #0d9488)',
                              boxShadow: '0 2px 8px rgba(14, 145, 168, 0.25)'
                            }}
                            onClick={() => setShowFeetBuilderModal(true)}
                          >
                            <Sliders size={14} /> Construtor de Mapa Anatômico & Símbolos
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: '0.82rem', padding: '0.45rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                            onClick={handleImportFeetMap}
                          >
                            <Upload size={14} /> {customFeetMap ? 'Substituir Diagrama dos Pés' : 'Importar Seu Diagrama / Canvas'}
                          </button>
                          {customFeetMap && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                              onClick={handleRemoveFeetMap}
                            >
                              <RotateCcw size={14} /> Restaurar Padrão
                            </button>
                          )}
                        </div>

                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                          Formatos suportados: <strong>PNG, JPG, JPEG ou WEBP</strong> (até 10MB). Recomendamos imagem nítida com fundo branco.
                        </div>
                      </div>
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
                        Para sincronizar com sua Google Agenda, insira suas credenciais da API do Google Console ou importe o arquivo <code>credentials.json</code>.
                      </p>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <button 
                          className="btn btn-secondary" 
                          type="button" 
                          onClick={handleImportGoogleCredentials}
                          style={{ flex: 1, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                        >
                          <Upload size={14} /> Importar credentials.json
                        </button>
                        <button 
                          className="btn btn-secondary" 
                          type="button" 
                          onClick={() => window.api.openExternalBrowser('https://console.cloud.google.com/apis/credentials')}
                          style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                          title="Abrir Google Cloud Console"
                        >
                          <ExternalLink size={14} /> Google Cloud Console
                        </button>
                      </div>

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
                          {googleIsAuthenticated 
                            ? `Conectado com o Google Agenda ${googleAccountEmail ? `(${googleAccountEmail})` : ''}` 
                            : 'Não autenticado'}
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
                      <div className="modal-section-title">Gerar Backup Criptografado (.zip.gcm)</div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        Gera um arquivo de backup ultra-seguro (AES-256-GCM) protegido por senha.
                      </p>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <input
                          type="password"
                          className="form-control"
                          placeholder="Digite uma senha para proteger o backup"
                          id="backup-password-input"
                          style={{ marginBottom: '0.5rem' }}
                        />
                        <button
                          className="btn btn-primary"
                          onClick={async () => {
                            const pwdInput = document.getElementById('backup-password-input') as HTMLInputElement
                            const pwd = pwdInput?.value
                            if (!pwd || pwd.length < 4) {
                              alert('Por favor, digite uma senha de pelo menos 4 caracteres.')
                              return
                            }
                            const success = await window.api.exportEncryptedBackup(pwd)
                            if (success) {
                              alert('Backup criptografado exportado com sucesso!')
                              if (pwdInput) pwdInput.value = ''
                            }
                          }}
                          style={{ width: '100%', fontSize: '0.85rem' }}
                        >
                          <Download size={14} style={{ marginRight: '0.25rem' }} /> Exportar Backup Criptografado
                        </button>
                      </div>
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

                {activeSettingsTab === 'security' && (
                  <div className="modal-section">
                    <div className="modal-section-title" style={{ color: 'var(--primary-color)' }}>Segurança e Auditoria</div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div className="danger-zone-box" style={{ borderColor: 'var(--accent-color)' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--accent-color)' }}>Bloqueio de Sessão</h4>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          O sistema é bloqueado automaticamente após 15 minutos de inatividade. Você também pode bloquear imediatamente.
                        </p>
                        <button
                          className="btn btn-secondary"
                          onClick={() => window.api.lockSession()}
                          style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}
                        >
                          <Shield size={14} style={{ marginRight: '0.25rem' }} /> Bloquear Sessão Agora
                        </button>
                      </div>

                      <div style={{ background: 'rgba(14, 145, 168, 0.05)', borderRadius: 'var(--radius)', padding: '1rem' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>Logs de Auditoria</h4>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                          Histórico de ações críticas do sistema. Apenas usuários administradores podem visualizar.
                        </p>
                        <button
                          className="btn btn-secondary"
                          onClick={async () => {
                            const logs = await window.api.getAuditLogs()
                            const win = window.open('', '_blank')
                            if (win) {
                              win.document.write('<html><head><title>Logs de Auditoria</title><style>body { font-family: monospace; padding: 20px; background: #111; color: #0f0; } table { width: 100%; border-collapse: collapse; } th, td { padding: 8px; border: 1px solid #333; text-align: left; }</style></head><body>')
                              win.document.write('<h2>Registro de Auditoria (Podonly)</h2><table><tr><th>ID</th><th>Ator</th><th>Ação</th><th>Alvo</th><th>Detalhes</th><th>Data/Hora</th></tr>')
                              logs.forEach((log: any) => {
                                win.document.write(`<tr><td>${log.id}</td><td>${log.actor}</td><td>${log.action}</td><td>${log.target || '-'}</td><td>${log.details || '-'}</td><td>${new Date(log.timestamp).toLocaleString()}</td></tr>`)
                              })
                              win.document.write('</table></body></html>')
                            }
                          }}
                          style={{ fontSize: '0.85rem' }}
                        >
                          Visualizar Logs de Auditoria
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showFeetBuilderModal && (
        <FeetCanvasBuilderModal
          isOpen={showFeetBuilderModal}
          onClose={() => setShowFeetBuilderModal(false)}
          onTemplateSaved={() => {
            window.api.getCustomFeetMapBase64().then(setCustomFeetMap).catch(console.error)
          }}
        />
      )}
    </div>
  )
}
