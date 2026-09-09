import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Palette,
  Layers,
  Grid,
  Pen,
  Save,
  RotateCcw,
  Download,
  Upload,
  Plus,
  Trash2,
  AlertTriangle,
  Star,
  Circle,
  Square,
  Triangle,
  Diamond,
  MapPin,
  Check,
  Sliders
} from 'lucide-react'
import feetMapDefaultImg from '../assets/feet-map.png'
import {
  ClinicalSymbolDef,
  ClinicalSymbolShape,
  FeetCanvasTemplateConfig,
  DEFAULT_CLINICAL_SYMBOLS,
  DEFAULT_FEET_CANVAS_CONFIG
} from '../types/feetCanvas'
import './FeetCanvasBuilderModal.css'

interface FeetCanvasBuilderModalProps {
  isOpen: boolean
  onClose: () => void
  onTemplateSaved?: () => void
}

export const FeetCanvasBuilderModal: React.FC<FeetCanvasBuilderModalProps> = ({
  isOpen,
  onClose,
  onTemplateSaved
}) => {
  const [config, setConfig] = useState<FeetCanvasTemplateConfig>(DEFAULT_FEET_CANVAS_CONFIG)
  const [symbols, setSymbols] = useState<ClinicalSymbolDef[]>(DEFAULT_CLINICAL_SYMBOLS)
  const [activeTab, setActiveTab] = useState<'appearance' | 'outline' | 'grid' | 'drawing'>('appearance')
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Drawing overlay state
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawTool, setDrawTool] = useState<'pen' | 'erase'>('pen')
  const [penColor, setPenColor] = useState('#0e91a8')
  const [penWidth, setPenWidth] = useState(3)

  // Load existing template from database on open
  useEffect(() => {
    if (isOpen) {
      Promise.all([
        window.api.getSetting('custom_feet_map_template'),
        window.api.getSetting('custom_feet_symbols_legend')
      ]).then(([tplStr, symStr]) => {
        if (tplStr) {
          try {
            const parsed = JSON.parse(tplStr)
            setConfig(parsed)
          } catch (e) {
            console.error('Falha ao carregar template do mapa:', e)
          }
        }
        if (symStr) {
          try {
            const parsed = JSON.parse(symStr)
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSymbols(parsed)
            }
          } catch (e) {
            console.error('Falha ao carregar símbolos:', e)
          }
        }
      }).catch(console.error)
    }
  }, [isOpen])

  if (!isOpen) return null

  // Helper to render icon shape
  const renderSymbolIcon = (shape: ClinicalSymbolShape, color: string, size = 16) => {
    switch (shape) {
      case 'star':
        return <Star size={size} color={color} fill={color} />
      case 'circle':
        return <Circle size={size} color={color} fill={color} />
      case 'square':
        return <Square size={size} color={color} fill={color} />
      case 'triangle':
        return <Triangle size={size} color={color} fill={color} />
      case 'diamond':
        return <Diamond size={size} color={color} fill={color} />
      case 'plus':
      case 'cross':
        return <Plus size={size} color={color} strokeWidth={3} />
      case 'pin':
      default:
        return <MapPin size={size} color={color} fill={color} />
    }
  }

  // Symbol management
  const handleAddSymbol = () => {
    const newSym: ClinicalSymbolDef = {
      id: `sym_${Date.now()}`,
      shape: 'circle',
      label: '',
      defaultColor: '#0e91a8'
    }
    setSymbols([...symbols, newSym])
  }

  const handleUpdateSymbol = (id: string, partial: Partial<ClinicalSymbolDef>) => {
    setSymbols(symbols.map(s => s.id === id ? { ...s, ...partial } : s))
  }

  const handleDeleteSymbol = (id: string) => {
    if (symbols.length <= 1) {
      alert('É necessário manter pelo menos um símbolo na legenda.')
      return
    }
    setSymbols(symbols.filter(s => s.id !== id))
  }

  // File Import & Export
  const handleExportTemplate = () => {
    const exportData = {
      config,
      symbols,
      exportedAt: new Date().toISOString()
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `podonly_mapa_pes_template_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string)
        if (parsed.config) setConfig(parsed.config)
        if (Array.isArray(parsed.symbols)) setSymbols(parsed.symbols)
        alert('Modelo importado com sucesso no editor! Clique em "Salvar & Aplicar" para torná-lo ativo.')
      } catch (err) {
        alert('Arquivo de modelo inválido.')
      }
    }
    reader.readAsText(file)
  }

  const handleResetDefaults = () => {
    if (window.confirm('Tem certeza que deseja restaurar as configurações originais padrão do mapa anatômico dos pés?')) {
      setConfig(DEFAULT_FEET_CANVAS_CONFIG)
      setSymbols(DEFAULT_CLINICAL_SYMBOLS)
      // Limpa canvas de desenho
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx?.clearRect(0, 0, canvas.width, canvas.height)
      }
    }
  }

  // Upload Custom Outline Image
  const handleUploadOutline = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setConfig({
        ...config,
        outlineType: 'custom',
        customOutlineBase64: base64
      })
    }
    reader.readAsDataURL(file)
  }

  // Drawing tools on the builder canvas
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    setIsDrawing(true)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    ctx.lineWidth = drawTool === 'erase' ? 24 : penWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (drawTool === 'erase') {
      ctx.globalCompositeOperation = 'destination-out'
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = penColor
    }

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const finishDrawing = () => {
    setIsDrawing(false)
  }

  // Final Render & Save
  const handleSaveConfirmed = async () => {
    setShowWarningModal(false)
    setIsSaving(true)

    try {
      // 1. Render complete composite canvas to PNG
      const offscreenCanvas = document.createElement('canvas')
      offscreenCanvas.width = 960
      offscreenCanvas.height = 760
      const ctx = offscreenCanvas.getContext('2d')

      if (ctx) {
        // Fundo
        ctx.fillStyle = config.backgroundColor
        ctx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height)

        // Grade de alinhamento se ativa
        if (config.showGrid) {
          ctx.save()
          ctx.strokeStyle = `rgba(100, 116, 139, ${config.gridOpacity})`
          ctx.lineWidth = 1
          const spacing = config.gridSpacing * 2
          for (let x = 0; x < offscreenCanvas.width; x += spacing) {
            ctx.beginPath()
            ctx.moveTo(x, 0)
            ctx.lineTo(x, offscreenCanvas.height)
            ctx.stroke()
          }
          for (let y = 0; y < offscreenCanvas.height; y += spacing) {
            ctx.beginPath()
            ctx.moveTo(0, y)
            ctx.lineTo(offscreenCanvas.width, y)
            ctx.stroke()
          }
          ctx.restore()
        }

        // Desenha imagem base dos pés
        const baseImg = new Image()
        baseImg.crossOrigin = 'anonymous'
        const baseSrc = config.outlineType === 'custom' && config.customOutlineBase64
          ? config.customOutlineBase64
          : feetMapDefaultImg

        await new Promise<void>((resolve) => {
          baseImg.onload = () => {
            // Se invertido, aplica filtro
            if (config.outlineType === 'inverted') {
              ctx.save()
              ctx.filter = 'invert(1) hue-rotate(180deg)'
              ctx.drawImage(baseImg, 0, 0, offscreenCanvas.width, offscreenCanvas.height)
              ctx.restore()
            } else {
              ctx.drawImage(baseImg, 0, 0, offscreenCanvas.width, offscreenCanvas.height)
            }
            resolve()
          }
          baseImg.onerror = () => resolve()
          baseImg.src = baseSrc
        })

        // Desenha traços manuais do editor se houver
        if (canvasRef.current) {
          ctx.drawImage(canvasRef.current, 0, 0, offscreenCanvas.width, offscreenCanvas.height)
        }

        const base64Png = offscreenCanvas.toDataURL('image/png')

        // 2. Salva arquivo PNG de mapa base no disco e nas configurações
        await window.api.saveCustomFeetMapBase64(base64Png)
      }

      // 3. Persiste configuração do template e legendas no SQLite
      await window.api.setSetting('custom_feet_map_template', JSON.stringify(config))
      await window.api.setSetting('custom_feet_symbols_legend', JSON.stringify(symbols))

      // 4. Emite evento global para que o FootMapCanvas e o DashboardScreen atualizem na hora
      window.dispatchEvent(new Event('podonly-feet-template-updated'))

      setSaveSuccess(true)
      setTimeout(() => {
        setSaveSuccess(false)
        if (onTemplateSaved) onTemplateSaved()
        onClose()
      }, 1200)
    } catch (err) {
      console.error('Erro ao salvar template personalizado dos pés:', err)
      alert('Ocorreu um erro ao salvar o modelo personalizado.')
    } finally {
      setIsSaving(false)
    }
  }

  return createPortal(
    <div className="feet-builder-modal-overlay" onClick={onClose}>
      <div className="feet-builder-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="feet-builder-header">
          <div className="feet-builder-title-wrap">
            <div className="feet-builder-title-icon">
              <Sliders size={20} />
            </div>
            <div>
              <h3 className="feet-builder-title">Construtor de Mapa Anatômico & Símbolos</h3>
              <p className="feet-builder-subtitle">Personalize a anatomia, cores de fundo, grade e a legenda dos pés para toda a clínica</p>
            </div>
          </div>

          <div className="feet-builder-header-actions">
            <label className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.45rem 0.8rem', cursor: 'pointer' }} title="Importar arquivo JSON de modelo">
              <Upload size={14} style={{ marginRight: '0.3rem' }} /> Importar
              <input type="file" accept=".json" onChange={handleImportTemplate} style={{ display: 'none' }} />
            </label>

            <button type="button" className="btn btn-secondary" onClick={handleExportTemplate} style={{ fontSize: '0.8rem', padding: '0.45rem 0.8rem' }} title="Exportar modelo em arquivo JSON">
              <Download size={14} style={{ marginRight: '0.3rem' }} /> Exportar
            </button>

            <button type="button" className="btn btn-secondary" onClick={handleResetDefaults} style={{ fontSize: '0.8rem', padding: '0.45rem 0.8rem' }} title="Restaurar padrão original">
              <RotateCcw size={14} style={{ marginRight: '0.3rem' }} /> Padrão
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowWarningModal(true)}
              style={{ fontSize: '0.82rem', padding: '0.5rem 1.1rem', background: 'var(--accent-color)' }}
              disabled={isSaving}
            >
              {saveSuccess ? (
                <><Check size={15} style={{ marginRight: '0.3rem' }} /> Salvo!</>
              ) : (
                <><Save size={15} style={{ marginRight: '0.3rem' }} /> Salvar & Aplicar</>
              )}
            </button>

            <button type="button" className="modal-close-btn" onClick={onClose} style={{ marginLeft: '0.5rem' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Main Body */}
        <div className="feet-builder-body">
          {/* Left Sidebar: Controls */}
          <div className="feet-builder-sidebar-left">
            <div className="feet-builder-tabs-nav">
              <button
                type="button"
                className={`feet-builder-tab-btn ${activeTab === 'appearance' ? 'active' : ''}`}
                onClick={() => setActiveTab('appearance')}
              >
                <Palette size={14} /> Cores & Fundo
              </button>
              <button
                type="button"
                className={`feet-builder-tab-btn ${activeTab === 'outline' ? 'active' : ''}`}
                onClick={() => setActiveTab('outline')}
              >
                <Layers size={14} /> Anatomia
              </button>
              <button
                type="button"
                className={`feet-builder-tab-btn ${activeTab === 'grid' ? 'active' : ''}`}
                onClick={() => setActiveTab('grid')}
              >
                <Grid size={14} /> Grade
              </button>
              <button
                type="button"
                className={`feet-builder-tab-btn ${activeTab === 'drawing' ? 'active' : ''}`}
                onClick={() => setActiveTab('drawing')}
              >
                <Pen size={14} /> Desenho
              </button>
            </div>

            <div className="feet-builder-tab-content">
              {/* Tab 1: Fundo & Cores */}
              {activeTab === 'appearance' && (
                <>
                  <div>
                    <div className="feet-builder-group-title">Cor de Fundo do Diagrama</div>
                    <div className="color-presets-row">
                      {[
                        { label: 'Branco Puro', color: '#ffffff' },
                        { label: 'Azul Clínico', color: '#f0fdfa' },
                        { label: 'Cinza Suave', color: '#f8fafc' },
                        { label: 'Creme Neutro', color: '#fefce8' },
                        { label: 'Escuro / Noturno', color: '#0f172a' }
                      ].map(p => (
                        <div
                          key={p.color}
                          className={`color-preset-circle ${config.backgroundColor === p.color ? 'active' : ''}`}
                          style={{ backgroundColor: p.color }}
                          title={p.label}
                          onClick={() => setConfig({ ...config, backgroundColor: p.color })}
                        />
                      ))}
                      <input
                        type="color"
                        value={config.backgroundColor}
                        onChange={e => setConfig({ ...config, backgroundColor: e.target.value })}
                        className="color-preset-circle"
                        title="Cor Personalizada (Hex)"
                        style={{ padding: 0 }}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Tab 2: Anatomia & Contorno */}
              {activeTab === 'outline' && (
                <>
                  <div>
                    <div className="feet-builder-group-title">Modelo Base da Anatomia</div>
                    
                    <div
                      className={`outline-selector-card ${config.outlineType === 'default' ? 'active' : ''}`}
                      onClick={() => setConfig({ ...config, outlineType: 'default' })}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>Padrão Clínico PodOnly</div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Visão plantar anatômica padrão</div>
                      </div>
                      {config.outlineType === 'default' && <Check size={16} color="var(--accent-color)" />}
                    </div>

                    <div
                      className={`outline-selector-card ${config.outlineType === 'inverted' ? 'active' : ''}`}
                      onClick={() => setConfig({ ...config, outlineType: 'inverted' })}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>Contraste Alto Invertido</div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Linhas em alto relevo visual</div>
                      </div>
                      {config.outlineType === 'inverted' && <Check size={16} color="var(--accent-color)" />}
                    </div>

                    <div
                      className={`outline-selector-card ${config.outlineType === 'custom' ? 'active' : ''}`}
                      onClick={() => {
                        const input = document.getElementById('custom-outline-upload')
                        if (input) input.click()
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>Enviar Imagem Personalizada</div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          {config.customOutlineBase64 ? 'Imagem personalizada carregada' : 'Upload de PNG/JPG de contorno'}
                        </div>
                      </div>
                      <Upload size={16} color="var(--accent-color)" />
                    </div>
                    <input
                      id="custom-outline-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleUploadOutline}
                      style={{ display: 'none' }}
                    />
                  </div>
                </>
              )}

              {/* Tab 3: Grade de Alinhamento */}
              {activeTab === 'grid' && (
                <>
                  <div>
                    <div className="feet-builder-group-title">Grade de Alinhamento Clínico</div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', cursor: 'pointer', marginBottom: '1rem' }}>
                      <input
                        type="checkbox"
                        checked={config.showGrid}
                        onChange={e => setConfig({ ...config, showGrid: e.target.checked })}
                      />
                      <span>Exibir grade milimétrica / quadrantes</span>
                    </label>

                    {config.showGrid && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                          <label style={{ fontSize: '0.78rem', color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                            Espaçamento da Grade: {config.gridSpacing}px
                          </label>
                          <input
                            type="range"
                            min="15"
                            max="50"
                            step="5"
                            value={config.gridSpacing}
                            onChange={e => setConfig({ ...config, gridSpacing: Number(e.target.value) })}
                            style={{ width: '100%' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.78rem', color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                            Opacidade da Grade: {Math.round(config.gridOpacity * 100)}%
                          </label>
                          <input
                            type="range"
                            min="0.05"
                            max="0.5"
                            step="0.05"
                            value={config.gridOpacity}
                            onChange={e => setConfig({ ...config, gridOpacity: Number(e.target.value) })}
                            style={{ width: '100%' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Tab 4: Desenho Permanente no Modelo */}
              {activeTab === 'drawing' && (
                <>
                  <div>
                    <div className="feet-builder-group-title">Traços Permanentes no Fundo</div>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                      Desenhe marcações fixas (como divisão dos pés em zonas anatômicas ou numeração de dedos) que estarão sempre presentes em todas as consultas.
                    </p>

                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                      <button
                        type="button"
                        className={`btn ${drawTool === 'pen' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setDrawTool('pen')}
                        style={{ flex: 1, fontSize: '0.78rem', padding: '0.4rem' }}
                      >
                        <Pen size={14} style={{ marginRight: '0.3rem' }} /> Caneta
                      </button>
                      <button
                        type="button"
                        className={`btn ${drawTool === 'erase' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setDrawTool('erase')}
                        style={{ flex: 1, fontSize: '0.78rem', padding: '0.4rem' }}
                      >
                        Borracha
                      </button>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ fontSize: '0.78rem', color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                        Cor do Traço Fixo:
                      </label>
                      <input
                        type="color"
                        value={penColor}
                        onChange={e => setPenColor(e.target.value)}
                        style={{ width: '100%', height: '32px', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                        Espessura: {penWidth}px
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={penWidth}
                        onChange={e => setPenWidth(Number(e.target.value))}
                        style={{ width: '100%' }}
                      />
                    </div>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        const canvas = canvasRef.current
                        if (canvas) {
                          const ctx = canvas.getContext('2d')
                          ctx?.clearRect(0, 0, canvas.width, canvas.height)
                        }
                      }}
                      style={{ marginTop: '1.25rem', width: '100%', fontSize: '0.78rem', color: '#dc2626' }}
                    >
                      <Trash2 size={13} style={{ marginRight: '0.3rem' }} /> Limpar Traços Fixos
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Center Canvas Viewport */}
          <div className="feet-builder-canvas-area">
            <div className="feet-builder-canvas-wrapper" style={{ backgroundColor: config.backgroundColor }}>
              <div
                className="feet-builder-canvas-drawing-layer"
                style={{
                  backgroundImage: `url(${config.outlineType === 'custom' && config.customOutlineBase64 ? config.customOutlineBase64 : feetMapDefaultImg})`,
                  filter: config.outlineType === 'inverted' ? 'invert(1) hue-rotate(180deg)' : 'none'
                }}
              >
                {/* SVG Grid Overlay */}
                {config.showGrid && (
                  <svg className="feet-builder-grid-overlay" width="100%" height="100%">
                    <defs>
                      <pattern id="gridPattern" width={config.gridSpacing} height={config.gridSpacing} patternUnits="userSpaceOnUse">
                        <path
                          d={`M ${config.gridSpacing} 0 L 0 0 0 ${config.gridSpacing}`}
                          fill="none"
                          stroke="rgba(100, 116, 139, 1)"
                          strokeWidth="1"
                          strokeOpacity={config.gridOpacity}
                        />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#gridPattern)" />
                  </svg>
                )}

                {/* Interactive Drawing Layer for permanent markings */}
                <canvas
                  ref={canvasRef}
                  width={480}
                  height={380}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'crosshair' }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={finishDrawing}
                  onMouseLeave={finishDrawing}
                />
              </div>

              {/* Dynamic Footer Legend Preview */}
              <div className="feet-builder-legend-preview">
                <div className="feet-builder-legend-title">Prévia da Legenda Clínico-Podológica</div>
                <div className="feet-builder-legend-items">
                  {symbols.map(sym => (
                    <div key={sym.id} className="feet-builder-legend-item">
                      {renderSymbolIcon(sym.shape, sym.defaultColor, 14)}
                      <span>{sym.label.trim() || '(Sem subtítulo)'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Symbol & Legend Manager */}
          <div className="feet-builder-sidebar-right">
            <div className="feet-builder-sidebar-right-header">
              <div>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>Símbolos & Legendas</span>
                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Configure ícones, cores e legendas</div>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAddSymbol}
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <Plus size={13} /> Adicionar
              </button>
            </div>

            <div className="symbol-list">
              {symbols.map((sym) => (
                <div key={sym.id} className="symbol-card">
                  <div className="symbol-card-top">
                    <div className="symbol-icon-badge" style={{ background: `${sym.defaultColor}15` }}>
                      {renderSymbolIcon(sym.shape, sym.defaultColor, 18)}
                    </div>

                    <select
                      className="symbol-shape-select"
                      value={sym.shape}
                      onChange={e => handleUpdateSymbol(sym.id, { shape: e.target.value as ClinicalSymbolShape })}
                    >
                      <option value="circle">Círculo</option>
                      <option value="star">Estrela</option>
                      <option value="square">Quadrado</option>
                      <option value="triangle">Triângulo</option>
                      <option value="diamond">Losango</option>
                      <option value="plus">Cruz (+)</option>
                      <option value="pin">Marcador (Pin)</option>
                    </select>

                    <input
                      type="color"
                      value={sym.defaultColor}
                      onChange={e => handleUpdateSymbol(sym.id, { defaultColor: e.target.value })}
                      className="symbol-color-picker"
                      title="Escolher Cor do Símbolo"
                    />

                    <div style={{ flex: 1 }} />

                    <button
                      type="button"
                      onClick={() => handleDeleteSymbol(sym.id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                      title="Excluir Símbolo"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.74rem', color: '#475569', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                      Subtítulo / Descrição da Patologia:
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ fontSize: '0.84rem', padding: '0.45rem 0.65rem' }}
                      value={sym.label}
                      onChange={e => handleUpdateSymbol(sym.id, { label: e.target.value })}
                      placeholder="Digite o subtítulo que desejar (ex: Onicocriptose, Calo, Dor...)"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Prominent Historical Conflict Warning Modal */}
      {showWarningModal && (
        <div className="warning-modal-overlay" onClick={() => setShowWarningModal(false)}>
          <div className="warning-modal-card" onClick={e => e.stopPropagation()}>
            <div className="warning-modal-header">
              <div className="warning-modal-icon-wrap">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h4 className="warning-modal-title">Atenção ao Alterar o Mapa dos Pés</h4>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Verificação de compatibilidade histórica</div>
              </div>
            </div>

            <div className="warning-alert-box">
              <strong>⚠️ Alerta de Compatibilidade Visual:</strong>
              <p style={{ margin: '0.5rem 0 0 0' }}>
                Alterar o modelo base do mapa anatômico pode causar <strong>desalinhamento visual</strong> em consultas e prontuários gravados anteriormente com o modelo antigo caso novas marcações sejam adicionadas a eles.
              </p>
              <p style={{ margin: '0.5rem 0 0 0' }}>
                Os prontuários já salvos no histórico mantêm suas anotações e fundo original intactos.
              </p>
            </div>

            <div className="warning-modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowWarningModal(false)}
                style={{ fontSize: '0.85rem' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveConfirmed}
                style={{ fontSize: '0.85rem', background: '#dc2626', borderColor: '#dc2626' }}
              >
                Sim, Confirmar e Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  )
}

export default FeetCanvasBuilderModal
