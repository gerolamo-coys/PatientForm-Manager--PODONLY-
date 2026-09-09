/**
 * Podonly - Componente Raiz da Interface (Renderer Process)
 * 
 * Configura as rotas globais do sistema, aplica o plano de fundo dinâmico,
 * gerencia a barra de navegação principal (Início, Pacientes, Agenda, Financeiro)
 * e o botão de voltar no cabeçalho.
 */

import React, { useState } from 'react'
import { HashRouter, Routes, Route, useLocation, useNavigate, Link } from 'react-router-dom'
import DashboardScreen from './screens/DashboardScreen'
import PatientList from './screens/PatientList'
import PatientDetails from './screens/PatientDetails'
import PatientForm from './screens/PatientForm'
import CalendarScreen from './screens/CalendarScreen'
import ActivationScreen from './screens/ActivationScreen'
import FinancialScreen from './screens/FinancialScreen'
import LockScreen from './screens/LockScreen'
import { ArrowLeft } from 'lucide-react'
import './assets/main.css'

function SessionGuard({ children }: { children: React.ReactNode }) {
  const [isLocked, setIsLocked] = React.useState(false)
  const [isReady, setIsReady] = React.useState(false)
  const lastPingRef = React.useRef(0)

  React.useEffect(() => {
    window.api.isSessionLocked().then(locked => {
      setIsLocked(locked)
      setIsReady(true)
    })

    const cleanup = window.api.onSessionLocked(() => {
      setIsLocked(true)
    })

    const pingActivity = () => {
      const now = Date.now()
      if (now - lastPingRef.current > 30000) {
        lastPingRef.current = now
        window.api.activityPing()
      }
    }

    window.addEventListener('click', pingActivity)
    window.addEventListener('keydown', pingActivity)

    return () => {
      cleanup()
      window.removeEventListener('click', pingActivity)
      window.removeEventListener('keydown', pingActivity)
    }
  }, [])

  if (!isReady) return null

  if (isLocked) {
    return <LockScreen onUnlocked={() => setIsLocked(false)} />
  }

  return <>{children}</>
}

/**
 * Gerenciador global de capitalização automática:
 * Garante que a primeira letra de campos de texto ou após pontuações (., !, ?) seja maiúscula
 * sem que o usuário precise pressionar Caps Lock, respeitando a preferência configurada.
 */
function AutoCapitalizeManager() {
  React.useEffect(() => {
    let isEnabled = true

    // Carrega preferência inicial
    window.api.getSetting('auto_capitalize_first_letter').then(val => {
      if (val !== null && val !== undefined && val !== '') {
        isEnabled = val === 'true'
      }
    }).catch(console.error)

    // Ouve alterações no toggle das configurações
    const handlePrefChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ enabled: boolean }>
      if (customEvent.detail && typeof customEvent.detail.enabled === 'boolean') {
        isEnabled = customEvent.detail.enabled
      }
    }

    window.addEventListener('podonly-autocapitalize-changed', handlePrefChange)

    // Intercepta input para capitalizar primeira letra do campo ou após ponto final
    const handleBeforeInput = (e: InputEvent) => {
      if (!isEnabled) return

      const target = e.target as HTMLElement | null
      if (!target) return

      const isTextInput = target.tagName === 'INPUT' && (
        (target as HTMLInputElement).type === 'text' ||
        (target as HTMLInputElement).type === 'search' ||
        !(target as HTMLInputElement).type
      )
      const isTextArea = target.tagName === 'TEXTAREA'

      if (!isTextInput && !isTextArea) return

      const inputElem = target as HTMLInputElement | HTMLTextAreaElement
      if (inputElem.readOnly || inputElem.disabled) return

      // Apenas intercepta inserção de texto único (caractere digitado)
      if (e.inputType !== 'insertText' || !e.data || e.data.length !== 1) return

      const char = e.data
      // Se não for letra minúscula, ignora
      if (char.toLowerCase() === char.toUpperCase()) return

      const start = inputElem.selectionStart ?? 0
      const val = inputElem.value

      // Verifica se estamos no início do campo ou após pontuação (. ! ? ou quebra de linha)
      const textBefore = val.slice(0, start)
      const shouldCapitalize =
        textBefore.trim().length === 0 || // Início do campo ou só espaços
        /(?:[.!?]\s*|\n\s*)$/.test(textBefore) // Logo após pontuação final ou quebra de linha

      if (shouldCapitalize && char !== char.toUpperCase()) {
        e.preventDefault()
        const upperChar = char.toUpperCase()
        const end = inputElem.selectionEnd ?? start

        // Insere caractere maiúsculo respeitando histórico de undo nativo quando possível
        if (typeof document.execCommand === 'function' && document.execCommand('insertText', false, upperChar)) {
          // Inserido com sucesso via execCommand
        } else {
          // Fallback manual compatível com componentes controlados do React
          const nextVal = val.slice(0, start) + upperChar + val.slice(end)
          const proto = target.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
          const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
          if (nativeSetter) {
            nativeSetter.call(inputElem, nextVal)
          } else {
            inputElem.value = nextVal
          }
          inputElem.setSelectionRange(start + 1, start + 1)
          inputElem.dispatchEvent(new Event('input', { bubbles: true }))
        }
      }
    }

    document.addEventListener('beforeinput', handleBeforeInput as EventListener, true)

    return () => {
      window.removeEventListener('podonly-autocapitalize-changed', handlePrefChange)
      document.removeEventListener('beforeinput', handleBeforeInput as EventListener, true)
    }
  }, [])

  return null
}

