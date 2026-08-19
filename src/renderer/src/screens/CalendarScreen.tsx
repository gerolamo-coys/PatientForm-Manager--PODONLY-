import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, dateFnsLocalizer, Views, View } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import { PatientListItem } from '../../../shared/types'
import { Calendar as CalendarIcon, RefreshCw, LogIn, LogOut, Plus, Settings } from 'lucide-react'

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
}

const DnDCalendar = withDragAndDrop<CalendarEvent>(Calendar)

export default function CalendarScreen(): React.JSX.Element {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [currentView, setCurrentView] = useState<View>(Views.WEEK)


  const [patients, setPatients] = useState<PatientListItem[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [defaultDuration, setDefaultDuration] = useState(60)

  // Form State
  const [editingId, setEditingId] = useState<number | null>(null)
  const [patientId, setPatientId] = useState<string>('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    loadAppointments()
    loadPatients()
    checkAuthStatus().then((isAuth) => {
      if (isAuth) {
        handleSync()
      }
    })

    const handleGlobalSync = () => {
      window.api.getSetting('google_auth_tokens').then((tokens) => {
        if (tokens) {
          setIsSyncing(true)
          window.api.pullFromGoogleCalendar().then((result) => {
            if (result && !result.success && result.error === 'AUTH_ERROR') {
              setIsAuthenticated(false)
              alert('Sua sessão do Google Agenda expirou. Por favor, faça login novamente na aba de configurações na tela inicial.')
            } else if (result && !result.success) {
              alert(`Erro na sincronização: ${result.error}`)
            }
            loadAppointments().then(() => setIsSyncing(false))
          })
        }
      })
    }
    
    window.api.getSetting('default_appointment_duration').then((duration) => {
      if (duration) {
        setDefaultDuration(parseInt(duration, 10) || 60)
      }
    }).catch(console.error)

    window.addEventListener('trigger-calendar-sync', handleGlobalSync)
    return () => window.removeEventListener('trigger-calendar-sync', handleGlobalSync)
  }, [])

  const checkAuthStatus = async () => {
    const tokens = await window.api.getSetting('google_auth_tokens')
    if (tokens) setIsAuthenticated(true)
    
    const id = await window.api.getSetting('google_client_id')
    const secret = await window.api.getSetting('google_client_secret')
    if (id) setClientId(id)
    if (secret) setClientSecret(secret)
    
    return !!tokens
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
    })))
  }

  const handleSaveConfig = async () => {
    await window.api.setSetting('google_client_id', clientId)
    await window.api.setSetting('google_client_secret', clientSecret)
    setShowConfig(false)
  }

  const handleAuthenticate = async () => {
    if (!clientId || !clientSecret) {
      alert("Por favor, configure o Client ID e Secret primeiro clicando na engrenagem.")
      return
    }
    const success = await window.api.authenticateGoogle()
    if (success) {
      setIsAuthenticated(true)
      handleSync()
    }
  }

  const handleDisconnect = async () => {
    if (window.confirm('Tem certeza que deseja desconectar sua conta do Google?')) {
      await window.api.setSetting('google_auth_tokens', '')
      setIsAuthenticated(false)
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    const result = await window.api.pullFromGoogleCalendar()
    if (result && !result.success) {
      if (result.error === 'AUTH_ERROR') {
        setIsAuthenticated(false)
        alert('Sua sessão do Google Agenda expirou. Por favor, faça login novamente na aba de configurações na tela inicial.')
      } else {
        alert(`Erro na sincronização: ${result.error}`)
      }
    }
    await loadAppointments()
    setIsSyncing(false)
  }

  const handleSelectSlot = ({ start }: { start: Date }) => {
    openModal()
    const calculatedEnd = new Date(start.getTime() + defaultDuration * 60 * 1000)
    setStartDate(format(start, 'yyyy-MM-dd'))
    setStartTime(format(start, 'HH:mm'))
    setEndDate(format(calculatedEnd, 'yyyy-MM-dd'))
    setEndTime(format(calculatedEnd, 'HH:mm'))
  }

  const handleSelectEvent = (event: CalendarEvent) => {
    setEditingId(event.id)
    setPatientId(event.patient_id ? String(event.patient_id) : '')
    setStartDate(format(new Date(event.start_time), 'yyyy-MM-dd'))
    setStartTime(format(new Date(event.start_time), 'HH:mm'))
    setEndDate(format(new Date(event.end_time), 'yyyy-MM-dd'))
    setEndTime(format(new Date(event.end_time), 'HH:mm'))
    setNotes(event.notes || '')
    setIsModalOpen(true)
  }

  const handleEventDrop = async ({ event, start, end }: { event: CalendarEvent; start: string | Date; end: string | Date }) => {
    const startDate = typeof start === 'string' ? new Date(start) : start
    const endDate = typeof end === 'string' ? new Date(end) : end
    const startIso = startDate.toISOString()
    const endIso = endDate.toISOString()
    
    // Optimistic UI update
    setEvents(prev => prev.map(e => e.id === event.id ? { ...e, start: startDate, end: endDate, start_time: startIso, end_time: endIso } : e))
    
    await window.api.updateAppointment(event.id, { start_time: startIso, end_time: endIso })
  }

  const handleEventResize = async ({ event, start, end }: { event: CalendarEvent; start: string | Date; end: string | Date }) => {
    const startDate = typeof start === 'string' ? new Date(start) : start
    const endDate = typeof end === 'string' ? new Date(end) : end
    const startIso = startDate.toISOString()
    const endIso = endDate.toISOString()
    
    // Optimistic UI update
    setEvents(prev => prev.map(e => e.id === event.id ? { ...e, start: startDate, end: endDate, start_time: startIso, end_time: endIso } : e))
    
    await window.api.updateAppointment(event.id, { start_time: startIso, end_time: endIso })
  }


  const openModal = () => {
    setEditingId(null)
    setPatientId('')
    const now = new Date()
    setStartDate(format(now, 'yyyy-MM-dd'))
    setStartTime(format(now, 'HH:00'))
    const nextHour = new Date(now.getTime() + 60 * 60 * 1000)
    setEndDate(format(nextHour, 'yyyy-MM-dd'))
    setEndTime(format(nextHour, 'HH:00'))
    setNotes('')
    setIsModalOpen(true)
  }

  const saveAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    const startIso = new Date(`${startDate}T${startTime}`).toISOString()
    const endIso = new Date(`${endDate}T${endTime}`).toISOString()

    const selectedPatient = patientId ? patients.find(p => p.id === parseInt(patientId)) : null
    const eventTitle = selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}`.trim() : 'Consulta'

    const payload = {
      patient_id: patientId ? parseInt(patientId) : null,
      title: eventTitle,
      start_time: startIso,
      end_time: endIso,
      notes,
      google_event_id: null,
    }

    if (editingId) {
      await window.api.updateAppointment(editingId, payload)
    } else {
      await window.api.createAppointment(payload)
    }

    setIsModalOpen(false)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
    loadAppointments()
  }

  const deleteAppt = async () => {
    if (!editingId) return
    if (window.confirm('Tem certeza que deseja excluir este agendamento?')) {
      await window.api.deleteAppointment(editingId)
      setIsModalOpen(false)
      loadAppointments()
    }
  }

  return (
    <>
      <div className="glass-card" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
        
        {saveSuccess && createPortal(
          <div style={{ 
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            padding: '1rem 1.5rem', 
            backgroundColor: 'var(--success-color)', 
            border: '1px solid rgba(255,255,255,0.3)', 
            borderRadius: '12px',
            color: 'white',
            boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            zIndex: 9999,
            animation: 'pageFadeInUp 0.3s ease-out'
          }}>
            Agendamento salvo com sucesso.
          </div>,
          document.body
        )}
        
        <div className="list-header" style={{ marginBottom: '1rem' }}>
          <h2 className="section-title" style={{ border: 'none', margin: 0, padding: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarIcon size={24} /> Agenda
            {isSyncing && <RefreshCw size={18} className="spin" style={{ color: 'var(--accent-color)', marginLeft: '0.5rem' }} />}
          </h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {!isAuthenticated && (
            <button className="btn btn-secondary" onClick={handleAuthenticate}>
              <LogIn size={18} /> Autenticar Google
            </button>
          )}
          
          <button className="btn btn-primary" onClick={openModal}>
            <Plus size={18} /> Novo Agendamento
          </button>

          <button className="btn-icon-subtle" onClick={() => setShowConfig(true)} title="Configurações do Google Calendar" style={{ padding: '0.4rem' }}>
            <Settings size={18} />
          </button>
        </div>
        </div>

        <div className="calendar-container" style={{ flex: 1, backgroundColor: 'var(--bg-color)', borderRadius: '12px', padding: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <DnDCalendar
            localizer={localizer}
            events={events}
            date={currentDate}
            view={currentView}
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
            views={['month', 'week', 'day']}
            step={15}
            timeslots={4}
            eventPropGetter={() => ({
              style: {
                backgroundColor: 'var(--accent-color)',
                borderRadius: '6px',
                color: 'white',
                border: 'none',
                padding: '2px 5px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                fontSize: '0.85rem'
              }
            })}
            messages={{
              next: "Próximo",
              previous: "Anterior",
              today: "Hoje",
              month: "Mês",
              week: "Semana",
              day: "Dia"
            }}
          />
        </div>
      </div>

      {/* Modals are outside glass-card to avoid backdrop-filter stacking context breaking position:fixed */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-card" style={{ width: '500px', background: 'var(--bg-color)' }}>
            <h3 className="section-title">{editingId ? 'Editar Agendamento' : 'Novo Agendamento'}</h3>
            <form onSubmit={saveAppointment}>
              <div className="form-group">
                <label className="form-label">Paciente (Opcional)</label>
                <select className="form-control" value={patientId} onChange={e => setPatientId(e.target.value)}>
                  <option value="">-- Selecione --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Data de Início</label>
                  <input type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Hora de Início</label>
                  <input type="time" className="form-control" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Data de Fim</label>
                  <input type="date" className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Hora de Fim</label>
                  <input type="time" className="form-control" value={endTime} onChange={e => setEndTime(e.target.value)} required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notas</label>
                <textarea className="form-control" value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
              </div>

              <div className="form-actions">
                {editingId && (
                  <button type="button" className="btn btn-secondary" style={{ borderColor: 'var(--danger-color)', color: 'var(--danger-color)' }} onClick={deleteAppt}>
                    Excluir
                  </button>
                )}
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showConfig && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-card" style={{ width: '400px', background: 'var(--bg-color)' }}>
            <h3 className="section-title">Configuração da API do Google</h3>
            <div className="form-group">
              <label className="form-label">Client ID</label>
              <input className="form-control" value={clientId} onChange={e => setClientId(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Client Secret</label>
              <input type="password" className="form-control" value={clientSecret} onChange={e => setClientSecret(e.target.value)} />
            </div>
            
            {isAuthenticated && (
              <div style={{ marginBottom: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--surface-border)' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>A conta do Google está conectada.</p>
                <button type="button" className="btn btn-secondary" style={{ width: '100%', borderColor: 'var(--danger-color)', color: 'var(--danger-color)' }} onClick={handleDisconnect}>
                  <LogOut size={16} /> Desconectar Conta
                </button>
              </div>
            )}
            
            <div className="form-actions" style={{ marginTop: '0' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowConfig(false)}>Cancelar</button>
              <button type="button" className="btn btn-primary" onClick={handleSaveConfig}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
