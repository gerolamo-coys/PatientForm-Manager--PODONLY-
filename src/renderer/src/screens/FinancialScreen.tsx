import React, { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Plus, Calendar as CalendarIcon, ArrowDownRight, ArrowUpRight, Trash2, Edit2, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { FinancialTransaction, FinancialSummary, CreateTransactionPayload } from '../../../shared/types'

export default function FinancialScreen(): React.JSX.Element {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([])
  const [summary, setSummary] = useState<FinancialSummary>({ totalIncome: 0, totalExpense: 0, netBalance: 0 })
  const [loading, setLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  
  // Form states
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('INCOME')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [dateStr, setDateStr] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
  const [category, setCategory] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('PIX')

  useEffect(() => {
    loadData()
  }, [currentDate])

  const loadData = async () => {
    setLoading(true)
    const start = startOfMonth(currentDate).toISOString()
    const end = endOfMonth(currentDate).toISOString()
    
    try {
      const fetchedTransactions = await window.api.getTransactions(start, end)
      const fetchedSummary = await window.api.getFinancialSummary(start, end)
      
      setTransactions(fetchedTransactions)
      setSummary(fetchedSummary)
    } catch (err) {
      console.error('Failed to load financial data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1))
  const handleNextMonth = () => setCurrentDate(prev => addMonths(prev, 1))
  const handleCurrentMonth = () => setCurrentDate(new Date())

  const openModal = (transaction?: FinancialTransaction) => {
    if (transaction) {
      setEditingId(transaction.id)
      setType(transaction.type)
      setAmount(transaction.amount.toString())
      setDescription(transaction.description)
      // Remove Z and milliseconds if any to fit datetime-local
      const formattedDate = transaction.date.slice(0, 16)
      setDateStr(formattedDate)
      setCategory(transaction.category || '')
      setPaymentMethod(transaction.payment_method)
    } else {
      setEditingId(null)
      setType('INCOME')
      setAmount('')
      setDescription('')
      setDateStr(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
      setCategory('')
      setPaymentMethod('PIX')
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description || !amount || !dateStr) return

    const payload: CreateTransactionPayload = {
      type,
      amount: parseFloat(amount.replace(',', '.')),
      description,
      date: new Date(dateStr).toISOString(),
      category: category.trim() || null,
      payment_method: paymentMethod,
      patient_id: null
    }

    if (editingId) {
      await window.api.updateTransaction(editingId, payload)
    } else {
      await window.api.createTransaction(payload)
    }

    closeModal()
    loadData()
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta transação?')) {
      await window.api.deleteTransaction(id)
      loadData()
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  return (
    <div className="financial-container">
      <div className="financial-header">
        <div>
          <h2 className="screen-title">Financeiro</h2>
          <p className="screen-subtitle">Controle suas receitas e despesas</p>
        </div>
        
        <div className="month-selector glass-card">
          <button className="icon-btn" onClick={handlePrevMonth}><ChevronLeft size={20} /></button>
          <div className="current-month" onClick={handleCurrentMonth} style={{ cursor: 'pointer' }}>
            <CalendarIcon size={18} className="month-icon" />
            <span>{format(currentDate, 'MMMM yyyy', { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())}</span>
          </div>
          <button className="icon-btn" onClick={handleNextMonth}><ChevronRight size={20} /></button>
        </div>

        <button className="btn btn-primary" onClick={() => openModal()}>
          <Plus size={18} /> Nova Transação
        </button>
      </div>

      <div className="summary-cards">
        <div className="summary-card glass-card income">
          <div className="card-icon"><TrendingUp size={24} /></div>
          <div className="card-content">
            <span className="card-label">Receitas</span>
            <span className="card-value">{formatCurrency(summary.totalIncome)}</span>
          </div>
        </div>
        
        <div className="summary-card glass-card expense">
          <div className="card-icon"><TrendingDown size={24} /></div>
          <div className="card-content">
            <span className="card-label">Despesas</span>
            <span className="card-value">{formatCurrency(summary.totalExpense)}</span>
          </div>
        </div>

        <div className={`summary-card glass-card balance ${summary.netBalance >= 0 ? 'positive' : 'negative'}`}>
          <div className="card-icon"><DollarSign size={24} /></div>
          <div className="card-content">
            <span className="card-label">Saldo Líquido</span>
            <span className="card-value">{formatCurrency(summary.netBalance)}</span>
          </div>
        </div>
      </div>

      <div className="transactions-section glass-card">
        <h3 className="section-title">Transações de {format(currentDate, 'MMMM', { locale: ptBR })}</h3>
        
        {loading ? (
          <div className="loading-state">Carregando...</div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><DollarSign size={48} /></div>
            <p>Nenhuma transação encontrada neste mês.</p>
            <button className="btn btn-primary" onClick={() => openModal()} style={{ marginTop: '1rem' }}>
              Adicionar Primeira Transação
            </button>
          </div>
        ) : (
          <div className="transactions-list">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Pagamento</th>
                  <th className="text-right">Valor</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id} className={t.type === 'INCOME' ? 'row-income' : 'row-expense'}>
                    <td>{format(new Date(t.date), "dd/MM/yyyy HH:mm")}</td>
                    <td className="font-medium">
                      <div className="desc-cell">
                        {t.type === 'INCOME' ? <ArrowUpRight size={16} className="text-green" /> : <ArrowDownRight size={16} className="text-red" />}
                        {t.description}
                      </div>
                    </td>
                    <td>{t.category || '-'}</td>
                    <td><span className="badge">{t.payment_method}</span></td>
                    <td className={`text-right font-bold ${t.type === 'INCOME' ? 'text-green' : 'text-red'}`}>
                      {t.type === 'INCOME' ? '+' : '-'}{formatCurrency(t.amount)}
                    </td>
                    <td className="text-right">
                      <div className="actions-cell">
                        <button className="icon-btn-small" onClick={() => openModal(t)} title="Editar"><Edit2 size={16} /></button>
                        <button className="icon-btn-small delete" onClick={() => handleDelete(t.id)} title="Excluir"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h3>{editingId ? 'Editar Transação' : 'Nova Transação'}</h3>
              <button className="icon-btn" onClick={closeModal}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="type-selector">
                <button 
                  type="button" 
                  className={`type-btn income ${type === 'INCOME' ? 'active' : ''}`}
                  onClick={() => setType('INCOME')}
                >
                  <TrendingUp size={18} /> Receita
                </button>
                <button 
                  type="button" 
                  className={`type-btn expense ${type === 'EXPENSE' ? 'active' : ''}`}
                  onClick={() => setType('EXPENSE')}
                >
                  <TrendingDown size={18} /> Despesa
                </button>
              </div>

              <div className="form-group">
                <label>Descrição</label>
                <input 
                  type="text" 
                  required 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder={type === 'INCOME' ? 'Ex: Consulta Podologia' : 'Ex: Compra de Materiais'}
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Valor (R$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0.01"
                    required 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)} 
                    placeholder="0.00"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Data e Hora</label>
                  <input 
                    type="datetime-local" 
                    required 
                    value={dateStr} 
                    onChange={e => setDateStr(e.target.value)} 
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Categoria</label>
                  <input 
                    type="text" 
                    value={category} 
                    onChange={e => setCategory(e.target.value)} 
                    placeholder="Ex: Consultas, Aluguel..."
                    className="form-input"
                    list="category-suggestions"
                  />
                  <datalist id="category-suggestions">
                    <option value="Consulta" />
                    <option value="Avaliação" />
                    <option value="Produto" />
                    <option value="Equipamento" />
                    <option value="Material" />
                    <option value="Aluguel" />
                    <option value="Água/Luz/Internet" />
                  </datalist>
                </div>
                <div className="form-group">
                  <label>Método de Pagamento</label>
                  <select 
                    value={paymentMethod} 
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="form-input"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Boleto">Boleto</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar Transação</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .financial-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .financial-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .month-selector {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.5rem;
          border-radius: 30px;
        }

        .current-month {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          color: var(--text-primary);
          min-width: 150px;
          justify-content: center;
        }

        .month-icon {
          color: var(--accent-color);
        }

        .summary-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .summary-card {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding: 1.5rem;
        }

        .card-icon {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .summary-card.income .card-icon {
          background: rgba(34, 197, 94, 0.15);
          color: #16a34a;
        }

        .summary-card.expense .card-icon {
          background: rgba(239, 68, 68, 0.15);
          color: #dc2626;
        }

        .summary-card.balance.positive .card-icon {
          background: rgba(14, 145, 168, 0.15);
          color: var(--accent-color);
        }

        .summary-card.balance.negative .card-icon {
          background: rgba(239, 68, 68, 0.15);
          color: #dc2626;
        }

        .card-content {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .card-label {
          font-size: 0.9rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .card-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .transactions-section {
          padding: 1.5rem;
        }

        .section-title {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
          color: var(--text-primary);
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table th, .data-table td {
          padding: 1rem;
          text-align: left;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .data-table th {
          font-size: 0.85rem;
          text-transform: uppercase;
          color: var(--text-secondary);
          font-weight: 600;
          letter-spacing: 0.05em;
        }

        .text-right { text-align: right !important; }
        .text-green { color: #16a34a; }
        .text-red { color: #dc2626; }
        .font-medium { font-weight: 500; }
        .font-bold { font-weight: 600; }

        .desc-cell {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .badge {
          background: rgba(0, 0, 0, 0.05);
          padding: 0.25rem 0.6rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .actions-cell {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
        }

        .icon-btn-small {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0.4rem;
          border-radius: 6px;
          transition: background 0.2s, color 0.2s;
        }

        .icon-btn-small:hover {
          background: rgba(0, 0, 0, 0.05);
          color: var(--accent-color);
        }

        .icon-btn-small.delete:hover {
          color: #dc2626;
          background: rgba(239, 68, 68, 0.1);
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          width: 100%;
          max-width: 500px;
          padding: 0;
          overflow: hidden;
          animation: slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.25rem;
          color: var(--text-primary);
        }

        .modal-body {
          padding: 1.5rem;
        }

        .type-selector {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .type-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.85rem;
          border: 1px solid var(--surface-border);
          border-radius: 12px;
          background: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          color: var(--text-secondary);
        }

        .type-btn.income.active {
          border-color: #22c55e;
          background: rgba(34, 197, 94, 0.1);
          color: #16a34a;
        }

        .type-btn.expense.active {
          border-color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
        }

        .form-row {
          display: flex;
          gap: 1rem;
        }

        .form-row .form-group {
          flex: 1;
        }

        .form-group {
          margin-bottom: 1.25rem;
        }

        .form-group label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }

        .form-input {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid var(--surface-border);
          border-radius: 10px;
          font-size: 0.95rem;
          color: var(--text-primary);
          background: #f8fafc;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--accent-color);
          background: white;
          box-shadow: 0 0 0 3px rgba(14, 145, 168, 0.1);
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(0, 0, 0, 0.05);
          margin-top: 0.5rem;
        }
      `}</style>
    </div>
  )
}