function NavigationSwitch() {
  const location = useLocation()
  const navigate = useNavigate()
  
  if (location.pathname === '/activation') return null
  
  const isDashboard = location.pathname === '/'
  const isPatients = location.pathname.startsWith('/patient')
  const isCalendar = location.pathname.startsWith('/calendar')
  const isFinancial = location.pathname.startsWith('/financial')

  let sliderClass = 'left'
  if (isPatients) sliderClass = 'center'
  if (isCalendar) sliderClass = 'right'
  if (isFinancial) sliderClass = 'far-right'

  return (
    <div className="nav-switch-container">
      <div className={`nav-switch-slider ${sliderClass}`} />
      <button 
        className={`nav-switch-btn ${isDashboard ? 'active' : ''}`}
        onClick={() => navigate('/')}
      >
        Início
      </button>
      <button 
        className={`nav-switch-btn ${isPatients ? 'active' : ''}`}
        onClick={() => navigate('/patients')}
      >
        Pacientes
      </button>
      <button 
        className={`nav-switch-btn ${isCalendar ? 'active' : ''}`}
        onClick={() => {
          navigate('/calendar')
          window.dispatchEvent(new Event('trigger-calendar-sync'))
        }}
      >
        Agenda
      </button>
      <button 
        className={`nav-switch-btn ${isFinancial ? 'active' : ''}`}
        onClick={() => navigate('/financial')}
      >
        Financeiro
      </button>
    </div>
  )
}

function AppGuard({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()
  const [isValid, setIsValid] = useState(false)

  React.useEffect(() => {
    if (isValid && location.pathname !== '/activation') return;
    
    setChecking(true)
    window.api.checkLicenseStatus().then(res => {
      setIsValid(res.valid)
      if (!res.valid && location.pathname !== '/activation') {
        navigate('/activation', { replace: true })
      }
      setChecking(false)
    }).catch(() => {
      setIsValid(false)
      if (location.pathname !== '/activation') {
        navigate('/activation', { replace: true })
      }
      setChecking(false)
    })
  }, [location.pathname, isValid, navigate]) 

  if (checking) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw', color: 'var(--text-secondary)' }}>Verificando licença do sistema...</div>
  }

  if (!isValid && location.pathname !== '/activation') {
    return null
  }

  return <>{children}</>
}

function AppContent(): React.JSX.Element {
  const location = useLocation()
  const isActivation = location.pathname === '/activation'
  const match = location.pathname.match(/\/patient\/(\d+)/)
  const backLink = location.pathname.includes('/form/') && match ? `/patient/${match[1]}` : '/patients'
  const showBackButton = location.pathname.startsWith('/patient/') || location.pathname === '/patient/new'

  return (
    <>
      <AutoCapitalizeManager />
      <div className="ambient-background">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>
      <div className="app-container">
        {!isActivation && (
          <header className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: '180px', display: 'flex', alignItems: 'center' }}>
              {showBackButton ? (
                <Link 
                  to={backLink}
                  style={{
                    background: 'rgba(14, 145, 168, 0.12)',
                    border: '1px solid rgba(14, 145, 168, 0.25)',
                    color: 'var(--accent-color)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px',
                    borderRadius: '50%',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    marginLeft: '4px',
                    textDecoration: 'none',
                    boxShadow: '0 2px 8px rgba(14, 145, 168, 0.12)'
                  }}
                  className="browser-back-btn"
                  title="Voltar"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(14, 145, 168, 0.22)'
                    e.currentTarget.style.borderColor = 'rgba(14, 145, 168, 0.4)'
                    e.currentTarget.style.transform = 'scale(1.05)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(14, 145, 168, 0.12)'
                    e.currentTarget.style.borderColor = 'rgba(14, 145, 168, 0.25)'
                    e.currentTarget.style.transform = 'scale(1)'
                  }}
                >
                  <ArrowLeft size={20} />
                </Link>
              ) : (
                <div style={{ width: '38px', height: '38px' }} />
              )}
            </div>
            <NavigationSwitch />
            <div style={{ width: '180px', display: 'flex', justifyContent: 'flex-end' }}>
              <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, background: 'linear-gradient(135deg, #0E91A8, #086173)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' }}>
                Podonly
              </h1>
            </div>
          </header>
        )}
        <main className={`app-content ${isActivation ? 'activation-mode' : ''}`}>
          <Routes>
            <Route path="/" element={<DashboardScreen />} />
            <Route path="/activation" element={<ActivationScreen />} />
            <Route path="/patients" element={<PatientList />} />
            <Route path="/calendar" element={<CalendarScreen />} />
            <Route path="/financial" element={<FinancialScreen />} />
            <Route path="/patient/new" element={<PatientDetails />} />
            <Route path="/patient/:id" element={<PatientDetails />} />
            <Route path="/patient/:id/form/new" element={<PatientForm />} />
            <Route path="/patient/:id/form/:formId" element={<PatientForm />} />
          </Routes>
        </main>
      </div>
    </>
  )
}

function App(): React.JSX.Element {
  return (
    <HashRouter>
      <AppGuard>
        <SessionGuard>
          <AppContent />
        </SessionGuard>
      </AppGuard>
    </HashRouter>
  )
}

export default App
