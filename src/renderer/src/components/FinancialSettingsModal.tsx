import React, { useState, useEffect } from 'react'
import { X, Settings, Percent, Target, CheckCircle2, Save } from 'lucide-react'

interface FinancialSettingsModalProps {
  onClose: () => void
  onSettingsSaved?: () => void
}

export interface PaymentFeeSetting {
  method: string
  feePercent: number
}

export default function FinancialSettingsModal({ onClose, onSettingsSaved }: FinancialSettingsModalProps): React.JSX.Element {
  const [monthlyGoal, setMonthlyGoal] = useState<string>('')
  const [categoriesStr, setCategoriesStr] = useState<string>('')
  const [fees, setFees] = useState<PaymentFeeSetting[]>([
    { method: 'PIX', feePercent: 0 },
    { method: 'Cartão de Débito', feePercent: 1.99 },
    { method: 'Cartão de Crédito', feePercent: 3.49 },
    { method: 'Dinheiro', feePercent: 0 },
    { method: 'Boleto', feePercent: 2.5 }
  ])
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      window.api.getSetting('financial_monthly_goal'),
      window.api.getSetting('financial_custom_categories'),
      window.api.getSetting('financial_payment_fees')
    ]).then(([goal, cats, feesRaw]) => {
      if (goal) setMonthlyGoal(goal)
      if (cats) {
        setCategoriesStr(cats)
      } else {
        setCategoriesStr('Consulta, Avaliação, Órtese Ungueal, Palmilha, Produto, Equipamento, Material, Aluguel, Água/Luz/Internet')
      }
      if (feesRaw) {
        try {
          const parsed = JSON.parse(feesRaw)
          if (Array.isArray(parsed)) setFees(parsed)
        } catch {
          // Use defaults
        }
      }
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const handleFeeChange = (index: number, newFee: string) => {
    const parsed = parseFloat(newFee.replace(',', '.')) || 0
    setFees(prev => prev.map((f, i) => i === index ? { ...f, feePercent: parsed } : f))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await window.api.setSetting('financial_monthly_goal', monthlyGoal.trim())
      await window.api.setSetting('financial_custom_categories', categoriesStr.trim())
      await window.api.setSetting('financial_payment_fees', JSON.stringify(fees))
      
      setSavedSuccess(true)
      setTimeout(() => {
        setSavedSuccess(false)
        if (onSettingsSaved) onSettingsSaved()
        onClose()
      }, 1000)
    } catch (err) {
      console.error('Falha ao salvar configurações financeiras:', err)
      alert('Erro ao salvar configurações.')
    }
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="modal-content glass-card" style={{ maxWidth: '560px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(5, 129, 157, 0.1)', color: 'var(--brand-dark)' }}>
              <Settings size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Configurações Financeiras
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Metas, taxas de operadoras e categorias
              </span>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} style={{ cursor: 'pointer', background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Carregando configurações...</div>
        ) : (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Meta Mensal */}
            <div className="modal-section" style={{ background: 'rgba(55, 214, 154, 0.05)', border: '1px solid rgba(55, 214, 154, 0.2)', padding: '1rem', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.4rem', color: 'var(--brand-dark)', fontWeight: 600, fontSize: '0.88rem' }}>
                <Target size={16} />
                <span>Meta Mensal de Faturamento</span>
              </div>
              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Exibida com uma barra de progresso em tempo real no topo do Financeiro.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>R$</span>
                <input
                  type="number"
                  step="50"
                  min="0"
                  placeholder="Ex: 15000"
                  value={monthlyGoal}
                  onChange={e => setMonthlyGoal(e.target.value)}
                  className="form-input"
                  style={{ flex: 1, padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}
                />
              </div>
            </div>

            {/* Taxas das Formas de Pagamento */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.88rem' }}>
                <Percent size={16} color="var(--brand-dark)" />
                <span>Taxas de Intermediação / Maquininha (%)</span>
              </div>
              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Ao lançar uma receita, o PodOnly deduz a taxa automaticamente para exibir o valor líquido real.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {fees.map((f, idx) => (
                  <div key={f.method} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{f.method}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={f.feePercent}
                        onChange={e => handleFeeChange(idx, e.target.value)}
                        style={{ width: '70px', padding: '0.35rem 0.5rem', textAlign: 'right', borderRadius: '6px', border: '1px solid var(--surface-border)', fontSize: '0.85rem' }}
                      />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Categorias Customizáveis */}
            <div>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Categorias de Transações (separadas por vírgula)
              </label>
              <textarea
                rows={3}
                value={categoriesStr}
                onChange={e => setCategoriesStr(e.target.value)}
                placeholder="Ex: Consulta, Produto, Material, Aluguel..."
                className="form-control"
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--surface-border)', fontSize: '0.85rem' }}
              />
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--surface-border)', paddingTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} style={{ padding: '0.6rem 1.2rem' }}>
                Cancelar
              </button>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.2rem' }}
              >
                {savedSuccess ? <CheckCircle2 size={16} /> : <Save size={16} />}
                <span>{savedSuccess ? 'Configurações Salvas!' : 'Salvar Alterações'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
