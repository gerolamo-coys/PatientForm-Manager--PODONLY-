import React, { useMemo } from 'react'
import type { FinancialTransaction } from '../../../shared/types'
import { TrendingUp, BarChart3, CreditCard } from 'lucide-react'

interface FinancialChartsProps {
  transactions: FinancialTransaction[]
}

export default function FinancialCharts({ transactions }: FinancialChartsProps): React.JSX.Element {
  // Format currency helper
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  // 1. By Category (Income)
  const { incomeCategories, totalIncomeVal } = useMemo(() => {
    const incMap = new Map<string, number>()
    let incSum = 0

    for (const t of transactions) {
      if (t.status === 'CANCELLED') continue
      const cat = t.category?.trim() || 'Outros'
      if (t.type === 'INCOME') {
        incMap.set(cat, (incMap.get(cat) || 0) + t.amount)
        incSum += t.amount
      }
    }

    const incArr = Array.from(incMap.entries())
      .map(([name, total]) => ({ name, total, percent: incSum > 0 ? (total / incSum) * 100 : 0 }))
      .sort((a, b) => b.total - a.total)

    return {
      incomeCategories: incArr,
      totalIncomeVal: incSum
    }
  }, [transactions])

  // 2. By Payment Method
  const paymentMethods = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>()
    let totalIncome = 0

    for (const t of transactions) {
      if (t.status === 'CANCELLED' || t.type !== 'INCOME') continue
      const method = t.payment_method?.trim() || 'Outros'
      const existing = map.get(method) || { count: 0, total: 0 }
      map.set(method, {
        count: existing.count + 1,
        total: existing.total + t.amount
      })
      totalIncome += t.amount
    }

    return Array.from(map.entries())
      .map(([method, data]) => ({
        method,
        count: data.count,
        total: data.total,
        percent: totalIncome > 0 ? (data.total / totalIncome) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total)
  }, [transactions])

  // 3. Daily aggregation for mini timeline / bar chart
  const dailyFlow = useMemo(() => {
    const map = new Map<string, { dateStr: string; dayLabel: string; income: number; expense: number }>()

    for (const t of transactions) {
      if (t.status === 'CANCELLED') continue
      const dateKey = t.date.slice(0, 10)
      const dayLabel = dateKey.split('-').slice(1).reverse().join('/') // DD/MM
      const curr = map.get(dateKey) || { dateStr: dateKey, dayLabel, income: 0, expense: 0 }
      if (t.type === 'INCOME') {
        curr.income += t.amount
      } else {
        curr.expense += t.amount
      }
      map.set(dateKey, curr)
    }

    const arr = Array.from(map.values()).sort((a, b) => a.dateStr.localeCompare(b.dateStr))
    const maxVal = Math.max(...arr.map(d => Math.max(d.income, d.expense)), 100)

    return {
      days: arr,
      maxVal
    }
  }, [transactions])

  // Distinct palette colors for categories
  const palette = [
    '#37d69a',
    '#05819d',
    '#3b82f6',
    '#f59e0b',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#f97316',
    '#64748b'
  ]

  if (transactions.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
        <BarChart3 size={42} style={{ opacity: 0.4, marginBottom: '0.75rem', color: 'var(--brand-dark)' }} />
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Sem dados suficientes para gráficos no período selecionado.</p>
      </div>
    )
  }

  return (
    <div className="financial-charts-grid" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. Bar Chart: Fluxo Diário do Período */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(5, 129, 157, 0.1)', color: 'var(--brand-dark)' }}>
              <BarChart3 size={18} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Fluxo Diário (Receitas vs Despesas)
              </h4>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Comparativo de entradas e saídas ao longo dos dias
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.78rem', fontWeight: 600 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#37d69a' }} />
              <span style={{ color: 'var(--text-primary)' }}>Receitas</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#ef4444' }} />
              <span style={{ color: 'var(--text-primary)' }}>Despesas</span>
            </div>
          </div>
        </div>

        {/* Timeline Chart Container */}
        {dailyFlow.days.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem 0' }}>Sem movimentação diária.</p>
        ) : (
          <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
            <div style={{ minWidth: `${Math.max(dailyFlow.days.length * 52, 400)}px`, height: '180px', display: 'flex', alignItems: 'flex-end', gap: '12px', padding: '10px 0' }}>
              {dailyFlow.days.map((item) => {
                const incHeight = Math.max((item.income / dailyFlow.maxVal) * 140, item.income > 0 ? 6 : 0)
                const expHeight = Math.max((item.expense / dailyFlow.maxVal) * 140, item.expense > 0 ? 6 : 0)

                return (
                  <div 
                    key={item.dateStr} 
                    style={{ 
                      flex: 1, 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      height: '100%', 
                      justifyContent: 'flex-end',
                      position: 'relative'
                    }}
                    title={`${item.dayLabel}\nReceitas: ${formatCurrency(item.income)}\nDespesas: ${formatCurrency(item.expense)}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '140px', width: '100%', justifyContent: 'center' }}>
                      {/* Income Bar */}
                      <div 
                        style={{ 
                          width: '12px', 
                          height: `${incHeight}px`, 
                          background: 'linear-gradient(180deg, #37d69a 0%, #05819d 100%)', 
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.3s ease' 
                        }} 
                      />
                      {/* Expense Bar */}
                      <div 
                        style={{ 
                          width: '12px', 
                          height: `${expHeight}px`, 
                          background: '#ef4444', 
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.3s ease' 
                        }} 
                      />
                    </div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '6px', whiteSpace: 'nowrap' }}>
                      {item.dayLabel}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2-Column Row: Categories and Payment Methods */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Receitas por Categoria */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(55, 214, 154, 0.15)', color: '#05819d' }}>
              <TrendingUp size={18} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Receitas por Categoria
              </h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Total: {formatCurrency(totalIncomeVal)}
              </span>
            </div>
          </div>

          {incomeCategories.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '1rem 0' }}>Sem receitas registradas.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {incomeCategories.slice(0, 5).map((cat, idx) => (
                <div key={cat.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                    <span style={{ color: 'var(--text-primary)' }}>{cat.name}</span>
                    <span style={{ color: 'var(--brand-dark)' }}>{formatCurrency(cat.total)} ({cat.percent.toFixed(1)}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '7px', background: 'rgba(5, 129, 157, 0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        width: `${cat.percent}%`, 
                        height: '100%', 
                        background: palette[idx % palette.length], 
                        borderRadius: '9999px',
                        transition: 'width 0.4s ease'
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Formas de Pagamento */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(5, 129, 157, 0.1)', color: 'var(--brand-dark)' }}>
              <CreditCard size={18} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Formas de Pagamento
              </h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Distribuição das receitas recebidas
              </span>
            </div>
          </div>

          {paymentMethods.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '1rem 0' }}>Sem recebimentos registrados.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {paymentMethods.map(m => (
                <div key={m.method} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                    <span style={{ color: 'var(--text-primary)' }}>{m.method} ({m.count}x)</span>
                    <span style={{ color: 'var(--brand-dark)' }}>{formatCurrency(m.total)} ({m.percent.toFixed(1)}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '7px', background: 'rgba(5, 129, 157, 0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        width: `${m.percent}%`, 
                        height: '100%', 
                        background: 'linear-gradient(90deg, #37d69a, #05819d)', 
                        borderRadius: '9999px',
                        transition: 'width 0.4s ease'
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
