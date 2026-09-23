import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { 
  Home, 
  Users, 
  Calendar, 
  DollarSign, 
  Settings 
} from 'lucide-react'
import logoImg from '../assets/logo.png'

interface AppSidebarProps {
  onOpenSettings?: () => void
}

export default function AppSidebar({ onOpenSettings }: AppSidebarProps): React.JSX.Element {
  const location = useLocation()
  const navigate = useNavigate()

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

  const getStatusLabel = () => {
    switch (botStatus) {
      case 'CONNECTED':
        return { label: 'Conectado', color: '#10b981', dotClass: 'connected' }
      case 'CONNECTING':
        return { label: 'Conectando...', color: '#f59e0b', dotClass: 'connecting' }
      case 'QR_READY':
        return { label: 'Aguardando QR', color: '#0ea5e9', dotClass: 'qr-ready' }
      case 'DISCONNECTED':
      default:
        return { label: 'Desconectado', color: '#94a3b8', dotClass: 'disconnected' }
    }
  }

  const status = getStatusLabel()

  const isHome = location.pathname === '/'
  const isPatients = location.pathname.startsWith('/patients') || location.pathname.startsWith('/patient')
  const isCalendar = location.pathname.startsWith('/calendar')
  const isFinancial = location.pathname.startsWith('/financial')

  const handleOpenSettings = () => {
    if (onOpenSettings) {
      onOpenSettings()
    } else {
      window.dispatchEvent(new CustomEvent('podonly-open-settings'))
    }
  }

  return (
    <aside className="app-sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        <img 
          src={logoImg} 
          alt="PodOnly" 
          className="sidebar-logo-img"
        />
        <div className="sidebar-brand-text">
          <div className="sidebar-title">
            <span className="sidebar-title-dark">Pod</span>
            <span className="sidebar-title-gradient">Only</span>
          </div>
          <span className="sidebar-subtitle">PODOLOGIA CLÍNICA</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-nav">
        <button
          type="button"
          className={`sidebar-nav-btn ${isHome ? 'active' : ''}`}
          onClick={() => navigate('/')}
        >
          <Home size={18} className="sidebar-nav-icon" />
          <span>Início</span>
        </button>

        <button
          type="button"
          className={`sidebar-nav-btn ${isPatients ? 'active' : ''}`}
          onClick={() => navigate('/patients')}
        >
          <Users size={18} className="sidebar-nav-icon" />
          <span>Pacientes</span>
        </button>

        <button
          type="button"
          className={`sidebar-nav-btn ${isCalendar ? 'active' : ''}`}
          onClick={() => {
            navigate('/calendar')
            window.dispatchEvent(new Event('trigger-calendar-sync'))
          }}
        >
          <Calendar size={18} className="sidebar-nav-icon" />
          <span>Agenda</span>
        </button>

        <button
          type="button"
          className={`sidebar-nav-btn ${isFinancial ? 'active' : ''}`}
          onClick={() => navigate('/financial')}
        >
          <DollarSign size={18} className="sidebar-nav-icon" />
          <span>Financeiro</span>
        </button>
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        {/* WhatsApp Compact Status Card */}
        <div 
          className="sidebar-whatsapp-card"
          onClick={handleOpenSettings}
          title="Clique para configurar WhatsApp nas Configurações"
        >
          <div className="sidebar-whatsapp-header">
            <span className={`bot-status-dot ${status.dotClass}`} />
            <span className="sidebar-whatsapp-tag">WHATSAPP</span>
          </div>
          <span className="sidebar-whatsapp-status-text">{status.label}</span>
        </div>

        {/* Configurações Button */}
        <button
          type="button"
          className="sidebar-settings-btn"
          onClick={handleOpenSettings}
          title="Configurações do Sistema"
        >
          <Settings size={16} />
          <span>CONFIGURAÇÕES</span>
        </button>
      </div>
    </aside>
  )
}
