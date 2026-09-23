import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { 
  Settings, 
  X, 
  Briefcase, 
  Clock, 
  Send, 
  Globe, 
  Database, 
  CreditCard, 
  Shield, 
  Save, 
  Upload, 
  RotateCcw, 
  Sliders, 
  ExternalLink, 
  RefreshCw, 
  Download, 
  Trash2,
  Lock,
  Unlock,
  Key,
  CheckCircle2,
  AlertTriangle 
} from 'lucide-react'
import { format } from 'date-fns'
import feetMapDefaultImg from '../assets/feet-map.png'
import FeetCanvasBuilderModal from './FeetCanvasBuilderModal'
import FormBuilderSettingsTab from './FormBuilderSettingsTab'

interface GeneralSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSettingsSaved?: () => void
}

export default function GeneralSettingsModal({
  isOpen,
  onClose,
  onSettingsSaved
}: GeneralSettingsModalProps): React.JSX.Element | null {
  const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'preferences' | 'forms' | 'whatsapp' | 'google' | 'storage' | 'subscription' | 'security'>('profile')

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
  const [autoCompletePastAppointments, setAutoCompletePastAppointments] = useState(false)
  const [layoutMode, setLayoutMode] = useState<'topbar' | 'sidebar'>('topbar')

  // WhatsApp States
  const [botStatus, setBotStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED'>('DISCONNECTED')
  const [qrDataUri, setQrDataUri] = useState('')
  const [botEnabled, setBotEnabled] = useState(false)
  const [botTime, setBotTime] = useState('09:00')
  const [botReminderDays, setBotReminderDays] = useState('1')
  const [botTemplate, setBotTemplate] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const templateTextareaRef = useRef<HTMLTextAreaElement>(null)
  const [testPhone, setTestPhone] = useState('')
  const testMessage = 'Olá! Esta é uma mensagem de teste do seu WhatsApp.'
  const [sendingTest, setSendingTest] = useState(false)
  const [testSuccess, setTestSuccess] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)

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

  // Security settings states
  const [securityStatus, setSecurityStatus] = useState<{ isLockEnabled: boolean; hasPassword: boolean; inactivityMinutes: number } | null>(null)
  const [inactivityMinutesInput, setInactivityMinutesInput] = useState<number>(15)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null)
  const [changePasswordSuccess, setChangePasswordSuccess] = useState(false)
  const [changingPasswordLoading, setChangingPasswordLoading] = useState(false)

  const [showRemoveBlock, setShowRemoveBlock] = useState(false)
  const [removePassword, setRemovePassword] = useState('')
  const [removeBlockError, setRemoveBlockError] = useState<string | null>(null)
  const [removeBlockSuccess, setRemoveBlockSuccess] = useState(false)
  const [removingBlockLoading, setRemovingBlockLoading] = useState(false)

  const [showEnableBlock, setShowEnableBlock] = useState(false)
  const [enablePassword, setEnablePassword] = useState('')
  const [enableConfirmPassword, setEnableConfirmPassword] = useState('')
  const [enableBlockError, setEnableBlockError] = useState<string | null>(null)
  const [enableBlockSuccess, setEnableBlockSuccess] = useState(false)
  const [enablingBlockLoading, setEnablingBlockLoading] = useState(false)

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Load WhatsApp status
  useEffect(() => {
    if (!isOpen) return

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
      window.api.getSetting('whatsapp_reminder_days')
    ]).then(([enabled, time, template, reminderDays]) => {
      setBotEnabled(enabled === 'true')
      if (time) setBotTime(time)
      if (reminderDays) setBotReminderDays(reminderDays)
      if (template) setBotTemplate(template)
      else setBotTemplate('Olá {primeiro_nome}! Passando para lembrar da sua consulta de {procedimento} agendada para {data}, às {hora} na {clinica}. Por favor, confirme respondendo a esta mensagem.')
    }).catch(console.error)

    return () => {
      unsubscribe()
    }
  }, [isOpen])

  // Load general settings on open
  useEffect(() => {
    if (isOpen) {
      Promise.all([
        window.api.getSetting('profile_professional_name'),
        window.api.getSetting('profile_clinic_name'),
        window.api.getSetting('profile_clinic_address'),
        window.api.getSetting('profile_clinic_phone'),
        window.api.getSetting('default_appointment_duration'),
        window.api.getSetting('auto_capitalize_first_letter'),
        window.api.getSetting('auto_correct_portuguese'),
        window.api.getSetting('auto_complete_past_appointments'),
        window.api.getSetting('layout_mode'),
        window.api.getSetting('google_client_id'),
        window.api.getSetting('google_client_secret'),
        window.api.getGoogleStatus()
      ]).then(([prof, clinic, addr, phone, duration, autoCap, autoCorr, autoCompletePast, savedLayout, gClientId, gClientSecret, gStatus]) => {
        setProfName(prof || '')
        setClinicName(clinic || '')
        setClinicAddress(addr || '')
        setClinicPhone(phone || '')
        setDefaultDuration(duration || '60')
        setAutoCapitalizeFirstLetter(autoCap === null || autoCap === undefined || autoCap === '' ? true : autoCap === 'true')
        setAutoCorrectPortuguese(autoCorr === null || autoCorr === undefined || autoCorr === '' ? true : autoCorr === 'true')
        setAutoCompletePastAppointments(autoCompletePast === 'true')
        if (savedLayout === 'sidebar' || savedLayout === 'topbar') {
          setLayoutMode(savedLayout)
        }
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
  }, [isOpen])

  // Load subscription details
  useEffect(() => {
    if (activeSettingsTab === 'subscription' && isOpen) {
      loadSubscriptionDetails()
    }
  }, [activeSettingsTab, isOpen])

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
      await window.api.setSetting('whatsapp_reminder_days', botReminderDays)
      await window.api.setSetting('whatsapp_template', botTemplate)
      await window.api.setSetting('whatsapp_last_run_date', '')
      
      setSaveSuccess(true)
      if (onSettingsSaved) onSettingsSaved()
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error(err)
    }
  }

  const handleInsertTag = (tag: string) => {
    const textarea = templateTextareaRef.current
    if (!textarea) {
      setBotTemplate(prev => prev + tag)
      return
    }
    const start = textarea.selectionStart ?? botTemplate.length
    const end = textarea.selectionEnd ?? botTemplate.length
    const before = botTemplate.substring(0, start)
    const after = botTemplate.substring(end)
    const newText = before + tag + after
    setBotTemplate(newText)
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + tag.length, start + tag.length)
    }, 0)
  }

  const getPreviewMessage = (templateStr: string) => {
    const sampleClinic = clinicName || 'Clínica Podologia & Saúde'
    const sampleAddress = clinicAddress || 'Av. Paulista, 1000 - Sala 42'
    const samplePhone = clinicPhone || '(11) 98765-4321'
    return templateStr
      .replace(/{nome}/g, 'Maria Oliveira')
      .replace(/{primeiro_nome}/g, 'Maria')
      .replace(/{data}/g, '15/10/2026')
      .replace(/{hora}/g, '14:30')
      .replace(/{procedimento}/g, 'Podoprofilaxia')
      .replace(/{clinica}/g, sampleClinic)
      .replace(/{endereco}/g, sampleAddress)
      .replace(/{telefone}/g, samplePhone)
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
      window.dispatchEvent(new CustomEvent('podonly-settings-updated'))
      setSaveSuccess(true)
      if (onSettingsSaved) onSettingsSaved()
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
        window.dispatchEvent(new CustomEvent('podonly-settings-updated'))
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
          window.dispatchEvent(new CustomEvent('podonly-settings-updated'))
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
      await window.api.setSetting('auto_complete_past_appointments', autoCompletePastAppointments ? 'true' : 'false')
      await window.api.setSetting('layout_mode', layoutMode)
      
      window.dispatchEvent(new CustomEvent('podonly-autocapitalize-changed', { detail: { enabled: autoCapitalizeFirstLetter } }))
      window.dispatchEvent(new CustomEvent('podonly-autocorrect-changed', { detail: { enabled: autoCorrectPortuguese } }))
      window.dispatchEvent(new CustomEvent('podonly-layout-changed', { detail: { mode: layoutMode } }))
      window.dispatchEvent(new CustomEvent('podonly-settings-updated'))

      setSaveSuccess(true)
      if (onSettingsSaved) onSettingsSaved()
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggleLayoutMode = async (mode: 'topbar' | 'sidebar') => {
    setLayoutMode(mode)
    try {
      await window.api.setSetting('layout_mode', mode)
      window.dispatchEvent(new CustomEvent('podonly-layout-changed', { detail: { mode } }))
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

  const handleToggleAutoCompletePast = async () => {
    const nextVal = !autoCompletePastAppointments
    setAutoCompletePastAppointments(nextVal)
    try {
      await window.api.setSetting('auto_complete_past_appointments', nextVal ? 'true' : 'false')
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
      alert('Por favor, configure o Client ID e Secret primeiro ou importe o arquivo credentials.json.')
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

  const loadSecurityStatus = async () => {
    try {
      if (window.api?.getSecurityStatus) {
        const status = await window.api.getSecurityStatus()
        setSecurityStatus(status)
        setInactivityMinutesInput(status.inactivityMinutes)
      }
    } catch (err) {
      console.error('Falha ao carregar status de segurança:', err)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadSecurityStatus()
      setShowChangePassword(false)
      setShowRemoveBlock(false)
      setShowEnableBlock(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
      setChangePasswordError(null)
      setChangePasswordSuccess(false)
      setRemovePassword('')
      setRemoveBlockError(null)
      setRemoveBlockSuccess(false)
      setEnablePassword('')
      setEnableConfirmPassword('')
      setEnableBlockError(null)
      setEnableBlockSuccess(false)
    }
  }, [isOpen, activeSettingsTab])

  const handleInactivityTimeoutChange = async (minutes: number) => {
    try {
      await window.api.setInactivityTimeout(minutes)
      setInactivityMinutesInput(minutes)
      await loadSecurityStatus()
    } catch (err) {
      console.error('Falha ao definir tempo de inatividade:', err)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setChangePasswordError(null)
    setChangePasswordSuccess(false)

    if (!currentPassword) {
      setChangePasswordError('Por favor, digite a senha mestra atual.')
      return
    }
    if (!newPassword || newPassword.length < 4) {
      setChangePasswordError('A nova senha deve ter no mínimo 4 caracteres.')
      return
    }
    if (newPassword !== confirmNewPassword) {
      setChangePasswordError('A nova senha e a confirmação não coincidem.')
      return
    }

    setChangingPasswordLoading(true)
    try {
      const success = await window.api.changeAdminPassword(currentPassword, newPassword)
      if (success) {
        setChangePasswordSuccess(true)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmNewPassword('')
        setTimeout(() => {
          setShowChangePassword(false)
          setChangePasswordSuccess(false)
        }, 2000)
        await loadSecurityStatus()
      } else {
        setChangePasswordError('Senha atual incorreta.')
      }
    } catch (err: any) {
      setChangePasswordError(err.message || 'Erro ao alterar a senha mestra.')
    } finally {
      setChangingPasswordLoading(false)
    }
  }

  const handleRemoveSessionBlock = async (e: React.FormEvent) => {
    e.preventDefault()
    setRemoveBlockError(null)
    setRemoveBlockSuccess(false)

    if (securityStatus?.hasPassword && !removePassword) {
      setRemoveBlockError('Digite a senha mestra atual para confirmar a desativação.')
      return
    }

    setRemovingBlockLoading(true)
    try {
      const success = await window.api.removeSessionLock(removePassword)
      if (success) {
        setRemoveBlockSuccess(true)
        setRemovePassword('')
        setTimeout(() => {
          setShowRemoveBlock(false)
          setRemoveBlockSuccess(false)
        }, 2000)
        await loadSecurityStatus()
      } else {
        setRemoveBlockError('Senha incorreta.')
      }
    } catch (err: any) {
      setRemoveBlockError(err.message || 'Erro ao desativar bloqueio de sessão.')
    } finally {
      setRemovingBlockLoading(false)
    }
  }

  const handleEnableSessionBlock = async (e: React.FormEvent) => {
    e.preventDefault()
    setEnableBlockError(null)
    setEnableBlockSuccess(false)

    if (!enablePassword || enablePassword.length < 4) {
      setEnableBlockError('A senha mestra deve ter no mínimo 4 caracteres.')
      return
    }
    if (enablePassword !== enableConfirmPassword) {
      setEnableBlockError('A senha e a confirmação não coincidem.')
      return
    }

    setEnablingBlockLoading(true)
    try {
      const success = await window.api.enableSessionLock(enablePassword)
      if (success) {
        setEnableBlockSuccess(true)
        setEnablePassword('')
        setEnableConfirmPassword('')
        setTimeout(() => {
          setShowEnableBlock(false)
          setEnableBlockSuccess(false)
        }, 2000)
        await loadSecurityStatus()
      } else {
        setEnableBlockError('Erro ao ativar bloqueio de sessão.')
      }
    } catch (err: any) {
      setEnableBlockError(err.message || 'Erro ao ativar bloqueio de sessão.')
    } finally {
      setEnablingBlockLoading(false)
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

  if (!isOpen) return null

  const statusInfo = getStatusDetails()

  return createPortal(
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div className="whatsapp-modal settings-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="whatsapp-modal-header" style={{ borderBottom: '1px solid var(--surface-border)' }}>
          <h3><Settings size={18} style={{ marginRight: '0.5rem' }} /> Configurações Gerais</h3>
          <button className="modal-close-btn" onClick={onClose}>
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
              className={`settings-tab-btn ${activeSettingsTab === 'forms' ? 'active' : ''}`}
              onClick={() => { setActiveSettingsTab('forms'); setSaveSuccess(false); }}
            >
              <Sliders size={16} /> Formulários & Campos
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

            {/* 1.5. FORMS & FIELDS CUSTOMIZATION */}
            {activeSettingsTab === 'forms' && (
              <div className="modal-section">
                <div className="modal-section-title">Personalização de Formulários, Blocos & Seletores</div>
                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                  Personalize os blocos, listas de opções (Sim/Não, checkboxes) e adicione novos campos em Pacientes, Consultas e Agendamentos.
                </p>
                <FormBuilderSettingsTab />
              </div>
            )}

            {/* 2. PREFERENCES */}
            {activeSettingsTab === 'preferences' && (
              <>
                <div className="modal-section">
                  <div className="modal-section-title">Preferências do Sistema & Interface</div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Ajuste a aparência e o comportamento padrão das telas do PodOnly.
                  </p>

                  {/* Layout Mode Selector (Topbar vs Sidebar) */}
                  <div className="form-group" style={{ margin: '0.75rem 0 0 0' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.35rem' }}>Estilo de Navegação (Layout)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleLayoutMode('topbar')}
                        style={{
                          padding: '0.75rem 0.65rem',
                          borderRadius: '10px',
                          border: layoutMode === 'topbar' ? '2px solid var(--brand-dark)' : '1px solid var(--surface-border)',
                          background: layoutMode === 'topbar' ? 'rgba(5, 129, 157, 0.08)' : 'var(--surface-color)',
                          color: layoutMode === 'topbar' ? 'var(--brand-dark)' : 'var(--text-secondary)',
                          fontWeight: layoutMode === 'topbar' ? 700 : 500,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.35rem',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <span>⬆️ Barra Superior (Topbar)</span>
                        <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Padrão com pílula flutuante</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleLayoutMode('sidebar')}
                        style={{
                          padding: '0.75rem 0.65rem',
                          borderRadius: '10px',
                          border: layoutMode === 'sidebar' ? '2px solid var(--brand-light)' : '1px solid var(--surface-border)',
                          background: layoutMode === 'sidebar' ? 'rgba(55, 214, 154, 0.12)' : 'var(--surface-color)',
                          color: layoutMode === 'sidebar' ? 'var(--brand-dark)' : 'var(--text-secondary)',
                          fontWeight: layoutMode === 'sidebar' ? 700 : 500,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.35rem',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <span>⬅️ Menu Lateral (Sidebar)</span>
                        <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Design moderno com barra lateral</span>
                      </button>
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: '0.5rem 0 0 0' }}>
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

                  {/* Primeiras Letras em Maiúsculo Switch */}
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

                  {/* Auto-Correção em Português Switch */}
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
                        Aplica automaticamente acentos em palavras comuns (ex: nao -&gt; não, voce -&gt; você) e corrige erros de digitação ao pressionar Espaço ou pontuação.
                      </span>
                    </div>

                    <div className={`toggle-switch-track ${autoCorrectPortuguese ? 'active' : ''}`}>
                      <div className="toggle-switch-thumb" />
                    </div>
                  </div>

                  {/* Concluir Consultas Passadas Automaticamente Switch */}
                  <div
                    className="toggle-switch-wrapper"
                    onClick={handleToggleAutoCompletePast}
                    style={{ marginTop: '0.75rem' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', paddingRight: '1rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                        Concluir Consultas Passadas Automaticamente
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        Marca automaticamente como "Concluído" as consultas cujo horário de término já passou ao abrir a agenda ou o calendário.
                      </span>
                    </div>

                    <div className={`toggle-switch-track ${autoCompletePastAppointments ? 'active' : ''}`}>
                      <div className="toggle-switch-thumb" />
                    </div>
                  </div>

                  <button className="btn btn-primary" onClick={handleSavePreferences} style={{ width: '100%', fontSize: '0.85rem', marginTop: '0.75rem' }}>
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
                          background: 'var(--brand-gradient)',
                          boxShadow: '0 2px 10px rgba(55, 214, 154, 0.3)'
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
                  <div className="modal-section-title">Configuração de Disparo & Lembretes</div>

                  <label className="modal-checkbox-label">
                    <input
                      type="checkbox"
                      checked={botEnabled}
                      onChange={(e) => setBotEnabled(e.target.checked)}
                    />
                    Habilitar Disparo Automático Diário
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Horário do Disparo Diário</label>
                      <input
                        type="time"
                        className="form-control"
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
                        value={botTime}
                        onChange={(e) => setBotTime(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Antecedência do Lembrete</label>
                      <select
                        className="form-control"
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
                        value={botReminderDays}
                        onChange={(e) => setBotReminderDays(e.target.value)}
                      >
                        <option value="1">1 dia antes (24h de antecedência - Recomendado)</option>
                        <option value="2">2 dias antes (48h de antecedência)</option>
                        <option value="0">No mesmo dia da consulta</option>
                      </select>
                    </div>
                  </div>

                  {/* Presets */}
                  <div style={{ marginTop: '0.75rem' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.35rem', display: 'block' }}>
                      Modelos Prontos (Clique para aplicar):
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                        onClick={() => setBotTemplate('Olá {primeiro_nome}! Passando para lembrar da sua consulta de {procedimento} agendada para {data}, às {hora} na {clinica}. Por favor, responda confirmando sua presença!')}
                      >
                        📋 Lembrete Padrão
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                        onClick={() => setBotTemplate('Olá {primeiro_nome}! Confirmamos sua consulta de {procedimento} em {data} às {hora}.\nLocal: {clinica} - {endereco}.\nEm caso de imprevisto, avise-nos com antecedência!')}
                      >
                        📍 Com Endereço Completo
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                        onClick={() => setBotTemplate('Olá {primeiro_nome}! Sua sessão de {procedimento} está confirmada para {data} às {hora} na {clinica}. Recomendamos comparecer com calçados confortáveis. Até breve!')}
                      >
                        👟 Pré-Atendimento
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                        onClick={() => setBotTemplate('Olá {primeiro_nome}! Esperamos que seus pés estejam ótimos após o procedimento! Lembramos que sua consulta de retorno está agendada para {data} às {hora} na {clinica}.')}
                      >
                        👣 Retorno / Pós-Consulta
                      </button>
                    </div>
                  </div>

                  {/* Textarea */}
                  <div className="form-group" style={{ margin: '0.75rem 0 0 0' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Mensagem Personalizada</label>
                    <textarea
                      ref={templateTextareaRef}
                      className="form-control modal-textarea"
                      rows={4}
                      value={botTemplate}
                      onChange={(e) => setBotTemplate(e.target.value)}
                      placeholder="Digite ou personalize o texto do lembrete..."
                      style={{ fontFamily: 'inherit', fontSize: '0.875rem', lineHeight: '1.4' }}
                    />
                  </div>

                  {/* Tag insertion pills */}
                  <div style={{ marginTop: '0.35rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      Inserir tag no cursor:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                      {[
                        { tag: '{primeiro_nome}', label: 'Primeiro Nome' },
                        { tag: '{nome}', label: 'Nome Completo' },
                        { tag: '{data}', label: 'Data' },
                        { tag: '{hora}', label: 'Horário' },
                        { tag: '{procedimento}', label: 'Procedimento' },
                        { tag: '{clinica}', label: 'Nome da Clínica' },
                        { tag: '{endereco}', label: 'Endereço' },
                        { tag: '{telefone}', label: 'Telefone' }
                      ].map(t => (
                        <button
                          key={t.tag}
                          type="button"
                          onClick={() => handleInsertTag(t.tag)}
                          style={{
                            background: 'rgba(37, 99, 235, 0.08)',
                            border: '1px solid rgba(37, 99, 235, 0.2)',
                            borderRadius: '6px',
                            padding: '0.2rem 0.45rem',
                            fontSize: '0.72rem',
                            color: 'var(--primary-color)',
                            cursor: 'pointer',
                            fontWeight: 500
                          }}
                          title={`Inserir ${t.tag}`}
                        >
                          + {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Live WhatsApp Preview */}
                  <div style={{
                    marginTop: '0.85rem',
                    padding: '0.75rem 1rem',
                    background: '#e5ddd5',
                    borderRadius: '8px',
                    border: '1px solid #d1c7bc',
                    position: 'relative'
                  }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.4rem' }}>
                      Simulação de Visualização no WhatsApp do Paciente:
                    </div>
                    <div style={{
                      background: '#ffffff',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      maxWidth: '92%',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                      position: 'relative',
                      fontSize: '0.85rem',
                      lineHeight: '1.45',
                      whiteSpace: 'pre-wrap',
                      color: '#111827'
                    }}>
                      {getPreviewMessage(botTemplate || 'Olá {primeiro_nome}! Passando para lembrar da sua consulta...')}
                      <div style={{ textAlign: 'right', fontSize: '0.65rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                        14:30 ✓✓
                      </div>
                    </div>
                  </div>

                  <button className="btn btn-primary" onClick={handleSaveSettings} style={{ width: '100%', fontSize: '0.85rem', marginTop: '0.85rem' }}>
                    <Save size={14} style={{ marginRight: '0.25rem' }} /> Salvar Configurações de WhatsApp
                  </button>

                  {saveSuccess && (
                    <div style={{ color: 'var(--success-color)', fontSize: '0.75rem', textAlign: 'center', fontWeight: 500, marginTop: '0.35rem' }}>
                      ✓ Configurações do WhatsApp salvas com sucesso!
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

            {/* 7. SECURITY & AUDIT */}
            {activeSettingsTab === 'security' && (
              <div className="modal-section">
                <div className="modal-section-title" style={{ color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Shield size={18} /> Segurança & Bloqueio de Sessão
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Status Card */}
                  <div style={{ 
                    background: securityStatus?.isLockEnabled ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)', 
                    border: `1px solid ${securityStatus?.isLockEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                    borderRadius: 'var(--radius)', 
                    padding: '1.25rem' 
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {securityStatus?.isLockEnabled ? (
                          <Lock size={18} style={{ color: '#10b981' }} />
                        ) : (
                          <Unlock size={18} style={{ color: 'var(--danger-color)' }} />
                        )}
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          Bloqueio de Sessão com Senha
                        </h4>
                      </div>
                      
                      <span style={{ 
                        padding: '0.25rem 0.6rem', 
                        borderRadius: '6px', 
                        fontSize: '0.75rem', 
                        fontWeight: 700,
                        letterSpacing: '0.03em',
                        background: securityStatus?.isLockEnabled ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: securityStatus?.isLockEnabled ? '#22c55e' : '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}>
                        {securityStatus?.isLockEnabled ? (
                          <>
                            <CheckCircle2 size={13} />
                            PROTEÇÃO ATIVA
                          </>
                        ) : (
                          <>
                            <Unlock size={13} />
                            DESATIVADO
                          </>
                        )}
                      </span>
                    </div>

                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {securityStatus?.isLockEnabled 
                        ? 'O sistema exige uma senha mestra para desbloqueio e protege os prontuários e movimentações financeiras após inatividade ou bloqueio manual.'
                        : 'O bloqueio de sessão está desativado. O sistema abre diretamente sem solicitar senha ao iniciar ou após inatividade.'}
                    </p>

                    {/* Auto-lock Timeout Selector */}
                    <div style={{ 
                      paddingTop: '0.85rem', 
                      borderTop: '1px solid var(--surface-border)', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.5rem'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                          Tempo de Inatividade para Bloqueio
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {securityStatus?.isLockEnabled
                            ? 'Tempo sem usar o mouse ou teclado antes de bloquear a tela.'
                            : 'Ative a proteção para habilitar o bloqueio por inatividade.'}
                        </div>
                      </div>

                      <select
                        className="form-control"
                        style={{ width: 'auto', minWidth: '210px', fontSize: '0.85rem' }}
                        value={inactivityMinutesInput}
                        onChange={(e) => handleInactivityTimeoutChange(Number(e.target.value))}
                        disabled={!securityStatus?.isLockEnabled}
                      >
                        <option value={5}>5 minutos</option>
                        <option value={15}>15 minutos (Padrão)</option>
                        <option value={30}>30 minutos</option>
                        <option value={60}>60 minutos (1 hora)</option>
                        <option value={0}>Nunca bloquear por inatividade</option>
                      </select>
                    </div>

                    {/* Main Actions Bar */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                      {securityStatus?.isLockEnabled ? (
                        <>
                          <button
                            className="btn btn-secondary"
                            onClick={() => window.api.lockSession()}
                            style={{ fontSize: '0.83rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                            title="Bloquear a tela de imediato"
                          >
                            <Shield size={14} /> Bloquear Sessão Agora
                          </button>

                          <button
                            className="btn btn-secondary"
                            onClick={() => {
                              setShowChangePassword(!showChangePassword)
                              setShowRemoveBlock(false)
                              setShowEnableBlock(false)
                              setChangePasswordError(null)
                              setChangePasswordSuccess(false)
                            }}
                            style={{ 
                              fontSize: '0.83rem', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.35rem',
                              background: showChangePassword ? 'rgba(14, 145, 168, 0.1)' : undefined
                            }}
                          >
                            <Key size={14} /> Alterar Senha Mestra
                          </button>

                          <button
                            className="btn btn-secondary"
                            onClick={() => {
                              setShowRemoveBlock(!showRemoveBlock)
                              setShowChangePassword(false)
                              setShowEnableBlock(false)
                              setRemoveBlockError(null)
                              setRemoveBlockSuccess(false)
                            }}
                            style={{ 
                              fontSize: '0.83rem', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.35rem',
                              color: 'var(--danger-color)', 
                              borderColor: 'var(--danger-color)',
                              background: showRemoveBlock ? 'rgba(239, 68, 68, 0.1)' : undefined
                            }}
                          >
                            <Unlock size={14} /> Desativar Bloqueio
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn btn-primary"
                          onClick={() => {
                            setShowEnableBlock(!showEnableBlock)
                            setShowChangePassword(false)
                            setShowRemoveBlock(false)
                            setEnableBlockError(null)
                            setEnableBlockSuccess(false)
                          }}
                          style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                        >
                          <Lock size={15} /> Ativar Proteção por Senha
                        </button>
                      )}
                    </div>
                  </div>

                  {/* FORM: Change Password */}
                  {showChangePassword && (
                    <form onSubmit={handleChangePassword} style={{
                      background: 'var(--surface-ground, rgba(14, 145, 168, 0.04))',
                      border: '1px solid var(--surface-border)',
                      borderRadius: 'var(--radius)',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <Key size={16} style={{ color: 'var(--primary-color)' }} />
                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Alteração de Senha Mestra</span>
                      </div>

                      {changePasswordError && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', padding: '0.5rem 0.75rem', borderRadius: '4px', fontSize: '0.82rem' }}>
                          {changePasswordError}
                        </div>
                      )}

                      {changePasswordSuccess && (
                        <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '0.5rem 0.75rem', borderRadius: '4px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <CheckCircle2 size={14} /> Senha mestra alterada com sucesso!
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Senha Atual</label>
                          <input
                            type="password"
                            className="form-control"
                            placeholder="Digite sua senha atual"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                            disabled={changingPasswordLoading}
                            style={{ fontSize: '0.85rem' }}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Nova Senha</label>
                            <input
                              type="password"
                              className="form-control"
                              placeholder="Mínimo de 4 caracteres"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              required
                              disabled={changingPasswordLoading}
                              style={{ fontSize: '0.85rem' }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Confirmar Nova Senha</label>
                            <input
                              type="password"
                              className="form-control"
                              placeholder="Repita a nova senha"
                              value={confirmNewPassword}
                              onChange={(e) => setConfirmNewPassword(e.target.value)}
                              required
                              disabled={changingPasswordLoading}
                              style={{ fontSize: '0.85rem' }}
                            />
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={changingPasswordLoading}
                          style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <Save size={14} /> {changingPasswordLoading ? 'Salvando...' : 'Salvar Nova Senha'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            setShowChangePassword(false)
                            setCurrentPassword('')
                            setNewPassword('')
                            setConfirmNewPassword('')
                            setChangePasswordError(null)
                          }}
                          disabled={changingPasswordLoading}
                          style={{ fontSize: '0.85rem' }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}

                  {/* FORM: Remove Session Lock */}
                  {showRemoveBlock && (
                    <form onSubmit={handleRemoveSessionBlock} style={{
                      background: 'rgba(239, 68, 68, 0.04)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: 'var(--radius)',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertTriangle size={18} style={{ color: 'var(--danger-color)' }} />
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--danger-color)' }}>
                          Desativar Proteção de Sessão
                        </span>
                      </div>

                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        Atenção: Ao desativar, qualquer pessoa que abrir este aplicativo terá acesso total aos pacientes, históricos clínicos e finanças sem que seja solicitada nenhuma senha.
                      </p>

                      {removeBlockError && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger-color)', padding: '0.5rem 0.75rem', borderRadius: '4px', fontSize: '0.82rem' }}>
                          {removeBlockError}
                        </div>
                      )}

                      {removeBlockSuccess && (
                        <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '0.5rem 0.75rem', borderRadius: '4px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <CheckCircle2 size={14} /> Bloqueio de sessão desativado com sucesso!
                        </div>
                      )}

                      {securityStatus?.hasPassword && (
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
                            Confirme com sua senha mestra atual:
                          </label>
                          <input
                            type="password"
                            className="form-control"
                            placeholder="Digite a senha mestra atual"
                            value={removePassword}
                            onChange={(e) => setRemovePassword(e.target.value)}
                            required
                            disabled={removingBlockLoading}
                            style={{ fontSize: '0.85rem' }}
                          />
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button
                          type="submit"
                          className="btn btn-secondary"
                          disabled={removingBlockLoading}
                          style={{ 
                            fontSize: '0.85rem', 
                            background: 'var(--danger-color)', 
                            color: 'white', 
                            borderColor: 'var(--danger-color)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <Trash2 size={14} /> {removingBlockLoading ? 'Desativando...' : 'Confirmar e Desativar Bloqueio'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            setShowRemoveBlock(false)
                            setRemovePassword('')
                            setRemoveBlockError(null)
                          }}
                          disabled={removingBlockLoading}
                          style={{ fontSize: '0.85rem' }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}

                  {/* FORM: Enable Session Lock */}
                  {showEnableBlock && (
                    <form onSubmit={handleEnableSessionBlock} style={{
                      background: 'rgba(14, 145, 168, 0.04)',
                      border: '1px solid rgba(14, 145, 168, 0.25)',
                      borderRadius: 'var(--radius)',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Lock size={16} style={{ color: 'var(--primary-color)' }} />
                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Ativar Proteção com Senha Mestra</span>
                      </div>

                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        Cadastre a senha que será exigida para entrar no sistema e desbloquear após o tempo de inatividade.
                      </p>

                      {enableBlockError && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', padding: '0.5rem 0.75rem', borderRadius: '4px', fontSize: '0.82rem' }}>
                          {enableBlockError}
                        </div>
                      )}

                      {enableBlockSuccess && (
                        <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '0.5rem 0.75rem', borderRadius: '4px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <CheckCircle2 size={14} /> Proteção ativada com sucesso!
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Criar Senha Mestra</label>
                          <input
                            type="password"
                            className="form-control"
                            placeholder="Mínimo de 4 caracteres"
                            value={enablePassword}
                            onChange={(e) => setEnablePassword(e.target.value)}
                            required
                            disabled={enablingBlockLoading}
                            style={{ fontSize: '0.85rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Confirmar Senha</label>
                          <input
                            type="password"
                            className="form-control"
                            placeholder="Repita a senha"
                            value={enableConfirmPassword}
                            onChange={(e) => setEnableConfirmPassword(e.target.value)}
                            required
                            disabled={enablingBlockLoading}
                            style={{ fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={enablingBlockLoading}
                          style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <Lock size={14} /> {enablingBlockLoading ? 'Ativando...' : 'Ativar Proteção Agora'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            setShowEnableBlock(false)
                            setEnablePassword('')
                            setEnableConfirmPassword('')
                            setEnableBlockError(null)
                          }}
                          disabled={enablingBlockLoading}
                          style={{ fontSize: '0.85rem' }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Audit Logs */}
                  <div style={{ background: 'rgba(14, 145, 168, 0.05)', borderRadius: 'var(--radius)', padding: '1rem', border: '1px solid var(--surface-border)' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Logs de Auditoria</h4>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                      Histórico rastreável de todas as ações de segurança e alterações críticas no sistema.
                    </p>
                    <button
                      type="button"
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

      {showFeetBuilderModal && (
        <FeetCanvasBuilderModal
          isOpen={showFeetBuilderModal}
          onClose={() => setShowFeetBuilderModal(false)}
          onTemplateSaved={() => {
            window.api.getCustomFeetMapBase64().then(setCustomFeetMap).catch(console.error)
          }}
        />
      )}
    </div>,
    document.body
  )
}
