import React, { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, dateFnsLocalizer, Views, View } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import { format, parse, startOfWeek, getDay, addMinutes, differenceInMinutes, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import { PatientListItem, AppointmentStatus } from '../../../shared/types'
import {
  Calendar as CalendarIcon,
  RefreshCw,
  LogIn,
  LogOut,
  Plus,
  Settings,
  Search,
  CheckCircle2,
  Clock,
  Send,
  User,
  Trash2,
  Edit3,
  X,
  ChevronLeft,
  ChevronRight,
  Globe,
  Upload,
  AlertCircle,
  DollarSign,
  Phone,
  FileText,
  ExternalLink
} from 'lucide-react'

const locales = {
  'pt-BR': ptBR,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

interface CalendarEvent {
  id: number
  title: string
  start: Date
  end: Date
  start_time: string
  end_time: string
  patient_id?: number | null
  notes?: string | null
  google_event_id?: string | null
  status: AppointmentStatus
  service_type?: string | null
  price?: number | null
}

const DnDCalendar = withDragAndDrop<CalendarEvent>(Calendar)

export const PROCEDURES_LIST = [
  { label: 'Podologia Tradicional / Completa', duration: 60, price: 120 },
  { label: 'Tratamento de Órtese', duration: 30, price: 80 },
  { label: 'Laserterapia', duration: 30, price: 70 },
  { label: 'Onicocriptose (Unha Encravada)', duration: 45, price: 100 },
  { label: 'Tratamento de Verruga Plantar', duration: 45, price: 90 },
  { label: 'Curativo / Retorno', duration: 30, price: 50 },
  { label: 'Avaliação Inicial', duration: 30, price: 60 },
  { label: 'Outro / Personalizado', duration: 60, price: 0 }
]

export const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string; bg: string; border: string }> = {
  SCHEDULED: {
    label: 'Agendado',
    color: '#0284c7',
    bg: 'rgba(2, 132, 199, 0.9)',
    border: '#0284c7'
  },
  CONFIRMED: {
    label: 'Confirmado',
    color: '#16a34a',
    bg: 'rgba(22, 163, 74, 0.9)',
    border: '#16a34a'
  },
  COMPLETED: {
    label: 'Concluído',
    color: '#64748b',
    bg: 'rgba(100, 116, 139, 0.9)',
    border: '#64748b'
  },
  CANCELLED: {
    label: 'Cancelado',
    color: '#dc2626',
    bg: 'rgba(220, 38, 38, 0.85)',
    border: '#dc2626'
  },
  NO_SHOW: {
    label: 'Faltou',
    color: '#ea580c',
    bg: 'rgba(234, 88, 12, 0.85)',
    border: '#ea580c'
  }
}

export default function CalendarScreen(): React.JSX.Element {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [currentView, setCurrentView] = useState<View>(Views.WEEK)
  const [patients, setPatients] = useState<PatientListItem[]>([])

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | AppointmentStatus>('ALL')

  // Modals & States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)
  const [accountEmail, setAccountEmail] = useState<string | null>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false)
  const [configTab, setConfigTab] = useState<'import' | 'manual'>('import')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [saveToast, setSaveToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null)
  const [defaultDuration, setDefaultDuration] = useState(60)
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)
  const [sendingWhatsappId, setSendingWhatsappId] = useState<number | null>(null)

  // Form State
  const [editingId, setEditingId] = useState<number | null>(null)
  const [patientId, setPatientId] = useState<string>('')
  const [patientSearch, setPatientSearch] = useState('')
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false)
  const [customTitle, setCustomTitle] = useState('')
  const [serviceType, setServiceType] = useState(PROCEDURES_LIST[0].label)
  const [appointmentStatus, setAppointmentStatus] = useState<AppointmentStatus>('SCHEDULED')
  const [price, setPrice] = useState<string>('120')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [notes, setNotes] = useState('')
  const patientDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadAppointments()
    loadPatients()
    checkAuthStatus().then((isAuth) => {
      if (isAuth) {
        handleSync(false)
      }
    })

    window.api.getSetting('last_google_sync_time').then((time) => {
      if (time) setLastSyncTime(time)
    }).catch(console.error)

    window.api.getSetting('default_appointment_duration').then((duration) => {
      if (duration) {
        setDefaultDuration(parseInt(duration, 10) || 60)
      }
    }).catch(console.error)

    const handleGlobalSync = () => {
      handleSync(true)
    }

    window.addEventListener('trigger-calendar-sync', handleGlobalSync)
    return () => window.removeEventListener('trigger-calendar-sync', handleGlobalSync)
  }, [])

  // Close patient dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (patientDropdownRef.current && !patientDropdownRef.current.contains(event.target as Node)) {
        setIsPatientDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const checkAuthStatus = async () => {
    try {
      const status = await window.api.getGoogleStatus()
      setIsAuthenticated(status.isConnected)
      setIsConfigured(status.isConfigured)
      setAccountEmail(status.email)

      const id = await window.api.getSetting('google_client_id')
      const secret = await window.api.getSetting('google_client_secret')
      if (id) setClientId(id)
      if (secret) setClientSecret(secret)

      return status.isConnected
    } catch {
      const isConn = await window.api.isGoogleConnected()
      setIsAuthenticated(isConn)
      return isConn
    }
  }

  const loadPatients = async () => {
    const p = await window.api.listPatients('alphabetical', '')
    setPatients(p)
  }

  const loadAppointments = async () => {
    const appointments = await window.api.getAllAppointments()
    setEvents(appointments.map(a => ({
      ...a,
      start: new Date(a.start_time),
      end: new Date(a.end_time),
      title: a.title,
      status: a.status || 'SCHEDULED',
      service_type: a.service_type || null,
      price: a.price ?? null
    })))
  }

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setSaveToast({ message, type })
    setTimeout(() => setSaveToast(null), 3500)
  }

  const handleSaveConfig = async () => {
    const trimmedId = clientId.trim()
    const trimmedSecret = clientSecret.trim()
    if (!trimmedId || !trimmedSecret) {
      showToast('Preencha o Client ID e o Client Secret.', 'error')
      return
    }
    await window.api.setSetting('google_client_id', trimmedId)
    await window.api.setSetting('google_client_secret', trimmedSecret)
    setIsConfigured(true)
    showToast('Credenciais do Google salvas com sucesso!')
    setShowAdvancedConfig(false)
  }

  const handleImportCredentialsFile = async () => {
    const res = await window.api.importGoogleCredentialsFile()
    if (res && res.success && res.clientId && res.clientSecret) {
      setClientId(res.clientId)
      setClientSecret(res.clientSecret)
      setIsConfigured(true)
      showToast('Arquivo de credenciais importado com sucesso!')
      setShowAdvancedConfig(false)
    } else if (res && !res.success) {
      showToast(res.error || 'Falha ao importar arquivo JSON.', 'error')
    }
  }

  const handleAuthenticate = async () => {
    const trimmedId = clientId.trim()
    const trimmedSecret = clientSecret.trim()

    if (!isConfigured && (!trimmedId || !trimmedSecret)) {
      setShowConfig(true)
      setShowAdvancedConfig(true)
      showToast('Configure o Client ID ou importe o arquivo JSON do Google Cloud primeiro.', 'error')
      return
    }

    if (trimmedId && trimmedSecret) {
      await window.api.setSetting('google_client_id', trimmedId)
      await window.api.setSetting('google_client_secret', trimmedSecret)
      setIsConfigured(true)
    }

    setIsAuthenticating(true)
    try {
      const success = await window.api.authenticateGoogle()
      if (success) {
        await checkAuthStatus()
        showToast('Google Agenda conectado com sucesso!')
        setShowConfig(false)
        handleSync(false)
      }
    } catch (e: any) {
      showToast(e.message || 'Erro na autenticação do Google.', 'error')
    } finally {
      setIsAuthenticating(false)
    }
  }

  const handleCancelAuth = async () => {
    await window.api.cancelGoogleAuth()
    setIsAuthenticating(false)
    showToast('Tentativa de autenticação cancelada.')
  }

  const handleDisconnect = async () => {
    if (window.confirm('Tem certeza que deseja desconectar sua conta do Google Agenda?')) {
      await window.api.disconnectGoogle()
      setIsAuthenticated(false)
      setAccountEmail(null)
      showToast('Conta do Google desconectada.')
    }
  }

  const handleSync = async (notify = true) => {
    const isConn = await window.api.isGoogleConnected()
    if (!isConn) {
      if (notify) showToast('Conecte sua conta do Google Agenda para sincronizar.', 'error')
      return
    }

    setIsSyncing(true)
    try {
      const result = await window.api.pullFromGoogleCalendar()
      if (result && result.success) {
        await loadAppointments()
        const nowIso = new Date().toISOString()
        await window.api.setSetting('last_google_sync_time', nowIso)
        setLastSyncTime(nowIso)
        if (notify) showToast(`Sincronização concluída! (${result.syncedCount || 0} eventos atualizados)`)
      } else if (result && !result.success) {
        if (result.error === 'AUTH_ERROR') {
          setIsAuthenticated(false)
          showToast('Sessão do Google Agenda expirada. Reconecte a conta.', 'error')
        } else if (notify) {
          showToast(`Erro na sincronização: ${result.error}`, 'error')
        }
      }
    } catch (e: any) {
      if (notify) showToast(`Erro ao sincronizar: ${e.message}`, 'error')
    } finally {
      setIsSyncing(false)
    }
  }

  // Quick Action: Send WhatsApp Reminder
  const handleSendWhatsappReminder = async (appointmentId: number) => {
    setSendingWhatsappId(appointmentId)
    try {
      const res = await window.api.sendSingleAppointmentReminder(appointmentId)
      if (res && res.success) {
        showToast('✓ Lembrete de consulta enviado via WhatsApp!')
      } else {
        showToast(res?.error || 'Falha ao enviar lembrete via WhatsApp.', 'error')
      }
    } catch (e: any) {
      showToast(e.message || 'Erro ao comunicar com WhatsApp.', 'error')
    } finally {
      setSendingWhatsappId(null)
    }
  }

  // Quick Action: Quick Status Update
  const handleQuickStatusChange = async (event: CalendarEvent, newStatus: AppointmentStatus) => {
    // Optimistic update
    setEvents(prev => prev.map(e => e.id === event.id ? { ...e, status: newStatus } : e))
    if (selectedEvent && selectedEvent.id === event.id) {
      setSelectedEvent({ ...selectedEvent, status: newStatus })
    }

    await window.api.updateAppointment(event.id, { status: newStatus })
    showToast(`Status atualizado para: ${STATUS_CONFIG[newStatus].label}`)
  }

  const handleSelectSlot = ({ start }: { start: Date }) => {
    openModalForNew(start)
  }

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setIsQuickViewOpen(true)
  }

  const openModalForNew = (start?: Date) => {
    const baseStart = start || new Date()
    const calculatedEnd = addMinutes(baseStart, defaultDuration)
    
    setEditingId(null)
    setPatientId('')
    setPatientSearch('')
    setCustomTitle('')
    setServiceType(PROCEDURES_LIST[0].label)
    setAppointmentStatus('SCHEDULED')
    setPrice(String(PROCEDURES_LIST[0].price))
    setStartDate(format(baseStart, 'yyyy-MM-dd'))
    setStartTime(format(baseStart, 'HH:mm'))
    setEndDate(format(calculatedEnd, 'yyyy-MM-dd'))
    setEndTime(format(calculatedEnd, 'HH:mm'))
    setNotes('')
    setIsQuickViewOpen(false)
    setIsModalOpen(true)
  }

  const openModalForEdit = (event: CalendarEvent) => {
    setEditingId(event.id)
    setPatientId(event.patient_id ? String(event.patient_id) : '')
    
    const matchedPatient = patients.find(p => p.id === event.patient_id)
    setPatientSearch(matchedPatient ? `${matchedPatient.first_name} ${matchedPatient.last_name}` : '')
    setCustomTitle(event.title)
    setServiceType(event.service_type || PROCEDURES_LIST[0].label)
    setAppointmentStatus(event.status || 'SCHEDULED')
    setPrice(event.price !== null && event.price !== undefined ? String(event.price) : '')
    
    const startD = new Date(event.start_time)
    const endD = new Date(event.end_time)
    setStartDate(format(startD, 'yyyy-MM-dd'))
    setStartTime(format(startD, 'HH:mm'))
    setEndDate(format(endD, 'yyyy-MM-dd'))
    setEndTime(format(endD, 'HH:mm'))
    setNotes(event.notes || '')
    
    setIsQuickViewOpen(false)
    setIsModalOpen(true)
  }

  const handleProcedureChange = (selectedLabel: string) => {
    setServiceType(selectedLabel)
    const proc = PROCEDURES_LIST.find(p => p.label === selectedLabel)
    if (proc) {
      if (proc.price > 0) setPrice(String(proc.price))
      if (startDate && startTime) {
        const startDt = new Date(`${startDate}T${startTime}`)
        const endDt = addMinutes(startDt, proc.duration)
        setEndDate(format(endDt, 'yyyy-MM-dd'))
        setEndTime(format(endDt, 'HH:mm'))
      }
    }
  }

  const handleSelectPatientAutocomplete = (p: PatientListItem) => {
    setPatientId(String(p.id))
    setPatientSearch(`${p.first_name} ${p.last_name}`)
    setIsPatientDropdownOpen(false)
    if (!customTitle || customTitle === 'Consulta') {
      setCustomTitle(`${p.first_name} ${p.last_name}`)
    }
  }

  const handleEventDrop = async ({ event, start, end }: { event: CalendarEvent; start: string | Date; end: string | Date }) => {
    const startDateObj = typeof start === 'string' ? new Date(start) : start
    const endDateObj = typeof end === 'string' ? new Date(end) : end
    const startIso = startDateObj.toISOString()
    const endIso = endDateObj.toISOString()
    
    setEvents(prev => prev.map(e => e.id === event.id ? { ...e, start: startDateObj, end: endDateObj, start_time: startIso, end_time: endIso } : e))
    await window.api.updateAppointment(event.id, { start_time: startIso, end_time: endIso })
    showToast('Agendamento reagendado com sucesso!')
  }

  const handleEventResize = async ({ event, start, end }: { event: CalendarEvent; start: string | Date; end: string | Date }) => {
    const startDateObj = typeof start === 'string' ? new Date(start) : start
    const endDateObj = typeof end === 'string' ? new Date(end) : end
    const startIso = startDateObj.toISOString()
    const endIso = endDateObj.toISOString()
    
    setEvents(prev => prev.map(e => e.id === event.id ? { ...e, start: startDateObj, end: endDateObj, start_time: startIso, end_time: endIso } : e))
    await window.api.updateAppointment(event.id, { start_time: startIso, end_time: endIso })
    showToast('Duração da consulta ajustada.')
  }

  const saveAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    const startIso = new Date(`${startDate}T${startTime}`).toISOString()
    const endIso = new Date(`${endDate}T${endTime}`).toISOString()

    const selectedPatient = patientId ? patients.find(p => p.id === parseInt(patientId, 10)) : null
    let eventTitle = customTitle.trim()
    if (!eventTitle) {
      eventTitle = selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}`.trim() : 'Consulta'
    }

    const payload = {
      patient_id: patientId ? parseInt(patientId, 10) : null,
      title: eventTitle,
      start_time: startIso,
      end_time: endIso,
      notes: notes.trim() || null,
      google_event_id: null,
      status: appointmentStatus,
      service_type: serviceType,
      price: price ? parseFloat(price.replace(',', '.')) : null
    }

    if (editingId) {
      await window.api.updateAppointment(editingId, payload)
      showToast('Agendamento atualizado com sucesso!')
    } else {
      await window.api.createAppointment(payload)
      showToast('Novo agendamento criado com sucesso!')
    }

    setIsModalOpen(false)
    loadAppointments()
  }

  const deleteAppt = async (idToDelete?: number) => {
    const targetId = idToDelete || editingId
    if (!targetId) return
    if (window.confirm('Tem certeza que deseja excluir este agendamento?')) {
      await window.api.deleteAppointment(targetId)
      setIsModalOpen(false)
      setIsQuickViewOpen(false)
      showToast('Agendamento excluído.')
      loadAppointments()
    }
  }

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const matchesSearch = !searchQuery || 
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.service_type && e.service_type.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.notes && e.notes.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [events, searchQuery, statusFilter])

  // Autocomplete patient matches
  const filteredPatients = useMemo(() => {
    if (!patientSearch) return patients.slice(0, 8)
    const q = patientSearch.toLowerCase()
    return patients.filter(p => 
      p.first_name.toLowerCase().includes(q) || 
      p.last_name.toLowerCase().includes(q) ||
      (p.phone && p.phone.includes(q))
    ).slice(0, 8)
  }, [patients, patientSearch])

  // Relative sync time
  const formattedSyncTime = useMemo(() => {
    if (!lastSyncTime) return null
    try {
      return formatDistanceToNow(new Date(lastSyncTime), { addSuffix: true, locale: ptBR })
    } catch {
      return null
    }
  }, [lastSyncTime, isSyncing])

  return (
    <>
      <div className="glass-card" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', padding: '1.25rem' }}>
        
        {/* Toast Alert */}
        {saveToast && createPortal(
          <div style={{ 
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            padding: '0.9rem 1.4rem', 
            backgroundColor: saveToast.type === 'error' ? 'var(--danger-color)' : 'var(--success-color)', 
            border: '1px solid rgba(255,255,255,0.3)', 
            borderRadius: '12px',
            color: 'white',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            zIndex: 9999,
            animation: 'pageFadeInUp 0.3s ease-out',
            fontWeight: 500,
            fontSize: '0.9rem'
          }}>
            {saveToast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            {saveToast.message}
          </div>,
          document.body
        )}
        
        {/* Top Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h2 className="section-title" style={{ border: 'none', margin: 0, padding: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <CalendarIcon size={24} color="var(--accent-color)" /> Agenda
            </h2>

            {/* Google Sync Status Pill */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(14, 145, 168, 0.08)',
              border: '1px solid var(--surface-border)',
              padding: '0.35rem 0.85rem',
              borderRadius: '20px',
              fontSize: '0.82rem'
            }}>
              <Globe size={14} color={isAuthenticated ? 'var(--accent-color)' : 'var(--text-secondary)'} />
              <span style={{ fontWeight: 500, color: isAuthenticated ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {isAuthenticated ? (accountEmail ? `Google: ${accountEmail}` : 'Google Agenda Ativo') : 'Google Desconectado'}
              </span>
              {formattedSyncTime && isAuthenticated && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.8 }}>
                  • {formattedSyncTime}
                </span>
              )}
              {isAuthenticated && (
                <button
                  onClick={() => handleSync(true)}
                  disabled={isSyncing}
                  title="Sincronizar agora com Google Agenda"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--accent-color)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 2px'
                  }}
                >
                  <RefreshCw size={13} className={isSyncing ? 'spin' : ''} />
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {!isAuthenticated ? (
              <button className="btn btn-secondary" onClick={() => setShowConfig(true)} style={{ fontSize: '0.85rem' }}>
                <LogIn size={16} /> Conectar Google
              </button>
            ) : (
              <button 
                className="btn btn-secondary" 
                onClick={() => handleSync(true)} 
                disabled={isSyncing}
                style={{ fontSize: '0.85rem' }}
              >
                <RefreshCw size={16} className={isSyncing ? 'spin' : ''} /> {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
              </button>
            )}
            
            <button className="btn btn-primary" onClick={() => openModalForNew()} style={{ fontSize: '0.85rem' }}>
              <Plus size={18} /> Novo Agendamento
            </button>

            <button className="btn-icon-subtle" onClick={() => setShowConfig(true)} title="Configurações do Google Calendar" style={{ padding: '0.5rem' }}>
              <Settings size={18} />
            </button>
          </div>
        </div>

        {/* Custom Glassmorphic Toolbar: View Switchers, Navigation & Filters */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.4)',
          border: '1px solid var(--surface-border)',
          borderRadius: '12px',
          padding: '0.6rem 1rem',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          {/* Navigation Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
              onClick={() => setCurrentDate(new Date())}
            >
              Hoje
            </button>
            <div style={{ display: 'flex', gap: '2px' }}>
              <button
                className="btn-icon-subtle"
                style={{ padding: '0.35rem 0.5rem' }}
                onClick={() => {
                  if (currentView === Views.MONTH) {
                    const prevMonth = new Date(currentDate)
                    prevMonth.setMonth(prevMonth.getMonth() - 1)
                    setCurrentDate(prevMonth)
                  } else if (currentView === Views.WEEK) {
                    const prevWeek = new Date(currentDate)
                    prevWeek.setDate(prevWeek.getDate() - 7)
                    setCurrentDate(prevWeek)
                  } else {
                    const prevDay = new Date(currentDate)
                    prevDay.setDate(prevDay.getDate() - 1)
                    setCurrentDate(prevDay)
                  }
                }}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                className="btn-icon-subtle"
                style={{ padding: '0.35rem 0.5rem' }}
                onClick={() => {
                  if (currentView === Views.MONTH) {
                    const nextMonth = new Date(currentDate)
                    nextMonth.setMonth(nextMonth.getMonth() + 1)
                    setCurrentDate(nextMonth)
                  } else if (currentView === Views.WEEK) {
                    const nextWeek = new Date(currentDate)
                    nextWeek.setDate(nextWeek.getDate() + 7)
                    setCurrentDate(nextWeek)
                  } else {
                    const nextDay = new Date(currentDate)
                    nextDay.setDate(nextDay.getDate() + 1)
                    setCurrentDate(nextDay)
                  }
                }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
            
            <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)', marginLeft: '0.5rem' }}>
              {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())}
            </span>
          </div>

          {/* Quick Search */}
          <div style={{ position: 'relative', width: '220px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Buscar consulta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '0.4rem 0.75rem 0.4rem 2rem', fontSize: '0.85rem' }}
            />
          </div>

          {/* Status Filter Chips */}
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            <button
              onClick={() => setStatusFilter('ALL')}
              style={{
                border: 'none',
                background: statusFilter === 'ALL' ? 'var(--accent-color)' : 'transparent',
                color: statusFilter === 'ALL' ? 'white' : 'var(--text-secondary)',
                padding: '0.3rem 0.65rem',
                borderRadius: '16px',
                fontSize: '0.78rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Todos ({events.length})
            </button>
            {(['CONFIRMED', 'SCHEDULED', 'COMPLETED'] as AppointmentStatus[]).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(statusFilter === st ? 'ALL' : st)}
                style={{
                  border: `1px solid ${STATUS_CONFIG[st].border}`,
                  background: statusFilter === st ? STATUS_CONFIG[st].color : 'transparent',
                  color: statusFilter === st ? 'white' : STATUS_CONFIG[st].color,
                  padding: '0.25rem 0.6rem',
                  borderRadius: '16px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {STATUS_CONFIG[st].label}
              </button>
            ))}
          </div>

          {/* View Toggles */}
          <div style={{ display: 'flex', background: 'rgba(14, 145, 168, 0.08)', borderRadius: '20px', padding: '3px' }}>
            {[
              { id: Views.MONTH, label: 'Mês' },
              { id: Views.WEEK, label: 'Semana' },
              { id: Views.DAY, label: 'Dia' }
            ].map(v => (
              <button
                key={v.id}
                onClick={() => setCurrentView(v.id as View)}
                style={{
                  border: 'none',
                  background: currentView === v.id ? 'var(--accent-color)' : 'transparent',
                  color: currentView === v.id ? 'white' : 'var(--text-secondary)',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '16px',
                  fontSize: '0.82rem',
                  fontWeight: currentView === v.id ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Calendar View */}
        <div className="calendar-container" style={{ flex: 1, backgroundColor: 'white', borderRadius: '12px', padding: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          <DnDCalendar
            localizer={localizer}
            events={filteredEvents}
            date={currentDate}
            view={currentView}
            toolbar={false}
            onNavigate={(newDate) => setCurrentDate(newDate)}
            onView={(newView) => setCurrentView(newView)}
            startAccessor={(event: CalendarEvent) => event.start}
            endAccessor={(event: CalendarEvent) => event.end}
            style={{ height: '100%' }}
            culture="pt-BR"
            selectable
            resizable
            onEventDrop={handleEventDrop}
            onEventResize={handleEventResize}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            step={15}
            timeslots={4}
            eventPropGetter={(event: CalendarEvent) => {
              const config = STATUS_CONFIG[event.status] || STATUS_CONFIG.SCHEDULED
              const isGoogle = !!event.google_event_id
              return {
                style: {
                  backgroundColor: config.bg,
                  borderRadius: '6px',
                  color: 'white',
                  borderLeft: `4px solid ${isGoogle ? '#f59e0b' : config.color}`,
                  padding: '3px 6px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                  fontSize: '0.82rem',
                  fontWeight: 500
                }
              }
            }}
          />
        </div>
      </div>

      {/* Quick Event Summary Popover Modal */}
      {isQuickViewOpen && selectedEvent && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          backdropFilter: 'blur(3px)'
        }}>
          <div className="glass-card" style={{ width: '480px', background: 'white', padding: '1.5rem', animation: 'pageFadeInUp 0.25s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: STATUS_CONFIG[selectedEvent.status]?.bg || 'rgba(0,0,0,0.1)',
                    color: 'white'
                  }}>
                    {STATUS_CONFIG[selectedEvent.status]?.label || selectedEvent.status}
                  </span>
                  {selectedEvent.google_event_id && (
                    <span style={{ fontSize: '0.72rem', background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', padding: '0.2rem 0.5rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 500 }}>
                      <Globe size={11} /> Google Sync
                    </span>
                  )}
                </div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                  {selectedEvent.title}
                </h3>
              </div>
              <button className="modal-close-btn" onClick={() => setIsQuickViewOpen(false)}>
                <X size={16} />
              </button>
            </div>

            {/* Event Details Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(14, 145, 168, 0.03)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--surface-border)', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                <Clock size={16} color="var(--accent-color)" />
                <span>
                  <strong>{format(new Date(selectedEvent.start_time), "dd 'de' MMMM", { locale: ptBR })}</strong> • {format(new Date(selectedEvent.start_time), 'HH:mm')} às {format(new Date(selectedEvent.end_time), 'HH:mm')} ({differenceInMinutes(new Date(selectedEvent.end_time), new Date(selectedEvent.start_time))} min)
                </span>
              </div>

              {selectedEvent.service_type && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  <FileText size={16} color="var(--accent-color)" />
                  <span>Procedimento: <strong>{selectedEvent.service_type}</strong></span>
                </div>
              )}

              {selectedEvent.price !== null && selectedEvent.price !== undefined && selectedEvent.price > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  <DollarSign size={16} color="#16a34a" />
                  <span>Valor: <strong style={{ color: '#16a34a' }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedEvent.price)}</strong></span>
                </div>
              )}

              {selectedEvent.notes && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', borderTop: '1px dashed var(--surface-border)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                  <strong>Observações:</strong> {selectedEvent.notes}
                </div>
              )}
            </div>

            {/* Quick Actions Row */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              {selectedEvent.patient_id ? (
                <Link
                  to={`/patient/${selectedEvent.patient_id}`}
                  className="btn btn-secondary"
                  style={{ flex: 1, fontSize: '0.8rem', padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                >
                  <User size={14} /> Abrir Prontuário
                </Link>
              ) : null}

              <button
                type="button"
                className="btn btn-secondary"
                disabled={sendingWhatsappId === selectedEvent.id}
                onClick={() => handleSendWhatsappReminder(selectedEvent.id)}
                style={{ flex: 1, fontSize: '0.8rem', padding: '0.4rem 0.6rem', color: '#16a34a', borderColor: 'rgba(22, 163, 74, 0.3)', background: 'rgba(22, 163, 74, 0.05)' }}
              >
                <Send size={14} /> {sendingWhatsappId === selectedEvent.id ? 'Enviando...' : 'Lembrete WhatsApp'}
              </button>
            </div>

            {/* Status Change Buttons */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Alterar Status Rápido:
              </div>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {(Object.keys(STATUS_CONFIG) as AppointmentStatus[]).map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleQuickStatusChange(selectedEvent, st)}
                    style={{
                      border: `1px solid ${selectedEvent.status === st ? STATUS_CONFIG[st].color : 'var(--surface-border)'}`,
                      background: selectedEvent.status === st ? STATUS_CONFIG[st].bg : 'rgba(0,0,0,0.02)',
                      color: selectedEvent.status === st ? 'white' : 'var(--text-secondary)',
                      padding: '0.25rem 0.55rem',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    {STATUS_CONFIG[st].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer Form Actions */}
            <div className="form-actions" style={{ marginTop: 0, paddingTop: '1rem', borderTop: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ borderColor: 'var(--danger-color)', color: 'var(--danger-color)', fontSize: '0.85rem' }}
                onClick={() => deleteAppt(selectedEvent.id)}
              >
                <Trash2 size={15} /> Excluir
              </button>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsQuickViewOpen(false)} style={{ fontSize: '0.85rem' }}>
                  Fechar
                </button>
                <button type="button" className="btn btn-primary" onClick={() => openModalForEdit(selectedEvent)} style={{ fontSize: '0.85rem' }}>
                  <Edit3 size={15} /> Editar Completo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Create / Edit Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-card" style={{ width: '560px', background: 'white', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.75rem' }}>
              <h3 className="section-title" style={{ margin: 0, border: 'none', padding: 0 }}>
                {editingId ? 'Editar Agendamento' : 'Novo Agendamento'}
              </h3>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={saveAppointment}>
              {/* Patient Autocomplete Search */}
              <div className="form-group" style={{ position: 'relative' }} ref={patientDropdownRef}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <label className="form-label" style={{ margin: 0 }}>Vincular Paciente (Opcional)</label>
                  <Link to="/patient/new" style={{ fontSize: '0.78rem', color: 'var(--accent-color)', textDecoration: 'none', fontWeight: 500 }}>
                    + Cadastrar Novo Paciente
                  </Link>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Digite para buscar paciente por nome ou telefone..."
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value)
                      setIsPatientDropdownOpen(true)
                      if (!e.target.value) setPatientId('')
                    }}
                    onFocus={() => setIsPatientDropdownOpen(true)}
                  />
                  {patientId && (
                    <button
                      type="button"
                      onClick={() => { setPatientId(''); setPatientSearch(''); }}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Dropdown Results */}
                {isPatientDropdownOpen && filteredPatients.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    background: 'white', border: '1px solid var(--surface-border)', borderRadius: '8px',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.12)', zIndex: 100, maxHeight: '200px', overflowY: 'auto',
                    marginTop: '4px'
                  }}>
                    {filteredPatients.map(p => (
                      <div
                        key={p.id}
                        onClick={() => handleSelectPatientAutocomplete(p)}
                        style={{
                          padding: '0.6rem 1rem',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderBottom: '1px solid rgba(0,0,0,0.03)',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(14, 145, 168, 0.06)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ fontWeight: 500, fontSize: '0.88rem' }}>{p.first_name} {p.last_name}</span>
                        {p.phone && (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Phone size={12} /> {p.phone}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Title / Reason */}
              <div className="form-group">
                <label className="form-label">Título da Consulta / Motivo</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: Consulta Podologia, Retorno D. Maria, Reunião..."
                  value={customTitle}
                  onChange={e => setCustomTitle(e.target.value)}
                  required
                />
              </div>

              {/* Procedure / Service Selector */}
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Procedimento / Serviço</label>
                  <select
                    className="form-control"
                    value={serviceType}
                    onChange={e => handleProcedureChange(e.target.value)}
                  >
                    {PROCEDURES_LIST.map(p => (
                      <option key={p.label} value={p.label}>{p.label} ({p.duration} min)</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Valor do Serviço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="0.00"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                  />
                </div>
              </div>

              {/* Status Selector */}
              <div className="form-group">
                <label className="form-label">Status do Agendamento</label>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {(Object.keys(STATUS_CONFIG) as AppointmentStatus[]).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setAppointmentStatus(st)}
                      style={{
                        flex: 1,
                        minWidth: '80px',
                        border: `1px solid ${appointmentStatus === st ? STATUS_CONFIG[st].color : 'var(--surface-border)'}`,
                        background: appointmentStatus === st ? STATUS_CONFIG[st].bg : 'rgba(0,0,0,0.02)',
                        color: appointmentStatus === st ? 'white' : 'var(--text-secondary)',
                        padding: '0.4rem 0.5rem',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: appointmentStatus === st ? 600 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      {STATUS_CONFIG[st].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Time Fields */}
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Data de Início</label>
                  <input type="date" className="form-control" value={startDate} onChange={e => { setStartDate(e.target.value); setEndDate(e.target.value); }} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Hora de Início</label>
                  <input
                    type="time"
                    className="form-control"
                    value={startTime}
                    onChange={e => {
                      setStartTime(e.target.value)
                      if (startDate && e.target.value) {
                        const startDt = new Date(`${startDate}T${e.target.value}`)
                        const proc = PROCEDURES_LIST.find(p => p.label === serviceType)
                        const endDt = addMinutes(startDt, proc?.duration || defaultDuration)
                        setEndTime(format(endDt, 'HH:mm'))
                      }
                    }}
                    required
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Data de Término</label>
                  <input type="date" className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Hora de Término</label>
                  <input type="time" className="form-control" value={endTime} onChange={e => setEndTime(e.target.value)} required />
                </div>
              </div>

              {/* Notes */}
              <div className="form-group">
                <label className="form-label">Notas e Queixas Iniciais</label>
                <textarea className="form-control" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Ex: Paciente com dor na lateral do hálux direito..." />
              </div>

              <div className="form-actions">
                {editingId && (
                  <button type="button" className="btn btn-secondary" style={{ borderColor: 'var(--danger-color)', color: 'var(--danger-color)' }} onClick={() => deleteAppt()}>
                    Excluir
                  </button>
                )}
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar Agendamento</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Google Calendar Connection Modal */}
      {showConfig && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          backdropFilter: 'blur(5px)'
        }}>
          <div className="glass-card" style={{ width: '540px', maxWidth: '94vw', background: 'white', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', animation: 'pageFadeInUp 0.25s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Globe size={22} color="var(--accent-color)" />
                <h3 className="section-title" style={{ margin: 0, border: 'none', padding: 0, fontSize: '1.15rem' }}>
                  Conectar Google Agenda
                </h3>
              </div>
              <button 
                className="modal-close-btn" 
                onClick={() => {
                  if (isAuthenticating) handleCancelAuth()
                  setShowConfig(false)
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* State 1: Authenticating in Browser */}
            {isAuthenticating ? (
              <div style={{
                background: 'rgba(14, 145, 168, 0.06)',
                padding: '1.75rem 1.25rem',
                borderRadius: '12px',
                border: '1px solid var(--accent-color)',
                textAlign: 'center',
                marginBottom: '1.25rem'
              }}>
                <RefreshCw size={36} className="spin" color="var(--accent-color)" style={{ marginBottom: '0.75rem' }} />
                <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                  Aguardando autorização no navegador...
                </h4>
                <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Uma janela foi aberta no seu navegador padrão. Faça login com sua conta do Google e permita o acesso para sincronizar suas consultas.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCancelAuth}
                  style={{ fontSize: '0.85rem' }}
                >
                  Cancelar Tentativa
                </button>
              </div>
            ) : isAuthenticated ? (
              /* State 2: Already Connected */
              <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(14, 145, 168, 0.08) 100%)',
                padding: '1.25rem',
                borderRadius: '12px',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                textAlign: 'center',
                marginBottom: '1.25rem'
              }}>
                <CheckCircle2 size={40} color="#10b981" style={{ marginBottom: '0.5rem' }} />
                <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                  Conta do Google Conectada
                </h4>
                {accountEmail && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(16, 185, 129, 0.15)', color: '#065f46', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                    <Globe size={13} /> {accountEmail}
                  </div>
                )}
                <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Suas consultas do Podonly são sincronizadas automaticamente com o Google Agenda no seu celular e computador.
                </p>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={isSyncing}
                    onClick={() => handleSync(true)}
                    style={{ fontSize: '0.88rem' }}
                  >
                    <RefreshCw size={16} className={isSyncing ? 'spin' : ''} /> {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleDisconnect}
                    style={{ borderColor: 'var(--danger-color)', color: 'var(--danger-color)', fontSize: '0.88rem' }}
                  >
                    <LogOut size={16} /> Desconectar
                  </button>
                </div>
              </div>
            ) : isConfigured ? (
              /* State 3: Configured, Ready to Connect */
              <div style={{
                background: 'linear-gradient(135deg, rgba(14, 145, 168, 0.06) 0%, rgba(16, 185, 129, 0.06) 100%)',
                padding: '1.25rem',
                borderRadius: '12px',
                border: '1px solid var(--surface-border)',
                textAlign: 'center',
                marginBottom: '1.25rem'
              }}>
                <Globe size={40} color="var(--accent-color)" style={{ marginBottom: '0.5rem' }} />
                <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                  Pronto para Conectar
                </h4>
                <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Suas credenciais do Google Cloud estão configuradas. Clique no botão abaixo para fazer login com a sua conta Google e autorizar a sincronização.
                </p>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAuthenticate}
                  style={{ width: '100%', padding: '0.85rem', fontSize: '0.98rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', boxShadow: '0 4px 14px rgba(14, 145, 168, 0.25)' }}
                >
                  <LogIn size={18} /> Entrar com a Conta Google
                </button>
              </div>
            ) : (
              /* State 4: Not Configured Yet - Guided Wizard */
              <div style={{
                background: '#f8fafc',
                padding: '1.25rem',
                borderRadius: '12px',
                border: '1px solid var(--surface-border)',
                marginBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <AlertCircle size={20} color="var(--accent-color)" />
                  <h4 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                    Configuração do Google Cloud Necessária
                  </h4>
                </div>
                <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Para sincronizar com sua conta, o Google exige um ID de Cliente da sua clínica. Siga os 3 passos simples abaixo:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: '1rem', background: 'white', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
                  <div><strong>1.</strong> Abra o console do Google e ative a <strong>Google Calendar API</strong>.</div>
                  <div><strong>2.</strong> Em <em>Credenciais</em>, crie um <strong>ID do cliente OAuth 2.0</strong> (tipo: <em>Aplicativo para computador</em>).</div>
                  <div><strong>3.</strong> Baixe o arquivo <code>credentials.json</code> e importe abaixo:</div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleImportCredentialsFile}
                    style={{ flex: 1, minWidth: '200px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    <Upload size={16} /> Importar credentials.json
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => window.api.openExternalBrowser('https://console.cloud.google.com/apis/credentials')}
                    style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    title="Abrir Google Cloud Console no navegador padrão"
                  >
                    <ExternalLink size={14} /> Abrir Console
                  </button>
                </div>
              </div>
            )}

            {/* Collapsible Advanced Section for Power Users */}
            <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.25rem 0',
                  margin: '0 auto 0.75rem auto'
                }}
              >
                <Settings size={13} /> {!showAdvancedConfig ? 'Opções Avançadas de Credenciais / Manual ▼' : 'Ocultar Opções Avançadas ▲'}
              </button>

              {showAdvancedConfig && (
                <div style={{ background: '#fcfdfe', padding: '1rem', borderRadius: '10px', border: '1px solid var(--surface-border)', marginBottom: '1rem', animation: 'pageFadeInUp 0.2s ease-out' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.85rem' }}>
                    <button
                      type="button"
                      onClick={() => setConfigTab('import')}
                      style={{
                        border: 'none',
                        background: configTab === 'import' ? 'rgba(14, 145, 168, 0.12)' : 'transparent',
                        color: configTab === 'import' ? 'var(--accent-color)' : 'var(--text-secondary)',
                        padding: '0.35rem 0.65rem',
                        borderRadius: '6px',
                        fontWeight: 600,
                        fontSize: '0.78rem',
                        cursor: 'pointer'
                      }}
                    >
                      Importar JSON
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfigTab('manual')}
                      style={{
                        border: 'none',
                        background: configTab === 'manual' ? 'rgba(14, 145, 168, 0.12)' : 'transparent',
                        color: configTab === 'manual' ? 'var(--accent-color)' : 'var(--text-secondary)',
                        padding: '0.35rem 0.65rem',
                        borderRadius: '6px',
                        fontWeight: 600,
                        fontSize: '0.78rem',
                        cursor: 'pointer'
                      }}
                    >
                      Inserir Chaves Manuais
                    </button>
                  </div>

                  {configTab === 'import' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        Selecione o arquivo <code>credentials.json</code> baixado do Google Cloud Console:
                      </p>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleImportCredentialsFile}
                        style={{ padding: '0.85rem', border: '2px dashed var(--accent-color)', background: 'rgba(14, 145, 168, 0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem' }}
                      >
                        <Upload size={18} color="var(--accent-color)" /> Selecionar Arquivo JSON
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                        <label className="form-label" style={{ fontSize: '0.78rem' }}>Client ID</label>
                        <input className="form-control" style={{ fontSize: '0.82rem', padding: '0.35rem 0.6rem' }} value={clientId} onChange={e => setClientId(e.target.value)} placeholder="Ex: 123456789...apps.googleusercontent.com" />
                      </div>
                      <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                        <label className="form-label" style={{ fontSize: '0.78rem' }}>Client Secret</label>
                        <input type="password" className="form-control" style={{ fontSize: '0.82rem', padding: '0.35rem 0.6rem' }} value={clientSecret} onChange={e => setClientSecret(e.target.value)} placeholder="Ex: GOCSPX-..." />
                      </div>
                      <button type="button" className="btn btn-secondary" style={{ width: '100%', fontSize: '0.8rem', padding: '0.4rem' }} onClick={handleSaveConfig}>
                        Salvar Chaves
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="form-actions" style={{ marginTop: 0, paddingTop: 0, border: 'none' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => {
                  if (isAuthenticating) handleCancelAuth()
                  setShowConfig(false)
                }} 
                style={{ width: '100%', fontSize: '0.85rem' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

