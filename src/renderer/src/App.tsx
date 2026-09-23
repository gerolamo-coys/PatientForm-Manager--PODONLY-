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
import { ArrowLeft, Settings } from 'lucide-react'
import { getPortugueseCorrection } from './utils/ptBrDictionary'
import logoImg from './assets/logo.png'
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
 * Safe helper to update a React controlled input or textarea value imperatively
 * without blocking native typing or dropping React synthetic events.
 */
function applySafeValue(
  target: HTMLInputElement | HTMLTextAreaElement,
  nextVal: string,
  caretPos: number
) {
  const isTextArea = target.tagName === 'TEXTAREA'
  const proto = isTextArea ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
  const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set

  // Inform React 16+ internal value tracker so synthetic onChange fires
  const tracker = (target as any)._valueTracker
  if (tracker) {
    tracker.setValue('')
  }

  if (nativeSetter) {
    nativeSetter.call(target, nextVal)
  } else {
    target.value = nextVal
  }

  if (typeof caretPos === 'number') {
    target.setSelectionRange(caretPos, caretPos)
  }

  target.dispatchEvent(new Event('input', { bubbles: true }))
}

/**
 * Gerenciador global de capitalização automática:
 * Garante que a primeira letra de campos de texto ou após pontuações (., !, ?) seja maiúscula
 * sem bloquear digitação nativa e respeitando componentes controlados do React.
 */
function AutoCapitalizeManager() {
  React.useEffect(() => {
    let isEnabled = true
    let isTransforming = false

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

    const handleInput = (e: Event) => {
      if (!isEnabled || isTransforming) return

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

      const val = inputElem.value
      if (!val) return

      const caretPos = inputElem.selectionStart ?? val.length
      if (caretPos < 1) return

      // Caractere recém-digitado antes do cursor
      const char = val[caretPos - 1]
      if (!char || char.toLowerCase() === char.toUpperCase() || char === char.toUpperCase()) return

      const textBefore = val.slice(0, caretPos - 1)
      const shouldCapitalize =
        textBefore.trim().length === 0 || // Início do campo ou só espaços
        /(?:[.!?]\s+|\n\s*)$/.test(textBefore) // Logo após pontuação com espaço ou quebra de linha

      if (shouldCapitalize) {
        const upperChar = char.toUpperCase()
        const nextVal = val.slice(0, caretPos - 1) + upperChar + val.slice(caretPos)
        isTransforming = true
        try {
          applySafeValue(inputElem, nextVal, caretPos)
        } catch (err) {
          console.error('AutoCapitalize error:', err)
        } finally {
          isTransforming = false
        }
      }
    }

    document.addEventListener('input', handleInput, true)

    return () => {
      window.removeEventListener('podonly-autocapitalize-changed', handlePrefChange)
      document.removeEventListener('input', handleInput, true)
    }
  }, [])

  return null
}

/**
 * Gerenciador de auto-correção em Português do Brasil:
 * Corrige automaticamente acentuações e erros comuns ao pressionar espaço ou pontuação
 * utilizando o dicionário de regras gramaticais de sufixos em Português sem cancelar digitação.
 */
