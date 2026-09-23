import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Plus, 
  Calendar as CalendarIcon, 
  ArrowDownRight, 
  ArrowUpRight, 
  Trash2, 
  Edit2, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Search,
  FileText,
  Settings,
  Target,
  Clock,
  CheckCircle2,
  BarChart3,
  ListFilter,
  User
} from 'lucide-react'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  addMonths, 
  subMonths, 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  subDays, 
  startOfQuarter, 
  endOfQuarter, 
  startOfYear, 
  endOfYear,
  addDays
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { 
  FinancialTransaction, 
  FinancialSummary, 
  CreateTransactionPayload,
  TransactionStatus,
  PatientListItem
} from '../../../shared/types'
import FinancialCharts from '../components/FinancialCharts'
import FinancialReportsModal from '../components/FinancialReportsModal'
import FinancialSettingsModal from '../components/FinancialSettingsModal'

type DateFilterPreset = 'TODAY' | 'WEEK' | 'MONTH' | 'LAST_MONTH' | 'QUARTER' | 'YEAR' | 'CUSTOM'

export default function FinancialScreen(): React.JSX.Element {
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('MONTH')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [customStartDate, setCustomStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [customEndDate, setCustomEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const [transactions, setTransactions] = useState<FinancialTransaction[]>([])
  const [summary, setSummary] = useState<FinancialSummary>({ 
    totalIncome: 0, 
    totalExpense: 0, 
    netBalance: 0,
    pendingIncome: 0,
    pendingExpense: 0,
    averageTicket: 0,
    totalTransactions: 0
  })
  const [loading, setLoading] = useState(true)

  // Monthly Revenue Goal from settings
  const DEFAULT_CATEGORIES = useMemo(() => [
    'Consulta', 'Avaliação', 'Órtese Ungueal', 'Palmilha', 'Produto', 'Equipamento', 'Material', 'Aluguel', 'Água/Luz/Internet'
  ], [])
  const [monthlyGoal, setMonthlyGoal] = useState<number>(0)
  const [categoriesList, setCategoriesList] = useState<string[]>([
    'Consulta', 'Avaliação', 'Órtese Ungueal', 'Palmilha', 'Produto', 'Equipamento', 'Material', 'Aluguel', 'Água/Luz/Internet'
  ])
  const [paymentFees, setPaymentFees] = useState<Record<string, number>>({
    'PIX': 0,
    'Cartão de Débito': 1.99,
    'Cartão de Crédito': 3.49,
    'Dinheiro': 0,
    'Boleto': 2.5
  })

  // Patients for auto-linking
  const [patients, setPatients] = useState<PatientListItem[]>([])

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<'transactions' | 'charts'>('transactions')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL')
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'COMPLETED' | 'PENDING'>('ALL')
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('ALL')
  const [filterCategory, setFilterCategory] = useState<string>('ALL')

  // Modals
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [showReportsModal, setShowReportsModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  // Transaction Form States
  const [formType, setFormType] = useState<'INCOME' | 'EXPENSE'>('INCOME')
  const [formAmount, setFormAmount] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formDateStr, setFormDateStr] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
  const [formDueDateStr, setFormDueDateStr] = useState(format(new Date(), "yyyy-MM-dd"))
  const [formCategory, setFormCategory] = useState('')
  const [formPaymentMethod, setFormPaymentMethod] = useState('PIX')
  const [formStatus, setFormStatus] = useState<TransactionStatus>('COMPLETED')
  const [formPatientId, setFormPatientId] = useState<number | null>(null)
  const [formInstallments, setFormInstallments] = useState<number>(1)
  const [formNotes, setFormNotes] = useState('')

  // Compute Active Date Range
  const { startDateIso, endDateIso, rangeLabel } = useMemo(() => {
    let s = new Date()
    let e = new Date()

    switch (datePreset) {
      case 'TODAY':
        s = startOfDay(new Date())
        e = endOfDay(new Date())
        break
      case 'WEEK':
        s = startOfWeek(new Date(), { weekStartsOn: 1 })
        e = endOfWeek(new Date(), { weekStartsOn: 1 })
        break
      case 'MONTH':
        s = startOfMonth(currentDate)
        e = endOfMonth(currentDate)
        break
      case 'LAST_MONTH':
        const lm = subMonths(new Date(), 1)
        s = startOfMonth(lm)
        e = endOfMonth(lm)
        break
      case 'QUARTER':
        s = startOfQuarter(new Date())
        e = endOfQuarter(new Date())
        break
      case 'YEAR':
        s = startOfYear(new Date())
        e = endOfYear(new Date())
        break
      case 'CUSTOM':
        s = startOfDay(new Date(customStartDate))
        e = endOfDay(new Date(customEndDate))
        break
    }

    const label = datePreset === 'MONTH'
      ? format(currentDate, "MMMM 'de' yyyy", { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())
      : `${format(s, 'dd/MM/yyyy')} até ${format(e, 'dd/MM/yyyy')}`

    return {
      startDateIso: s.toISOString(),
      endDateIso: e.toISOString(),
      rangeLabel: label
    }
  }, [datePreset, currentDate, customStartDate, customEndDate])

  // Initial Load & Listeners
  useEffect(() => {
    loadSettings()
    loadPatients()
  }, [])

  useEffect(() => {
    loadData()
  }, [startDateIso, endDateIso])

  const loadSettings = async () => {
    try {
      const [goal, cats, feesRaw] = await Promise.all([
        window.api.getSetting('financial_monthly_goal'),
        window.api.getSetting('financial_custom_categories'),
        window.api.getSetting('financial_payment_fees')
      ])

      if (goal) {
        const p = parseFloat(goal)
        if (!isNaN(p)) setMonthlyGoal(p)
      }
      if (cats) {
        const splitted = cats.split(',').map(s => s.trim()).filter(Boolean)
        if (splitted.length > 0) {
          setCategoriesList(splitted)
        } else {
          setCategoriesList(DEFAULT_CATEGORIES)
        }
      } else {
        setCategoriesList(DEFAULT_CATEGORIES)
      }
      if (feesRaw) {
        try {
          const parsed = JSON.parse(feesRaw)
          if (Array.isArray(parsed)) {
            const feeMap: Record<string, number> = {}
            for (const item of parsed) {
              if (item.method) feeMap[item.method] = Number(item.feePercent) || 0
            }
            setPaymentFees(prev => ({ ...prev, ...feeMap }))
          }
        } catch {}
      }
    } catch (err) {
      console.error('Erro ao carregar settings financeiras:', err)
    }
  }

  const loadPatients = async () => {
    try {
      const res = await window.api.listPatients('alphabetical', '')
      setPatients(res)
    } catch (e) {
      console.error(e)
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const fetchedTransactions = await window.api.getTransactions(startDateIso, endDateIso)
      const fetchedSummary = await window.api.getFinancialSummary(startDateIso, endDateIso)
      
      setTransactions(fetchedTransactions)
      setSummary(fetchedSummary)
    } catch (err) {
      console.error('Failed to load financial data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePrevMonth = () => {
    setDatePreset('MONTH')
    setCurrentDate(prev => subMonths(prev, 1))
  }
  const handleNextMonth = () => {
    setDatePreset('MONTH')
    setCurrentDate(prev => addMonths(prev, 1))
  }
  const handleCurrentMonth = () => {
    setDatePreset('MONTH')
    setCurrentDate(new Date())
  }

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesDesc = t.description?.toLowerCase().includes(q)
        const matchesCat = t.category?.toLowerCase().includes(q)
        const matchesPatient = t.patient_name?.toLowerCase().includes(q)
        if (!matchesDesc && !matchesCat && !matchesPatient) return false
      }

      // Type
      if (filterType !== 'ALL' && t.type !== filterType) return false

      // Status
      if (filterStatus !== 'ALL') {
        const s = t.status || 'COMPLETED'
        if (s !== filterStatus) return false
      }

      // Payment method
      if (filterPaymentMethod !== 'ALL') {
        if (t.payment_method !== filterPaymentMethod) return false
      }

      // Category
      if (filterCategory !== 'ALL') {
        if ((t.category || '').trim() !== filterCategory) return false
      }

      return true
    })
  }, [transactions, searchQuery, filterType, filterStatus, filterPaymentMethod, filterCategory])

  const openTransactionModal = (transaction?: FinancialTransaction) => {
    if (transaction) {
      setEditingId(transaction.id)
      setFormType(transaction.type)
      setFormAmount(transaction.amount.toString())
      setFormDescription(transaction.description)
      setFormDateStr(transaction.date.slice(0, 16))
      setFormDueDateStr(transaction.due_date ? transaction.due_date.slice(0, 10) : transaction.date.slice(0, 10))
      setFormCategory(transaction.category || '')
      setFormPaymentMethod(transaction.payment_method)
      setFormStatus(transaction.status || 'COMPLETED')
      setFormPatientId(transaction.patient_id || null)
      setFormInstallments(1)
      setFormNotes(transaction.notes || '')
    } else {
      setEditingId(null)
      setFormType('INCOME')
      setFormAmount('')
      setFormDescription('')
      setFormDateStr(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
      setFormDueDateStr(format(new Date(), "yyyy-MM-dd"))
      setFormCategory(categoriesList[0] || 'Consulta')
      setFormPaymentMethod('PIX')
      setFormStatus('COMPLETED')
      setFormPatientId(null)
      setFormInstallments(1)
      setFormNotes('')
    }
    setShowTransactionModal(true)
  }

  const closeTransactionModal = () => {
    setShowTransactionModal(false)
  }

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    const numericAmount = parseFloat(formAmount.replace(',', '.'))
    if (!formDescription || isNaN(numericAmount) || numericAmount <= 0 || !formDateStr) return

    const feePct = formType === 'INCOME' ? (paymentFees[formPaymentMethod] || 0) : 0
    const feeAmount = (numericAmount * feePct) / 100
    const netAmount = numericAmount - feeAmount

    if (editingId) {
      const payload: CreateTransactionPayload = {
        type: formType,
        amount: numericAmount,
        description: formDescription.trim(),
        date: new Date(formDateStr).toISOString(),
        due_date: new Date(formDueDateStr).toISOString(),
        payment_date: formStatus === 'COMPLETED' ? new Date(formDateStr).toISOString() : null,
        category: formCategory.trim() || null,
        payment_method: formPaymentMethod,
        status: formStatus,
        patient_id: formPatientId,
        notes: formNotes.trim() || null,
        fee_amount: feeAmount,
        net_amount: netAmount
      }
      await window.api.updateTransaction(editingId, payload)
    } else {
      // Multiple installments support
      const totalInstallments = Math.max(1, Math.min(12, formInstallments))
      const installmentAmount = numericAmount / totalInstallments

      for (let i = 1; i <= totalInstallments; i++) {
        const instDate = i === 1 
          ? new Date(formDateStr) 
          : addDays(new Date(formDateStr), (i - 1) * 30)
        
        const instDueDate = i === 1
          ? new Date(formDueDateStr)
          : addDays(new Date(formDueDateStr), (i - 1) * 30)

        const instFee = (installmentAmount * feePct) / 100
        const instNet = installmentAmount - instFee

        const payload: CreateTransactionPayload = {
          type: formType,
          amount: installmentAmount,
          description: totalInstallments > 1 
            ? `${formDescription.trim()} (${i}/${totalInstallments})` 
            : formDescription.trim(),
          date: instDate.toISOString(),
          due_date: instDueDate.toISOString(),
          payment_date: (i === 1 && formStatus === 'COMPLETED') ? instDate.toISOString() : null,
          category: formCategory.trim() || null,
          payment_method: formPaymentMethod,
          status: i === 1 ? formStatus : 'PENDING',
          installment_current: i,
          installment_total: totalInstallments,
          patient_id: formPatientId,
          notes: formNotes.trim() || null,
          fee_amount: instFee,
          net_amount: instNet
        }
        await window.api.createTransaction(payload)
      }
    }

    closeTransactionModal()
    loadData()
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta transação?')) {
      await window.api.deleteTransaction(id)
      loadData()
    }
  }

  const handleToggleStatus = async (t: FinancialTransaction) => {
    const nextStatus: TransactionStatus = t.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED'
    await window.api.updateTransaction(t.id, {
      ...t,
      status: nextStatus,
      payment_date: nextStatus === 'COMPLETED' ? new Date().toISOString() : null
    })
    loadData()
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  // Goal Progress
  const goalPercent = monthlyGoal > 0 ? Math.min(100, Math.round((summary.totalIncome / monthlyGoal) * 100)) : 0

  return (
    <div className="financial-container animate-fade-in-up">
      {/* Top Header */}
      <div className="financial-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h2 className="screen-title" style={{ margin: 0 }}>Financeiro</h2>
            <span style={{ 
              fontSize: '0.72rem', 
              fontWeight: 700, 
              padding: '0.2rem 0.6rem', 
              borderRadius: '9999px', 
              background: 'rgba(55, 214, 154, 0.15)', 
              color: 'var(--brand-dark)', 
              border: '1px solid rgba(55, 214, 154, 0.3)' 
            }}>
              GESTÃO CLÍNICA
            </span>
          </div>
          <p className="screen-subtitle" style={{ margin: '0.25rem 0 0 0' }}>
            Fluxo de caixa, relatórios analíticos, DRE e controle de recebíveis
          </p>
        </div>

        {/* Action Buttons Top Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => setShowSettingsModal(true)}
            title="Configurar metas, taxas e categorias"
            style={{ fontSize: '0.84rem', padding: '0.55rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Settings size={15} /> Configurações
          </button>

          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => setShowReportsModal(true)}
            title="Abrir demonstrativo DRE e relatórios gerenciais"
            style={{ fontSize: '0.84rem', padding: '0.55rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <FileText size={15} /> Relatórios &amp; DRE
          </button>

          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={() => openTransactionModal()}
            style={{ fontSize: '0.84rem', padding: '0.55rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Plus size={16} /> Nova Transação
          </button>
        </div>
      </div>

      {/* Date Presets Toolbar & Month Navigator */}
      <div className="glass-card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        {/* Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {[
            { id: 'TODAY', label: 'Hoje' },
            { id: 'WEEK', label: 'Esta Semana' },
            { id: 'MONTH', label: 'Este Mês' },
            { id: 'LAST_MONTH', label: 'Mês Passado' },
            { id: 'QUARTER', label: 'Trimestre' },
            { id: 'YEAR', label: 'Este Ano' },
            { id: 'CUSTOM', label: 'Personalizado' }
          ].map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setDatePreset(p.id as DateFilterPreset)}
              style={{
                background: datePreset === p.id ? 'var(--brand-gradient)' : 'rgba(5, 129, 157, 0.05)',
                color: datePreset === p.id ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: datePreset === p.id ? '0 2px 8px rgba(55, 214, 154, 0.3)' : 'none'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date Selector Navigation */}
        {datePreset === 'MONTH' ? (
          <div className="month-selector" style={{ background: 'rgba(5, 129, 157, 0.06)', padding: '0.25rem 0.6rem', borderRadius: '20px' }}>
            <button className="icon-btn" onClick={handlePrevMonth} title="Mês anterior"><ChevronLeft size={18} /></button>
            <div className="current-month" onClick={handleCurrentMonth} title="Clique para ir ao mês atual">
              <CalendarIcon size={16} className="month-icon" />
              <span style={{ fontSize: '0.88rem' }}>{format(currentDate, 'MMMM yyyy', { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())}</span>
            </div>
            <button className="icon-btn" onClick={handleNextMonth} title="Próximo mês"><ChevronRight size={18} /></button>
          </div>
        ) : datePreset === 'CUSTOM' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
            <input 
              type="date" 
              value={customStartDate} 
              onChange={e => setCustomStartDate(e.target.value)} 
              className="form-input" 
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }} 
            />
            <span style={{ color: 'var(--text-secondary)' }}>até</span>
            <input 
              type="date" 
              value={customEndDate} 
              onChange={e => setCustomEndDate(e.target.value)} 
              className="form-input" 
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }} 
            />
          </div>
        ) : (
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brand-dark)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CalendarIcon size={16} />
            <span>{rangeLabel}</span>
          </div>
        )}
      </div>

      {/* 5 KPI Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        {/* KPI 1: Receita Total */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>RECEITAS TOTAIS</span>
            <div style={{ padding: '6px', borderRadius: '10px', background: 'rgba(55, 214, 154, 0.15)', color: '#16a34a' }}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#16a34a', marginTop: '0.4rem' }}>
            {formatCurrency(summary.totalIncome)}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            ✓ {formatCurrency(summary.completedIncome || summary.totalIncome)} liquidado
          </div>
        </div>

        {/* KPI 2: Despesas */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>DESPESAS</span>
            <div style={{ padding: '6px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626' }}>
              <TrendingDown size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#dc2626', marginTop: '0.4rem' }}>
            {formatCurrency(summary.totalExpense)}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Custos e despesas operacionais
          </div>
        </div>

        {/* KPI 3: Saldo Líquido */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>LUCRO LÍQUIDO</span>
            <div style={{ padding: '6px', borderRadius: '10px', background: 'rgba(5, 129, 157, 0.1)', color: 'var(--brand-dark)' }}>
              <DollarSign size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: summary.netBalance >= 0 ? 'var(--brand-dark)' : '#dc2626', marginTop: '0.4rem' }}>
            {formatCurrency(summary.netBalance)}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Margem: {summary.totalIncome > 0 ? ((summary.netBalance / summary.totalIncome) * 100).toFixed(1) : 0}%
          </div>
        </div>

        {/* KPI 4: Contas a Receber */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>A RECEBER / PENDENTE</span>
            <div style={{ padding: '6px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
              <Clock size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.4rem' }}>
            {formatCurrency(summary.pendingIncome || 0)}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            {summary.pendingCount || 0} lançamento(s) pendente(s)
          </div>
        </div>

        {/* KPI 5: Ticket Médio & Meta */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>TICKET MÉDIO</span>
            <div style={{ padding: '6px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
              <Target size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.4rem' }}>
            {formatCurrency(summary.averageTicket || 0)}
          </div>
          {monthlyGoal > 0 ? (
            <div style={{ marginTop: '0.35rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                <span>Meta: {formatCurrency(monthlyGoal)}</span>
                <span>{goalPercent}%</span>
              </div>
              <div style={{ width: '100%', height: '5px', background: 'rgba(5, 129, 157, 0.1)', borderRadius: '9999px', overflow: 'hidden' }}>
                <div style={{ width: `${goalPercent}%`, height: '100%', background: 'var(--brand-gradient)', borderRadius: '9999px' }} />
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Por atendimento concluído
            </div>
          )}
        </div>
      </div>

      {/* Main Section: Tabs Switcher (Lançamentos vs Gráficos) */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Tab Switcher */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className={`btn ${activeTab === 'transactions' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('transactions')}
              style={{ fontSize: '0.84rem', padding: '0.45rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <ListFilter size={16} />
              <span>Lançamentos ({filteredTransactions.length})</span>
            </button>

            <button
              type="button"
              className={`btn ${activeTab === 'charts' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('charts')}
              style={{ fontSize: '0.84rem', padding: '0.45rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <BarChart3 size={16} />
              <span>Gráficos &amp; Análise</span>
            </button>
          </div>

          {/* Quick Filters Row (when on transactions tab) */}
          {activeTab === 'transactions' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              {/* Search */}
              <div style={{ position: 'relative', minWidth: '180px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  placeholder="Buscar lançamentos..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    padding: '0.4rem 0.6rem 0.4rem 2rem',
                    borderRadius: '8px',
                    border: '1px solid var(--surface-border)',
                    fontSize: '0.82rem',
                    width: '100%'
                  }}
                />
              </div>

              {/* Filter Type */}
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as any)}
                style={{ padding: '0.4rem 0.6rem', borderRadius: '8px', border: '1px solid var(--surface-border)', fontSize: '0.82rem' }}
              >
                <option value="ALL">Todos os Tipos</option>
                <option value="INCOME">Apenas Receitas</option>
                <option value="EXPENSE">Apenas Despesas</option>
              </select>

              {/* Filter Status */}
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as any)}
                style={{ padding: '0.4rem 0.6rem', borderRadius: '8px', border: '1px solid var(--surface-border)', fontSize: '0.82rem' }}
              >
                <option value="ALL">Todos os Status</option>
                <option value="COMPLETED">Concluídos / Pagos</option>
                <option value="PENDING">Pendentes / A Receber</option>
              </select>

              {/* Filter Payment Method */}
              <select
                value={filterPaymentMethod}
                onChange={e => setFilterPaymentMethod(e.target.value)}
                style={{ padding: '0.4rem 0.6rem', borderRadius: '8px', border: '1px solid var(--surface-border)', fontSize: '0.82rem' }}
              >
                <option value="ALL">Todas as Formas</option>
                <option value="PIX">PIX</option>
                <option value="Cartão de Débito">Débito</option>
                <option value="Cartão de Crédito">Crédito</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Boleto">Boleto</option>
              </select>

              {/* Filter Category */}
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                style={{ padding: '0.4rem 0.6rem', borderRadius: '8px', border: '1px solid var(--surface-border)', fontSize: '0.82rem' }}
              >
                <option value="ALL">Todas as Categorias</option>
                {categoriesList.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Tab Content: Charts View */}
        {activeTab === 'charts' ? (
          <FinancialCharts transactions={transactions} />
        ) : (
          /* Tab Content: Transactions Table */
          loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Carregando lançamentos...
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="empty-state" style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
              <DollarSign size={48} color="var(--brand-dark)" style={{ opacity: 0.4, marginBottom: '0.75rem' }} />
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Nenhuma transação encontrada</h3>
              <p style={{ margin: '0.35rem 0 1.25rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Não há lançamentos para os filtros e período selecionados.
              </p>
              <button className="btn btn-primary" onClick={() => openTransactionModal()} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <Plus size={16} /> Nova Transação
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data / Vencimento</th>
                    <th>Descrição &amp; Paciente</th>
                    <th>Categoria</th>
                    <th>Pagamento</th>
                    <th>Status</th>
                    <th className="text-right">Valor</th>
                    <th className="text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map(t => {
                    const isIncome = t.type === 'INCOME'
                    const isCompleted = (t.status || 'COMPLETED') === 'COMPLETED'

                    return (
                      <tr key={t.id} className={isIncome ? 'row-income' : 'row-expense'}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600 }}>{format(new Date(t.date), "dd/MM/yyyy")}</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{format(new Date(t.date), "HH:mm")}</span>
                          </div>
                        </td>

                        <td className="font-medium">
                          <div className="desc-cell">
                            {isIncome ? (
                              <ArrowUpRight size={16} className="text-green" />
                            ) : (
                              <ArrowDownRight size={16} className="text-red" />
                            )}
                            <div>
                              <div>{t.description}</div>
                              {t.patient_name && (
                                <div style={{ fontSize: '0.74rem', color: 'var(--brand-dark)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '1px' }}>
                                  <User size={11} /> {t.patient_name}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                            {t.category || '-'}
                          </span>
                        </td>

                        <td>
                          <span className="badge" style={{ fontSize: '0.76rem' }}>
                            {t.payment_method}
                          </span>
                        </td>

                        <td>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(t)}
                            title="Clique para alternar entre Concluído e Pendente"
                            style={{
                              border: 'none',
                              background: isCompleted ? 'rgba(22, 163, 74, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                              color: isCompleted ? '#16a34a' : '#d97706',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '6px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                          >
                            {isCompleted ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                            <span>{isCompleted ? 'Liquidado' : 'Pendente'}</span>
                          </button>
                        </td>

                        <td className={`text-right font-bold ${isIncome ? 'text-green' : 'text-red'}`}>
                          <div>
                            {isIncome ? '+' : '-'}{formatCurrency(t.amount)}
                          </div>
                          {isIncome && t.fee_amount && t.fee_amount > 0 ? (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                              Líq: {formatCurrency(t.net_amount || (t.amount - t.fee_amount))}
                            </div>
                          ) : null}
                        </td>

                        <td className="text-right">
                          <div className="actions-cell">
                            <button className="icon-btn-small" onClick={() => openTransactionModal(t)} title="Editar Transação">
                              <Edit2 size={15} />
                            </button>
                            <button className="icon-btn-small delete" onClick={() => handleDelete(t.id)} title="Excluir Transação">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Transaction Create / Edit Modal */}
      {showTransactionModal && createPortal(
        <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={closeTransactionModal}>
          <div className="modal-content glass-card" style={{ maxWidth: '580px', width: '92%', maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>{editingId ? 'Editar Transação' : 'Nova Transação'}</h3>
              <button className="icon-btn" onClick={closeTransactionModal} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveTransaction} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Type selector */}
              <div className="type-selector">
                <button 
                  type="button" 
                  className={`type-btn income ${formType === 'INCOME' ? 'active' : ''}`}
                  onClick={() => setFormType('INCOME')}
                >
                  <TrendingUp size={18} /> Receita
                </button>
                <button 
                  type="button" 
                  className={`type-btn expense ${formType === 'EXPENSE' ? 'active' : ''}`}
                  onClick={() => setFormType('EXPENSE')}
                >
                  <TrendingDown size={18} /> Despesa
                </button>
              </div>

              {/* Description */}
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>Descrição</label>
                <input 
                  type="text" 
                  required 
                  value={formDescription} 
                  onChange={e => setFormDescription(e.target.value)} 
                  placeholder={formType === 'INCOME' ? 'Ex: Consulta Podológica Completa' : 'Ex: Compra de Lâminas e Bisturis'}
                  className="form-input"
                />
              </div>

              {/* Amount and Date */}
              <div className="form-row">
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>Valor (R$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0.01"
                    required 
                    value={formAmount} 
                    onChange={e => setFormAmount(e.target.value)} 
                    placeholder="0.00"
                    className="form-input"
                  />
                </div>
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>Data e Hora</label>
                  <input 
                    type="datetime-local" 
                    required 
                    value={formDateStr} 
                    onChange={e => setFormDateStr(e.target.value)} 
                    className="form-input"
                  />
                </div>
              </div>

              {/* Category and Payment Method */}
              <div className="form-row">
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>Categoria</label>
                  <select 
                    value={categoriesList.includes(formCategory) ? formCategory : (formCategory ? 'OUTRA' : (categoriesList[0] || 'Consulta'))} 
                    onChange={e => {
                      if (e.target.value === 'OUTRA') {
                        setFormCategory('')
                      } else {
                        setFormCategory(e.target.value)
                      }
                    }} 
                    className="form-input"
                  >
                    {categoriesList.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="OUTRA">➕ Outra Categoria (Digitar)...</option>
                  </select>
                  {(!categoriesList.includes(formCategory) || formCategory === '') && (
                    <input 
                      type="text" 
                      value={formCategory} 
                      onChange={e => setFormCategory(e.target.value)} 
                      placeholder="Digite a categoria personalizada..."
                      className="form-input"
                      style={{ marginTop: '0.4rem' }}
                      autoFocus
                    />
                  )}
                </div>

                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>Forma de Pagamento</label>
                  <select 
                    value={formPaymentMethod} 
                    onChange={e => setFormPaymentMethod(e.target.value)}
                    className="form-input"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Boleto">Boleto</option>
                  </select>
                </div>
              </div>

              {/* Status & Patient link */}
              <div className="form-row">
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>Status do Pagamento</label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as TransactionStatus)}
                    className="form-input"
                  >
                    <option value="COMPLETED">Liquidado / Pago</option>
                    <option value="PENDING">A Receber / Pendente</option>
                  </select>
                </div>

                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>Vincular Paciente (Opcional)</label>
                  <select
                    value={formPatientId || ''}
                    onChange={e => setFormPatientId(e.target.value ? Number(e.target.value) : null)}
                    className="form-input"
                  >
                    <option value="">Nenhum paciente vinculado</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.first_name} {p.last_name || ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Due Date & Installments (Only if new transaction) */}
              {!editingId && (
                <div className="form-row">
                  <div className="form-group" style={{ flex: 1, margin: 0 }}>
                    <label style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>Data de Vencimento</label>
                    <input 
                      type="date" 
                      value={formDueDateStr} 
                      onChange={e => setFormDueDateStr(e.target.value)} 
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ flex: 1, margin: 0 }}>
                    <label style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>Parcelamento</label>
                    <select
                      value={formInstallments}
                      onChange={e => setFormInstallments(Number(e.target.value))}
                      className="form-input"
                    >
                      <option value={1}>À vista (1x)</option>
                      <option value={2}>2 parcelas mensais</option>
                      <option value={3}>3 parcelas mensais</option>
                      <option value={4}>4 parcelas mensais</option>
                      <option value={6}>6 parcelas mensais</option>
                      <option value={10}>10 parcelas mensais</option>
                      <option value={12}>12 parcelas mensais</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>Observações / Detalhes</label>
                <input 
                  type="text" 
                  value={formNotes} 
                  onChange={e => setFormNotes(e.target.value)} 
                  placeholder="Ex: Pago via chave celular, nota fiscal #124..."
                  className="form-input"
                />
              </div>

              {/* Fee Notice */}
              {formType === 'INCOME' && paymentFees[formPaymentMethod] > 0 && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'rgba(5, 129, 157, 0.05)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                  ℹ️ Taxa estimada da operadora: <strong>{paymentFees[formPaymentMethod]}%</strong> (será abatida para cálculo do DRE).
                </div>
              )}

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={closeTransactionModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Salvar Alterações' : 'Confirmar Lançamento'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Reports & DRE Modal */}
      {showReportsModal && createPortal(
        <FinancialReportsModal
          transactions={transactions}
          summary={summary}
          dateRangeLabel={rangeLabel}
          onClose={() => setShowReportsModal(false)}
        />,
        document.body
      )}

      {/* Settings Modal */}
      {showSettingsModal && createPortal(
        <FinancialSettingsModal
          onClose={() => setShowSettingsModal(false)}
          onSettingsSaved={() => {
            loadSettings()
            loadData()
          }}
        />,
        document.body
      )}

      <style>{`
        .financial-container {
          max-width: 1280px;
          margin: 0 auto;
        }

        .financial-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .month-selector {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .current-month {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-weight: 600;
          color: var(--text-primary);
          padding: 0 0.5rem;
          user-select: none;
        }

        .month-icon {
          color: var(--brand-dark);
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table th, .data-table td {
          padding: 0.85rem 1rem;
          text-align: left;
          border-bottom: 1px solid rgba(5, 129, 157, 0.06);
        }

        .data-table th {
          font-size: 0.78rem;
          text-transform: uppercase;
          color: var(--text-secondary);
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .text-right { text-align: right !important; }
        .text-green { color: #16a34a; }
        .text-red { color: #dc2626; }
        .font-medium { font-weight: 500; }
        .font-bold { font-weight: 700; }

        .desc-cell {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .badge {
          background: rgba(5, 129, 157, 0.08);
          color: var(--brand-dark);
          padding: 0.2rem 0.55rem;
          border-radius: 6px;
          font-weight: 600;
        }

        .actions-cell {
          display: flex;
          justify-content: flex-end;
          gap: 0.4rem;
        }

        .icon-btn-small {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0.35rem;
          border-radius: 6px;
          transition: background 0.2s, color 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .icon-btn-small:hover {
          background: rgba(5, 129, 157, 0.1);
          color: var(--brand-dark);
        }

        .icon-btn-small.delete:hover {
          color: #dc2626;
          background: rgba(239, 68, 68, 0.1);
        }

        .modal-content {
          background: #ffffff;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
          border: 1px solid rgba(5, 129, 157, 0.15);
        }

        .modal-header {
          padding-bottom: 0.85rem;
          border-bottom: 1px solid var(--surface-border);
          margin-bottom: 1rem;
        }

        .type-selector {
          display: flex;
          gap: 0.75rem;
        }

        .type-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          padding: 0.75rem;
          border: 1px solid var(--surface-border);
          border-radius: 10px;
          background: #ffffff;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          color: var(--text-secondary);
          font-size: 0.88rem;
        }

        .type-btn.income.active {
          border-color: #16a34a;
          background: rgba(22, 163, 74, 0.1);
          color: #16a34a;
        }

        .type-btn.expense.active {
          border-color: #dc2626;
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
        }

        .form-row {
          display: flex;
          gap: 0.85rem;
        }

        .form-input {
          width: 100%;
          padding: 0.65rem 0.85rem;
          border: 1px solid var(--surface-border);
          border-radius: 8px;
          font-size: 0.88rem;
          color: var(--text-primary);
          background: #f8fafc;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--brand-dark);
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(5, 129, 157, 0.12);
        }
      `}</style>
    </div>
  )
}
