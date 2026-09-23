import React, { useState, useMemo } from 'react'
import { X, FileText, Download, Printer, MessageCircle, CheckCircle2 } from 'lucide-react'
import type { FinancialTransaction, FinancialSummary } from '../../../shared/types'

interface FinancialReportsModalProps {
  transactions: FinancialTransaction[]
  summary: FinancialSummary
  dateRangeLabel: string
  onClose: () => void
}

export default function FinancialReportsModal({
  transactions,
  summary,
  dateRangeLabel,
  onClose
}: FinancialReportsModalProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'dre' | 'categories' | 'receivables'>('dre')
  const [isExporting, setIsExporting] = useState(false)
  const [whatsappSentId, setWhatsappSentId] = useState<number | null>(null)

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  // 1. DRE Calculation
  const dreData = useMemo(() => {
    let grossRevenue = 0
    let totalFees = 0
    let expensesByCategory = new Map<string, number>()
    let totalExpense = 0

    for (const t of transactions) {
      if (t.status === 'CANCELLED') continue
      if (t.type === 'INCOME') {
        grossRevenue += t.amount
        totalFees += (t.fee_amount || 0)
      } else {
        const cat = t.category?.trim() || 'Outras Despesas'
        expensesByCategory.set(cat, (expensesByCategory.get(cat) || 0) + t.amount)
        totalExpense += t.amount
      }
    }

    const netRevenue = grossRevenue - totalFees
    const operatingResult = netRevenue - totalExpense
    const profitMargin = grossRevenue > 0 ? (operatingResult / grossRevenue) * 100 : 0

    return {
      grossRevenue,
      totalFees,
      netRevenue,
      expensesByCategory: Array.from(expensesByCategory.entries()).sort((a, b) => b[1] - a[1]),
      totalExpense,
      operatingResult,
      profitMargin
    }
  }, [transactions])

  // 2. Receivables & Overdue
  const pendingTransactions = useMemo(() => {
    return transactions.filter(t => t.type === 'INCOME' && t.status === 'PENDING')
  }, [transactions])

  // 3. Category & Procedure performance
  const categoryPerformance = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>()
    let totalIncome = 0

    for (const t of transactions) {
      if (t.type === 'INCOME' && t.status !== 'CANCELLED') {
        const cat = t.category?.trim() || 'Geral'
        const curr = map.get(cat) || { count: 0, total: 0 }
        map.set(cat, { count: curr.count + 1, total: curr.total + t.amount })
        totalIncome += t.amount
      }
    }

    return Array.from(map.entries()).map(([cat, val]) => ({
      name: cat,
      count: val.count,
      total: val.total,
      average: val.count > 0 ? val.total / val.count : 0,
      percent: totalIncome > 0 ? (val.total / totalIncome) * 100 : 0
    })).sort((a, b) => b.total - a.total)
  }, [transactions])

  // Export HTML to PDF Report via window.api.exportHtmlToPdf
  const handleExportPdf = async () => {
    setIsExporting(true)
    try {
      let clinicName = 'PodOnly Podologia Clínica'
      let professional = 'Podólogo(a) Responsável'
      let clinicPhone = ''
      try {
        const [cName, prof, phone] = await Promise.all([
          window.api.getSetting('profile_clinic_name'),
          window.api.getSetting('profile_professional_name'),
          window.api.getSetting('profile_clinic_phone')
        ])
        if (cName) clinicName = cName
        if (prof) professional = prof
        if (phone) clinicPhone = phone
      } catch {
        // Fallback
      }

      const generatedHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Relatório Financeiro - ${dateRangeLabel}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; padding: 20px; font-size: 11pt; line-height: 1.5; }
            .header { border-bottom: 2px solid #05819d; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
            .clinic-title { font-size: 18pt; font-weight: 800; color: #05819d; margin: 0; }
            .report-title { font-size: 14pt; font-weight: 700; color: #334155; margin-top: 5px; }
            .kpi-row { display: flex; gap: 15px; margin-bottom: 25px; }
            .kpi-box { flex: 1; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; background: #f8fafc; }
            .kpi-lbl { font-size: 8pt; color: #64748b; text-transform: uppercase; font-weight: 700; }
            .kpi-val { font-size: 14pt; font-weight: 800; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { text-align: left; padding: 8px 10px; background: #f1f5f9; border-bottom: 2px solid #cbd5e1; font-size: 9pt; }
            td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 9.5pt; }
            .text-right { text-align: right; }
            .positive { color: #16a34a; }
            .negative { color: #dc2626; }
            .footer { margin-top: 40px; text-align: center; font-size: 8pt; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="clinic-title">${clinicName}</div>
              <div style="font-size: 9pt; color: #64748b;">${professional} ${clinicPhone ? '· ' + clinicPhone : ''}</div>
            </div>
            <div style="text-align: right;">
              <div class="report-title">Demonstrativo Financeiro</div>
              <div style="font-size: 9pt; color: #64748b;">Período: ${dateRangeLabel}</div>
            </div>
          </div>

          <div class="kpi-row">
            <div class="kpi-box">
              <div class="kpi-lbl">Receita Bruta</div>
              <div class="kpi-val positive">${formatCurrency(dreData.grossRevenue)}</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-lbl">Taxas de Operadoras</div>
              <div class="kpi-val negative">-${formatCurrency(dreData.totalFees)}</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-lbl">Despesas Operacionais</div>
              <div class="kpi-val negative">-${formatCurrency(dreData.totalExpense)}</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-lbl">Resultado Líquido</div>
              <div class="kpi-val ${dreData.operatingResult >= 0 ? 'positive' : 'negative'}">
                ${formatCurrency(dreData.operatingResult)} (${dreData.profitMargin.toFixed(1)}%)
              </div>
            </div>
          </div>

          <h3 style="margin-top: 20px; font-size: 11pt; color: #0f172a;">Demonstrativo do Resultado do Exercício (DRE)</h3>
          <table>
            <thead>
              <tr>
                <th>Descrição</th>
                <th class="text-right">Valor</th>
                <th class="text-right">% Receita</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>(+) Receita Bruta Total</strong></td>
                <td class="text-right font-bold positive">${formatCurrency(dreData.grossRevenue)}</td>
                <td class="text-right">100.0%</td>
              </tr>
              <tr>
                <td>(-) Taxas de Meios de Pagamento (Cartão/Intermediação)</td>
                <td class="text-right negative">-${formatCurrency(dreData.totalFees)}</td>
                <td class="text-right">${dreData.grossRevenue > 0 ? ((dreData.totalFees / dreData.grossRevenue) * 100).toFixed(1) : 0}%</td>
              </tr>
              <tr style="background: #f8fafc;">
                <td><strong>(=) Receita Operacional Líquida</strong></td>
                <td class="text-right font-bold">${formatCurrency(dreData.netRevenue)}</td>
                <td class="text-right">${dreData.grossRevenue > 0 ? ((dreData.netRevenue / dreData.grossRevenue) * 100).toFixed(1) : 0}%</td>
              </tr>
              ${dreData.expensesByCategory.map(([cat, val]) => `
                <tr>
                  <td>(-) Despesa: ${cat}</td>
                  <td class="text-right negative">-${formatCurrency(val)}</td>
                  <td class="text-right">${dreData.grossRevenue > 0 ? ((val / dreData.grossRevenue) * 100).toFixed(1) : 0}%</td>
                </tr>
              `).join('')}
              <tr style="background: #f1f5f9; font-weight: bold; border-top: 2px solid #cbd5e1;">
                <td>(=) Resultado Líquido da Clínica</td>
                <td class="text-right ${dreData.operatingResult >= 0 ? 'positive' : 'negative'}">
                  ${formatCurrency(dreData.operatingResult)}
                </td>
                <td class="text-right">${dreData.profitMargin.toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            Gerado automaticamente pelo software PodOnly em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
          </div>
        </body>
        </html>
      `

      const res = await window.api.exportHtmlToPdf(generatedHtml, `relatorio_financeiro_${dateRangeLabel.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`)
      if (res && res.success) {
        alert('Relatório PDF exportado com sucesso!')
      }
    } catch (err: any) {
      console.error('Erro ao exportar relatório PDF:', err)
      alert('Falha ao exportar PDF.')
    } finally {
      setIsExporting(false)
    }
  }

  // Export to CSV spreadsheet
  const handleExportCsv = () => {
    const headers = ['Data', 'Tipo', 'Descricao', 'Categoria', 'Metodo_Pagamento', 'Status', 'Valor_Bruto', 'Taxa', 'Valor_Liquido', 'Paciente']
    const rows = transactions.map(t => [
      t.date,
      t.type,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${(t.category || '').replace(/"/g, '""')}"`,
      `"${t.payment_method}"`,
      t.status || 'COMPLETED',
      t.amount.toFixed(2),
      (t.fee_amount || 0).toFixed(2),
      (t.net_amount || t.amount).toFixed(2),
      `"${(t.patient_name || '').replace(/"/g, '""')}"`
    ])

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `lancamentos_financeiros_${dateRangeLabel.replace(/[^a-zA-Z0-9]/g, '_')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleSendReminderWhatsapp = (t: FinancialTransaction) => {
    const patientName = t.patient_name || 'Paciente'
    const message = encodeURIComponent(`Olá ${patientName}! Tudo bem? Passando para lembrar sobre a pendência referente a "${t.description}" no valor de ${formatCurrency(t.amount)}. Por gentileza, nos informe quando puder realizar o pagamento. Muito obrigado!`)
    window.open(`https://wa.me/?text=${message}`, '_blank')
    setWhatsappSentId(t.id)
    setTimeout(() => setWhatsappSentId(null), 3000)
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="modal-content glass-card" style={{ maxWidth: '840px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(5, 129, 157, 0.1)', color: 'var(--brand-dark)' }}>
              <FileText size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Relatórios Gerenciais &amp; DRE
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Período selecionado: {dateRangeLabel} ({transactions.length} transações)
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleExportCsv} 
              title="Exportar dados para Excel / CSV"
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Download size={15} /> CSV
            </button>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleExportPdf}
              disabled={isExporting}
              title="Exportar Relatório Clínico em PDF"
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Printer size={15} /> {isExporting ? 'Exportando...' : 'Exportar PDF'}
            </button>
            <button className="icon-btn" onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem' }}>
          <button
            type="button"
            className={`btn ${activeTab === 'dre' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('dre')}
            style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}
          >
            📊 DRE Clínico
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'categories' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('categories')}
            style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}
          >
            🩺 Procedimentos &amp; Categorias
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'receivables' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('receivables')}
            style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}
          >
            ⏳ Contas a Receber ({pendingTransactions.length})
          </button>
        </div>

        {/* Tab 1: DRE Clínico */}
        {activeTab === 'dre' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              <div style={{ background: 'rgba(55, 214, 154, 0.08)', padding: '0.85rem', borderRadius: '10px', border: '1px solid rgba(55, 214, 154, 0.2)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Receita Bruta</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#16a34a', marginTop: '3px' }}>{formatCurrency(dreData.grossRevenue)}</div>
              </div>
              <div style={{ background: 'rgba(239, 68, 68, 0.06)', padding: '0.85rem', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Taxas de Meios</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#dc2626', marginTop: '3px' }}>-{formatCurrency(dreData.totalFees)}</div>
              </div>
              <div style={{ background: 'rgba(239, 68, 68, 0.06)', padding: '0.85rem', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Despesas Operacionais</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#dc2626', marginTop: '3px' }}>-{formatCurrency(dreData.totalExpense)}</div>
              </div>
              <div style={{ background: 'rgba(5, 129, 157, 0.08)', padding: '0.85rem', borderRadius: '10px', border: '1px solid rgba(5, 129, 157, 0.2)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Resultado Líquido</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: dreData.operatingResult >= 0 ? 'var(--brand-dark)' : '#dc2626', marginTop: '3px' }}>
                  {formatCurrency(dreData.operatingResult)}
                </div>
              </div>
            </div>

            {/* DRE Structure Table */}
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid var(--surface-border)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(5, 129, 157, 0.05)', textAlign: 'left' }}>
                    <th style={{ padding: '0.65rem 1rem', color: 'var(--text-primary)' }}>Linha do DRE</th>
                    <th style={{ padding: '0.65rem 1rem', textAlign: 'right', color: 'var(--text-primary)' }}>Valor</th>
                    <th style={{ padding: '0.65rem 1rem', textAlign: 'right', color: 'var(--text-primary)' }}>% Faturamento</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                    <td style={{ padding: '0.65rem 1rem', fontWeight: 700, color: '#16a34a' }}>(+) Faturamento Bruto</td>
                    <td style={{ padding: '0.65rem 1rem', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>{formatCurrency(dreData.grossRevenue)}</td>
                    <td style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>100.0%</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                    <td style={{ padding: '0.65rem 1rem', color: '#dc2626' }}>(-) Deduções / Taxas de Meios de Pagamento</td>
                    <td style={{ padding: '0.65rem 1rem', textAlign: 'right', color: '#dc2626' }}>-{formatCurrency(dreData.totalFees)}</td>
                    <td style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>{dreData.grossRevenue > 0 ? ((dreData.totalFees / dreData.grossRevenue) * 100).toFixed(1) : 0}%</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--surface-border)', background: 'rgba(5, 129, 157, 0.03)' }}>
                    <td style={{ padding: '0.65rem 1rem', fontWeight: 700 }}>(=) Receita Operacional Líquida</td>
                    <td style={{ padding: '0.65rem 1rem', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(dreData.netRevenue)}</td>
                    <td style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>{dreData.grossRevenue > 0 ? ((dreData.netRevenue / dreData.grossRevenue) * 100).toFixed(1) : 0}%</td>
                  </tr>
                  {dreData.expensesByCategory.map(([cat, val]) => (
                    <tr key={cat} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                      <td style={{ padding: '0.55rem 1rem', color: '#64748b' }}>(-) Despesas: {cat}</td>
                      <td style={{ padding: '0.55rem 1rem', textAlign: 'right', color: '#dc2626' }}>-{formatCurrency(val)}</td>
                      <td style={{ padding: '0.55rem 1rem', textAlign: 'right', color: '#64748b' }}>{dreData.grossRevenue > 0 ? ((val / dreData.grossRevenue) * 100).toFixed(1) : 0}%</td>
                    </tr>
                  ))}
                  <tr style={{ background: 'rgba(55, 214, 154, 0.1)', fontWeight: 800 }}>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--brand-dark)' }}>(=) Lucro Líquido / Resultado Final</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: dreData.operatingResult >= 0 ? '#16a34a' : '#dc2626' }}>
                      {formatCurrency(dreData.operatingResult)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--brand-dark)' }}>{dreData.profitMargin.toFixed(1)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Categorias e Procedimentos */}
        {activeTab === 'categories' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Ranking de volume e faturamento por categoria e procedimento no período selecionado.
            </p>
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid var(--surface-border)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(5, 129, 157, 0.05)', textAlign: 'left' }}>
                    <th style={{ padding: '0.65rem 1rem' }}>Categoria / Procedimento</th>
                    <th style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>Atendimentos (Qtd)</th>
                    <th style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>Ticket Médio</th>
                    <th style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>Total Recebido</th>
                    <th style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>% Total</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryPerformance.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Nenhuma receita no período.</td>
                    </tr>
                  ) : (
                    categoryPerformance.map(item => (
                      <tr key={item.name} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                        <td style={{ padding: '0.65rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</td>
                        <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>{item.count}x</td>
                        <td style={{ padding: '0.65rem 1rem', textAlign: 'right', color: 'var(--text-secondary)' }}>{formatCurrency(item.average)}</td>
                        <td style={{ padding: '0.65rem 1rem', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>{formatCurrency(item.total)}</td>
                        <td style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>{item.percent.toFixed(1)}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Contas a Receber & Cobranças */}
        {activeTab === 'receivables' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Lançamentos marcados como <strong>Pendente / A Receber</strong> no período.
              </p>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand-dark)' }}>
                Total Pendente: {formatCurrency(summary.pendingIncome || 0)}
              </span>
            </div>

            {pendingTransactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', background: '#ffffff', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
                <CheckCircle2 size={36} color="#16a34a" style={{ marginBottom: '0.5rem' }} />
                <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Sem pendências financeiras!</h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Todas as receitas registradas neste período foram liquidadas.
                </p>
              </div>
            ) : (
              <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid var(--surface-border)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(5, 129, 157, 0.05)', textAlign: 'left' }}>
                      <th style={{ padding: '0.65rem 1rem' }}>Vencimento</th>
                      <th style={{ padding: '0.65rem 1rem' }}>Descrição</th>
                      <th style={{ padding: '0.65rem 1rem' }}>Paciente</th>
                      <th style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>Valor</th>
                      <th style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>Cobrança WhatsApp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingTransactions.map(t => (
                      <tr key={t.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                        <td style={{ padding: '0.65rem 1rem' }}>
                          {t.due_date ? new Date(t.due_date).toLocaleDateString('pt-BR') : new Date(t.date).toLocaleDateString('pt-BR')}
                        </td>
                        <td style={{ padding: '0.65rem 1rem', fontWeight: 600 }}>{t.description}</td>
                        <td style={{ padding: '0.65rem 1rem', color: 'var(--text-secondary)' }}>{t.patient_name || '-'}</td>
                        <td style={{ padding: '0.65rem 1rem', textAlign: 'right', fontWeight: 700, color: '#f59e0b' }}>{formatCurrency(t.amount)}</td>
                        <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => handleSendReminderWhatsapp(t)}
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.78rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              color: '#16a34a',
                              borderColor: 'rgba(22, 163, 74, 0.3)'
                            }}
                            title="Abrir WhatsApp para enviar lembrete de pagamento"
                          >
                            <MessageCircle size={14} />
                            <span>{whatsappSentId === t.id ? 'Aberta!' : 'Cobrar'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