function AutoCorrectManager() {
  React.useEffect(() => {
    let isEnabled = true
    let isTransforming = false

    window.api.getSetting('auto_correct_portuguese').then(val => {
      if (val !== null && val !== undefined && val !== '') {
        isEnabled = val === 'true'
      }
    }).catch(console.error)

    const handlePrefChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ enabled: boolean }>
      if (customEvent.detail && typeof customEvent.detail.enabled === 'boolean') {
        isEnabled = customEvent.detail.enabled
      }
    }

    window.addEventListener('podonly-autocorrect-changed', handlePrefChange)

    const handleInput = (e: Event) => {
      if (!isEnabled || isTransforming) return

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

      const val = inputElem.value
      if (!val) return

      const caretPos = inputElem.selectionStart ?? val.length
      if (caretPos < 2) return

      const triggerChar = val[caretPos - 1]
      const isSpaceOrPunctuation = /^[\s.,!?;:]$/.test(triggerChar)
      if (!isSpaceOrPunctuation) return

      const textBefore = val.slice(0, caretPos - 1)
      const match = textBefore.match(/([a-zA-ZáàâãéèêíïóôõöúçÑñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ]+)$/)
      if (!match) return

      const rawWord = match[1]
      const correctedWord = getPortugueseCorrection(rawWord)

      if (correctedWord && correctedWord !== rawWord) {
        const wordStart = (caretPos - 1) - rawWord.length
        const nextVal = val.slice(0, wordStart) + correctedWord + val.slice(caretPos - 1)
        const newCaretPos = wordStart + correctedWord.length + 1
        isTransforming = true
        try {
          applySafeValue(inputElem, nextVal, newCaretPos)
        } catch (err) {
          console.error('AutoCorrect error:', err)
        } finally {
          isTransforming = false
        }
      }
    }

    document.addEventListener('input', handleInput, true)

    return () => {
      window.removeEventListener('podonly-autocorrect-changed', handlePrefChange)
      document.removeEventListener('input', handleInput, true)
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

import AppSidebar from './components/AppSidebar'
import GeneralSettingsModal from './components/GeneralSettingsModal'

function AppContent(): React.JSX.Element {
  const location = useLocation()
  const isActivation = location.pathname === '/activation'
  const match = location.pathname.match(/\/patient\/(\d+)/)
  const backLink = location.pathname.includes('/form/') && match ? `/patient/${match[1]}` : '/patients'
  const showBackButton = location.pathname.startsWith('/patient/') || location.pathname === '/patient/new'

  const [layoutMode, setLayoutMode] = useState<'topbar' | 'sidebar'>('topbar')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  React.useEffect(() => {
    window.api.getSetting('layout_mode').then((val) => {
      if (val === 'sidebar' || val === 'topbar') {
        setLayoutMode(val)
      }
    }).catch(console.error)

    const handleLayoutChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ mode: 'topbar' | 'sidebar' }>
      if (customEvent.detail && (customEvent.detail.mode === 'topbar' || customEvent.detail.mode === 'sidebar')) {
        setLayoutMode(customEvent.detail.mode)
      }
    }

    const handleOpenSettings = () => {
      setIsSettingsOpen(true)
    }

    window.addEventListener('podonly-layout-changed', handleLayoutChange)
    window.addEventListener('podonly-open-settings', handleOpenSettings)
    return () => {
      window.removeEventListener('podonly-layout-changed', handleLayoutChange)
      window.removeEventListener('podonly-open-settings', handleOpenSettings)
    }
  }, [])

  const isSidebarMode = layoutMode === 'sidebar' && !isActivation

  return (
    <>
      <AutoCapitalizeManager />
      <AutoCorrectManager />
      <div className="ambient-background">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>
      <div className={`app-container ${isSidebarMode ? 'layout-sidebar' : ''}`}>
        {isSidebarMode && <AppSidebar />}

        <div className={isSidebarMode ? 'app-main-layout' : 'app-content-wrapper'} style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, height: '100vh', overflow: 'hidden' }}>
          {/* Topbar Layout Header */}
          {!isActivation && !isSidebarMode && (
            <header className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '220px', display: 'flex', alignItems: 'center' }}>
                {showBackButton ? (
                  <Link 
                    to={backLink}
                    style={{
                      background: 'rgba(5, 129, 157, 0.08)',
                      border: '1px solid rgba(5, 129, 157, 0.18)',
                      color: 'var(--brand-dark)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '8px',
                      borderRadius: '50%',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      marginLeft: '4px',
                      textDecoration: 'none',
                      boxShadow: '0 2px 8px rgba(5, 129, 157, 0.06)'
                    }}
                    className="browser-back-btn"
                    title="Voltar"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(5, 129, 157, 0.16)'
                      e.currentTarget.style.borderColor = 'rgba(5, 129, 157, 0.35)'
                      e.currentTarget.style.transform = 'scale(1.05)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(5, 129, 157, 0.08)'
                      e.currentTarget.style.borderColor = 'rgba(5, 129, 157, 0.18)'
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
              <div style={{ width: '220px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  title="Configurações do Sistema"
                  className="topbar-settings-btn"
                  style={{
                    background: 'rgba(5, 129, 157, 0.08)',
                    border: '1px solid rgba(5, 129, 157, 0.18)',
                    color: 'var(--brand-dark)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px',
                    borderRadius: '50%',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 2px 8px rgba(5, 129, 157, 0.06)',
                    marginRight: '4px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(5, 129, 157, 0.16)'
                    e.currentTarget.style.borderColor = 'rgba(5, 129, 157, 0.35)'
                    e.currentTarget.style.transform = 'scale(1.05)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(5, 129, 157, 0.08)'
                    e.currentTarget.style.borderColor = 'rgba(5, 129, 157, 0.18)'
                    e.currentTarget.style.transform = 'scale(1)'
                  }}
                >
                  <Settings size={18} />
                </button>
                <img 
                  src={logoImg} 
                  alt="PodOnly" 
                  style={{ 
                    width: '38px', 
                    height: '38px', 
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 2px 8px rgba(55, 214, 154, 0.35))' 
                  }} 
                />
                <h1 style={{ 
                  margin: 0, 
                  fontSize: '1.45rem', 
                  fontWeight: 800, 
                  letterSpacing: '-0.02em', 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: '1px' 
                }}>
                  <span style={{ color: 'var(--brand-dark)' }}>Pod</span>
                  <span style={{ 
                    background: 'var(--brand-gradient)', 
                    WebkitBackgroundClip: 'text', 
                    WebkitTextFillColor: 'transparent' 
                  }}>Only</span>
                </h1>
              </div>
            </header>
          )}

          {/* Sidebar Mode Minimal Back-Bar (only when inside nested patient/form routes) */}
          {isSidebarMode && showBackButton && (
            <div className="sidebar-sub-header">
              <Link 
                to={backLink}
                style={{
                  background: 'rgba(5, 129, 157, 0.08)',
                  border: '1px solid rgba(5, 129, 157, 0.18)',
                  color: 'var(--brand-dark)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  gap: '0.4rem',
                  textDecoration: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  boxShadow: '0 2px 6px rgba(5, 129, 157, 0.06)'
                }}
                title="Voltar"
              >
                <ArrowLeft size={16} />
                <span>Voltar</span>
              </Link>
            </div>
          )}

          <main className={`app-content ${isActivation ? 'activation-mode' : ''}`} style={{ flex: 1, overflowY: 'auto' }}>
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
      </div>

      {isSettingsOpen && (
        <GeneralSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
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
