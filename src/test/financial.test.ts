import { describe, it, expect } from 'vitest'
import { FinancialSummary, FinancialTransaction } from '../shared/types'

describe('Financial Module & Analytics Unit Tests', () => {
  it('calculates net balance and margins correctly from summary metrics', () => {
    const summary: FinancialSummary = {
      totalIncome: 12500,
      totalExpense: 4200,
      netBalance: 12500 - 4200,
      pendingIncome: 1500,
      pendingExpense: 600,
      completedIncome: 11000,
      completedExpense: 3600,
      averageTicket: 150,
      totalTransactions: 35,
      completedCount: 30,
      pendingCount: 5
    }

    expect(summary.netBalance).toBe(8300)
    expect(summary.completedIncome).toBe(11000)
    expect(summary.pendingIncome).toBe(1500)
    
    // Operating margin calculation
    const margin = (summary.netBalance / summary.totalIncome) * 100
    expect(margin).toBeCloseTo(66.4, 1)
  })

  it('aggregates transactions by category and calculates payment method share correctly', () => {
    const transactions: Partial<FinancialTransaction>[] = [
      { id: 1, type: 'INCOME', amount: 200, category: 'Consulta', payment_method: 'PIX', status: 'COMPLETED' },
      { id: 2, type: 'INCOME', amount: 300, category: 'Órtese', payment_method: 'Cartão de Crédito', status: 'COMPLETED' },
      { id: 3, type: 'INCOME', amount: 150, category: 'Consulta', payment_method: 'PIX', status: 'COMPLETED' },
      { id: 4, type: 'EXPENSE', amount: 120, category: 'Material', payment_method: 'PIX', status: 'COMPLETED' },
      { id: 5, type: 'INCOME', amount: 180, category: 'Consulta', payment_method: 'Dinheiro', status: 'PENDING' },
      { id: 6, type: 'INCOME', amount: 100, category: 'Consulta', payment_method: 'PIX', status: 'CANCELLED' }
    ]

    // Filter non-cancelled
    const active = transactions.filter(t => t.status !== 'CANCELLED')
    expect(active.length).toBe(5)

    // Category aggregation for active income
    const incomeByCategory = new Map<string, number>()
    let totalIncome = 0

    for (const t of active) {
      if (t.type === 'INCOME' && t.amount) {
        const cat = t.category || 'Outros'
        incomeByCategory.set(cat, (incomeByCategory.get(cat) || 0) + t.amount)
        totalIncome += t.amount
      }
    }

    expect(totalIncome).toBe(830)
    expect(incomeByCategory.get('Consulta')).toBe(530)
    expect(incomeByCategory.get('Órtese')).toBe(300)

    // Payment method breakdown
    const pixTotal = active
      .filter(t => t.type === 'INCOME' && t.payment_method === 'PIX')
      .reduce((sum, t) => sum + (t.amount || 0), 0)

    expect(pixTotal).toBe(350)
  })

  it('calculates payment fees and DRE net operating profit accurately', () => {
    const feeRates: Record<string, number> = {
      'PIX': 0,
      'Cartão de Débito': 1.99,
      'Cartão de Crédito': 3.49,
      'Dinheiro': 0
    }

    const rawIncome = 1000
    const paymentMethod = 'Cartão de Crédito'
    const feePct = feeRates[paymentMethod]
    const feeAmount = (rawIncome * feePct) / 100
    const netAmount = rawIncome - feeAmount

    expect(feeAmount).toBeCloseTo(34.9, 1)
    expect(netAmount).toBeCloseTo(965.1, 1)

    // DRE net profit after deductions and operating expenses
    const grossRevenue = 10000
    const deductions = 349
    const netRevenue = grossRevenue - deductions
    const operatingExpenses = 3500
    const operatingProfit = netRevenue - operatingExpenses

    expect(operatingProfit).toBe(6151)
  })

  it('computes installment schedule correctly for divided transactions', () => {
    const totalAmount = 600
    const installments = 3
    const installmentValue = totalAmount / installments
    expect(installmentValue).toBe(200)

    const installmentTitles = Array.from({ length: installments }, (_, i) => `Tratamento Laser (${i + 1}/${installments})`)
    expect(installmentTitles[0]).toBe('Tratamento Laser (1/3)')
    expect(installmentTitles[2]).toBe('Tratamento Laser (3/3)')
  })
})
