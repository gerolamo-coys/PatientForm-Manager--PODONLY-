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
import { ArrowLeft } from 'lucide-react'
import './assets/main.css'


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
  const navigate = useNavigate()
  const isActivation = location.pathname === '/activation'
  const match = location.pathname.match(/\/patient\/(\d+)/)
  const backLink = location.pathname.includes('/form/') && match ? `/patient/${match[1]}` : '/patients'
  const showBackButton = location.pathname.startsWith('/patient/') || location.pathname === '/patient/new'

  return (
    <>
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
        <AppContent />
      </AppGuard>
    </HashRouter>
  )
}

export default App
