import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Move,
  ArrowLeftRight,
  Columns,
  Sparkles
} from 'lucide-react'
import { PatientImage } from '../../../shared/types'

interface BeforeAfterComparatorProps {
  images: (PatientImage & { base64: string | null })[]
  initialBeforeId?: number | null
  initialAfterId?: number | null
  patientName?: string
  onClose: () => void
}

type ViewMode = 'split' | 'side-by-side'
type AdjustTarget = 'both' | 'before' | 'after'

export default function BeforeAfterComparator({
  images,
  initialBeforeId,
  initialAfterId,
  patientName,
  onClose
}: BeforeAfterComparatorProps) {
  // Image selection
  const [beforeId, setBeforeId] = useState<number>(initialBeforeId || images[0]?.id || 0)
  const [afterId, setAfterId] = useState<number>(
    initialAfterId || (images.length > 1 ? images[images.length - 1].id : images[0]?.id || 0)
  )

  // View & adjustment modes
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side')
  const [adjustTarget, setAdjustTarget] = useState<AdjustTarget>('both')

  // Split slider position (0 - 100%)
  const [sliderPos, setSliderPos] = useState<number>(50)

  // Transformation states: Zoom (1.0 to 5.0) & Pan (X, Y in pixels)
  const [beforeZoom, setBeforeZoom] = useState<number>(1)
  const [beforePan, setBeforePan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  const [afterZoom, setAfterZoom] = useState<number>(1)
  const [afterPan, setAfterPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // Interaction dragging states
  const [isDraggingSlider, setIsDraggingSlider] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef<{ startX: number; startY: number; initialBeforePan: { x: number; y: number }; initialAfterPan: { x: number; y: number } }>({
    startX: 0,
    startY: 0,
    initialBeforePan: { x: 0, y: 0 },
    initialAfterPan: { x: 0, y: 0 }
  })

  // Exporting state
  const [isExporting, setIsExporting] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)

  const imgBefore = images.find((i) => i.id === beforeId) || images[0]
  const imgAfter = images.find((i) => i.id === afterId) || images[images.length - 1]

  // Reset zoom & pan
  const handleReset = useCallback(() => {
    if (adjustTarget === 'before') {
      setBeforeZoom(1)
      setBeforePan({ x: 0, y: 0 })
    } else if (adjustTarget === 'after') {
      setAfterZoom(1)
      setAfterPan({ x: 0, y: 0 })
    } else {
      setBeforeZoom(1)
      setBeforePan({ x: 0, y: 0 })
      setAfterZoom(1)
      setAfterPan({ x: 0, y: 0 })
      setSliderPos(50)
    }
  }, [adjustTarget])

  // Wheel zoom handler
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    // Smooth delta calculation
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87
    const clamp = (val: number) => Math.min(Math.max(Number((val).toFixed(2)), 0.8), 5.0)

    if (adjustTarget === 'both') {
      setBeforeZoom((prev) => clamp(prev * zoomFactor))
      setAfterZoom((prev) => clamp(prev * zoomFactor))
    } else if (adjustTarget === 'before') {
      setBeforeZoom((prev) => clamp(prev * zoomFactor))
    } else if (adjustTarget === 'after') {
      setAfterZoom((prev) => clamp(prev * zoomFactor))
    }
  }

  // Quick zoom buttons
  const applyZoomStep = (delta: number) => {
    const clamp = (val: number) => Math.min(Math.max(Number((val + delta).toFixed(2)), 0.8), 5.0)
    if (adjustTarget === 'both') {
      setBeforeZoom((prev) => clamp(prev))
      setAfterZoom((prev) => clamp(prev))
    } else if (adjustTarget === 'before') {
      setBeforeZoom((prev) => clamp(prev))
    } else if (adjustTarget === 'after') {
      setAfterZoom((prev) => clamp(prev))
    }
  }

  // Pointer Down on Image (start Pan)
  const handleImagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only left click
    if (e.button !== 0) return
    setIsPanning(true)
    panStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialBeforePan: { ...beforePan },
      initialAfterPan: { ...afterPan }
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  // Pointer Move on Image (execute Pan)
  const handleImagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning) return
    const dx = e.clientX - panStartRef.current.startX
    const dy = e.clientY - panStartRef.current.startY

    if (adjustTarget === 'both' || adjustTarget === 'before') {
      setBeforePan({
        x: panStartRef.current.initialBeforePan.x + dx,
        y: panStartRef.current.initialBeforePan.y + dy
      })
    }
    if (adjustTarget === 'both' || adjustTarget === 'after') {
      setAfterPan({
        x: panStartRef.current.initialAfterPan.x + dx,
        y: panStartRef.current.initialAfterPan.y + dy
      })
    }
  }

  // Pointer Up on Image
  const handleImagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanning) {
      setIsPanning(false)
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        // Ignored
      }
    }
  }

  // Pointer Down on Split Slider Divider
  const handleSliderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    setIsDraggingSlider(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  // Pointer Move on Split Slider Divider
  const handleSliderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingSlider || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const clientX = e.clientX
    const relativeX = clientX - rect.left
    const percent = Math.min(Math.max((relativeX / rect.width) * 100, 0), 100)
    setSliderPos(Number(percent.toFixed(1)))
  }

  // Pointer Up on Split Slider Divider
  const handleSliderPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingSlider) {
      setIsDraggingSlider(false)
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        // Ignored
      }
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'r' || e.key === 'R') {
        handleReset()
      } else if (e.key === '+' || e.key === '=') {
        applyZoomStep(0.2)
      } else if (e.key === '-') {
        applyZoomStep(-0.2)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleReset, onClose])

  // High-Res PNG Export Function
  const handleExportComparison = async () => {
    if (!imgBefore?.base64 || !imgAfter?.base64) return
    setIsExporting(true)

    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Não foi possível inicializar o canvas de exportação.')

      // Load both images
      const loadImg = (src: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
          const image = new Image()
          image.onload = () => resolve(image)
          image.onerror = reject
          image.src = src
        })

      const [loadedBefore, loadedAfter] = await Promise.all([
        loadImg(imgBefore.base64),
        loadImg(imgAfter.base64)
      ])

      // Canvas dimensions
      const width = 1600
      const headerHeight = 120
      const contentHeight = 900
      const totalHeight = headerHeight + contentHeight
      canvas.width = width
      canvas.height = totalHeight

      // Background
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, width, totalHeight)

      // Header background
      ctx.fillStyle = '#1e293b'
      ctx.fillRect(0, 0, width, headerHeight)

      // Title & Patient Name
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillText('Podonly • Evolução Clínica Podológica', 40, 55)

      ctx.fillStyle = '#94a3b8'
      ctx.font = '22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      const patientSubtitle = patientName
        ? `Paciente: ${patientName} | Comparação Antes & Depois`
        : 'Comparação de Tratamento Antes & Depois'
      ctx.fillText(patientSubtitle, 40, 95)

      // Watermark Date right aligned
      const dateText = new Date().toLocaleDateString('pt-BR')
      ctx.font = '20px sans-serif'
      ctx.fillStyle = '#64748b'
      ctx.textAlign = 'right'
      ctx.fillText(`Emitido em: ${dateText}`, width - 40, 75)
      ctx.textAlign = 'left'

      // Draw Photos
      const halfWidth = width / 2
      const drawPhoto = (
        img: HTMLImageElement,
        targetX: number,
        targetY: number,
        targetW: number,
        targetH: number,
        zoom: number,
        pan: { x: number; y: number }
      ) => {
        ctx.save()
        ctx.beginPath()
        ctx.rect(targetX, targetY, targetW, targetH)
        ctx.clip()

        // Maintain cover aspect ratio with zoom and pan
        const imgAspect = img.width / img.height
        const targetAspect = targetW / targetH
        let drawW = targetW
        let drawH = targetH

        if (imgAspect > targetAspect) {
          drawW = targetH * imgAspect
        } else {
          drawH = targetW / imgAspect
        }

        drawW *= zoom
        drawH *= zoom

        const posX = targetX + (targetW - drawW) / 2 + pan.x * (drawW / targetW)
        const posY = targetY + (targetH - drawH) / 2 + pan.y * (drawH / targetH)

        ctx.drawImage(img, posX, posY, drawW, drawH)
        ctx.restore()
      }

      // Draw side-by-side layout on export for optimal readability
      drawPhoto(loadedBefore, 0, headerHeight, halfWidth, contentHeight, beforeZoom, beforePan)
      drawPhoto(loadedAfter, halfWidth, headerHeight, halfWidth, contentHeight, afterZoom, afterPan)

      // Divider line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(halfWidth, headerHeight)
      ctx.lineTo(halfWidth, totalHeight)
      ctx.stroke()

      // Badges
      const drawBadge = (text: string, x: number, y: number, bgColor: string) => {
        ctx.save()
        ctx.fillStyle = bgColor
        ctx.beginPath()
        ctx.roundRect(x, y, 150, 44, 10)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 20px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(text, x + 75, y + 29)
        ctx.restore()
      }

      drawBadge('ANTES', 40, headerHeight + 30, 'rgba(14, 145, 168, 0.95)')
      drawBadge('DEPOIS', halfWidth + 40, headerHeight + 30, 'rgba(16, 185, 129, 0.95)')

      // Download file
      const link = document.createElement('a')
      const sanitizedName = (patientName || 'paciente').replace(/[^a-z0-9]/gi, '_').toLowerCase()
      link.download = `antes_depois_${sanitizedName}_${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Falha ao exportar imagem:', err)
      alert('Não foi possível gerar a imagem de comparação.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(8px)',
        padding: '1rem'
      }}
    >
      <div
        className="glass-card"
        style={{
          width: '980px',
          maxWidth: '96vw',
          maxHeight: '94vh',
          background: '#ffffff',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          animation: 'zoomIn 0.2s ease-out'
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--surface-border)',
            background: '#ffffff'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(14, 145, 168, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-color)'
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Comparador Clínico: Antes & Depois
              </h3>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Arraste para reposicionar e use a rodinha do mouse para dar zoom
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportComparison}
              disabled={isExporting}
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              title="Baixar imagem comparativa em PNG de alta resolução"
            >
              <Download size={14} /> {isExporting ? 'Exportando...' : 'Exportar PNG'}
            </button>
            <button
              className="modal-close-btn"
              onClick={onClose}
              style={{ padding: '0.45rem', borderRadius: '8px' }}
              title="Fechar (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Toolbar: View mode, target selector & zoom controls */}
        <div
          style={{
            padding: '0.75rem 1.75rem',
            background: '#f8fafc',
            borderBottom: '1px solid var(--surface-border)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem'
          }}
        >
          {/* View Mode Toggle: Side-by-Side vs Split */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
            <button
              type="button"
              onClick={() => setViewMode('side-by-side')}
              style={{
                border: 'none',
                background: viewMode === 'side-by-side' ? '#ffffff' : 'transparent',
                color: viewMode === 'side-by-side' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.78rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: viewMode === 'side-by-side' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Columns size={13} /> Lado a Lado
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              style={{
                border: 'none',
                background: viewMode === 'split' ? '#ffffff' : 'transparent',
                color: viewMode === 'split' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.78rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: viewMode === 'split' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <ArrowLeftRight size={13} /> Cortina (Split)
            </button>
          </div>

          {/* Adjust Target (Sync vs Individual) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Alinhar com Mouse:
            </span>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button
                type="button"
                onClick={() => setAdjustTarget('both')}
                style={{
                  border: '1px solid',
                  borderColor: adjustTarget === 'both' ? 'var(--accent-color)' : 'var(--surface-border)',
                  background: adjustTarget === 'both' ? 'rgba(14, 145, 168, 0.1)' : '#ffffff',
                  color: adjustTarget === 'both' ? 'var(--accent-color)' : 'var(--text-secondary)',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  padding: '0.3rem 0.6rem',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Ambas (Sincronizado)
              </button>
              <button
                type="button"
                onClick={() => setAdjustTarget('before')}
                style={{
                  border: '1px solid',
                  borderColor: adjustTarget === 'before' ? 'var(--accent-color)' : 'var(--surface-border)',
                  background: adjustTarget === 'before' ? 'rgba(14, 145, 168, 0.1)' : '#ffffff',
                  color: adjustTarget === 'before' ? 'var(--accent-color)' : 'var(--text-secondary)',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  padding: '0.3rem 0.6rem',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Apenas Antes
              </button>
              <button
                type="button"
                onClick={() => setAdjustTarget('after')}
                style={{
                  border: '1px solid',
                  borderColor: adjustTarget === 'after' ? 'var(--success-color)' : 'var(--surface-border)',
                  background: adjustTarget === 'after' ? 'rgba(16, 185, 129, 0.1)' : '#ffffff',
                  color: adjustTarget === 'after' ? 'var(--success-color)' : 'var(--text-secondary)',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  padding: '0.3rem 0.6rem',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Apenas Depois
              </button>
            </div>
          </div>

          {/* Quick Zoom & Reset Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              type="button"
              onClick={() => applyZoomStep(-0.25)}
              style={{
                border: '1px solid var(--surface-border)',
                background: '#ffffff',
                color: 'var(--text-primary)',
                padding: '0.35rem 0.5rem',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Reduzir Zoom (-)"
            >
              <ZoomOut size={14} />
            </button>

            <span
              style={{
                fontSize: '0.76rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                minWidth: '45px',
                textAlign: 'center'
              }}
            >
              {adjustTarget === 'before'
                ? `${Math.round(beforeZoom * 100)}%`
                : adjustTarget === 'after'
                  ? `${Math.round(afterZoom * 100)}%`
                  : `${Math.round(beforeZoom * 100)}%`}
            </span>

            <button
              type="button"
              onClick={() => applyZoomStep(0.25)}
              style={{
                border: '1px solid var(--surface-border)',
                background: '#ffffff',
                color: 'var(--text-primary)',
                padding: '0.35rem 0.5rem',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Ampliar Zoom (+)"
            >
              <ZoomIn size={14} />
            </button>

            <button
              type="button"
              onClick={handleReset}
              style={{
                border: '1px solid var(--surface-border)',
                background: '#ffffff',
                color: 'var(--text-secondary)',
                fontSize: '0.76rem',
                fontWeight: 600,
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                marginLeft: '0.25rem'
              }}
              title="Redefinir Posição e Zoom (R)"
            >
              <RotateCcw size={12} /> Resetar (100%)
            </button>
          </div>
        </div>

        {/* Image Selection Dropdowns */}
        <div
          style={{
            padding: '0.75rem 1.75rem',
            background: '#ffffff',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.25rem',
            borderBottom: '1px solid var(--surface-border)'
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--accent-color)', marginBottom: '0.25rem' }}>
              📷 Foto Antes (Inicial):
            </label>
            <select
              className="form-control"
              value={beforeId}
              onChange={(e) => setBeforeId(Number(e.target.value))}
              style={{ fontSize: '0.82rem', padding: '0.35rem 0.6rem' }}
            >
              {images.map((img, idx) => (
                <option key={img.id} value={img.id}>
                  Foto #{idx + 1} — {img.description || 'Sem descrição'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--success-color)', marginBottom: '0.25rem' }}>
              ✨ Foto Depois (Evolução / Resultado):
            </label>
            <select
              className="form-control"
              value={afterId}
              onChange={(e) => setAfterId(Number(e.target.value))}
              style={{ fontSize: '0.82rem', padding: '0.35rem 0.6rem' }}
            >
              {images.map((img, idx) => (
                <option key={img.id} value={img.id}>
                  Foto #{idx + 1} — {img.description || 'Sem descrição'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Viewport Container */}
        <div
          ref={containerRef}
          onWheel={handleWheel}
          style={{
            position: 'relative',
            flex: '1 1 auto',
            height: '520px',
            minHeight: '440px',
            maxHeight: '62vh',
            background: '#090d16',
            userSelect: 'none',
            overflow: 'hidden',
            cursor: isPanning ? 'grabbing' : 'grab'
          }}
        >
          {viewMode === 'split' ? (
            /* ================= SPLIT / SLIDER MODE ================= */
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100%',
                height: '100%',
                overflow: 'hidden'
              }}
              onPointerDown={handleImagePointerDown}
              onPointerMove={handleImagePointerMove}
              onPointerUp={handleImagePointerUp}
              onPointerCancel={handleImagePointerUp}
            >
              {/* Bottom Base Layer: AFTER Image */}
              {imgAfter?.base64 && (
                <img
                  src={imgAfter.base64}
                  alt="Depois"
                  draggable={false}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    transform: `scale(${afterZoom}) translate(${afterPan.x / afterZoom}px, ${afterPan.y / afterZoom}px)`,
                    transformOrigin: 'center center',
                    pointerEvents: 'none'
                  }}
                />
              )}
              <div
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'rgba(16, 185, 129, 0.92)',
                  color: 'white',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  padding: '0.3rem 0.75rem',
                  borderRadius: '20px',
                  letterSpacing: '0.5px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  zIndex: 2,
                  pointerEvents: 'none'
                }}
              >
                DEPOIS
              </div>

              {/* Top Clipped Layer: BEFORE Image */}
              {imgBefore?.base64 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    clipPath: `inset(0 ${100 - sliderPos}% 0 0)`,
                    pointerEvents: 'none'
                  }}
                >
                  <img
                    src={imgBefore.base64}
                    alt="Antes"
                    draggable={false}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      transform: `scale(${beforeZoom}) translate(${beforePan.x / beforeZoom}px, ${beforePan.y / beforeZoom}px)`,
                      transformOrigin: 'center center',
                      pointerEvents: 'none'
                    }}
                  />
                </div>
              )}
              <div
                style={{
                  position: 'absolute',
                  top: '1rem',
                  left: '1rem',
                  background: 'rgba(14, 145, 168, 0.92)',
                  color: 'white',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  padding: '0.3rem 0.75rem',
                  borderRadius: '20px',
                  letterSpacing: '0.5px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  zIndex: 2,
                  pointerEvents: 'none'
                }}
              >
                ANTES
              </div>

              {/* Draggable Divider Line */}
              <div
                onPointerDown={handleSliderPointerDown}
                onPointerMove={handleSliderPointerMove}
                onPointerUp={handleSliderPointerUp}
                onPointerCancel={handleSliderPointerUp}
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${sliderPos}%`,
                  width: '32px',
                  marginLeft: '-16px',
                  cursor: 'col-resize',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10
                }}
              >
                {/* Thin visual line */}
                <div
                  style={{
                    width: '3px',
                    height: '100%',
                    background: '#ffffff',
                    boxShadow: '0 0 10px rgba(0,0,0,0.6)',
                    pointerEvents: 'none'
                  }}
                />

                {/* Circular Draggable Knob */}
                <div
                  style={{
                    position: 'absolute',
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    border: '2px solid var(--accent-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-color)',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                    pointerEvents: 'none'
                  }}
                >
                  <ArrowLeftRight size={18} />
                </div>
              </div>
            </div>
          ) : (
            /* ================= SIDE BY SIDE MODE ================= */
            <div
              style={{ width: '100%', height: '100%', display: 'flex', position: 'relative' }}
              onPointerDown={handleImagePointerDown}
              onPointerMove={handleImagePointerMove}
              onPointerUp={handleImagePointerUp}
              onPointerCancel={handleImagePointerUp}
            >
              {/* Left: BEFORE Photo */}
              <div
                style={{
                  flex: 1,
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden',
                  borderRight: '2px solid rgba(255,255,255,0.15)'
                }}
              >
                {imgBefore?.base64 && (
                  <img
                    src={imgBefore.base64}
                    alt="Antes"
                    draggable={false}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      transform: `scale(${beforeZoom}) translate(${beforePan.x / beforeZoom}px, ${beforePan.y / beforeZoom}px)`,
                      transformOrigin: 'center center',
                      pointerEvents: 'none'
                    }}
                  />
                )}
                <div
                  style={{
                    position: 'absolute',
                    top: '1rem',
                    left: '1rem',
                    background: 'rgba(14, 145, 168, 0.92)',
                    color: 'white',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    padding: '0.3rem 0.75rem',
                    borderRadius: '20px',
                    zIndex: 2,
                    pointerEvents: 'none'
                  }}
                >
                  ANTES
                </div>
              </div>

              {/* Right: AFTER Photo */}
              <div style={{ flex: 1, height: '100%', position: 'relative', overflow: 'hidden' }}>
                {imgAfter?.base64 && (
                  <img
                    src={imgAfter.base64}
                    alt="Depois"
                    draggable={false}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      transform: `scale(${afterZoom}) translate(${afterPan.x / afterZoom}px, ${afterPan.y / afterZoom}px)`,
                      transformOrigin: 'center center',
                      pointerEvents: 'none'
                    }}
                  />
                )}
                <div
                  style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    background: 'rgba(16, 185, 129, 0.92)',
                    color: 'white',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    padding: '0.3rem 0.75rem',
                    borderRadius: '20px',
                    zIndex: 2,
                    pointerEvents: 'none'
                  }}
                >
                  DEPOIS
                </div>
              </div>
            </div>
          )}

          {/* Floating Gesture Hint Pill */}
          <div
            style={{
              position: 'absolute',
              bottom: '1rem',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(6px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              fontSize: '0.72rem',
              padding: '0.35rem 0.85rem',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              pointerEvents: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
            }}
          >
            <Move size={12} color="var(--accent-color)" />
            <span>Arraste para mover • Scroll do mouse para zoom</span>
          </div>
        </div>

        {/* Footer info & descriptions */}
        <div
          style={{
            padding: '1rem 1.75rem',
            background: '#ffffff',
            borderTop: '1px solid var(--surface-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem'
          }}
        >
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <div>
              <span style={{ fontWeight: 700, color: 'var(--accent-color)' }}>Antes: </span>
              <span style={{ color: 'var(--text-secondary)' }}>{imgBefore?.description || 'Foto inicial'}</span>
            </div>
            <div>
              <span style={{ fontWeight: 700, color: 'var(--success-color)' }}>Depois: </span>
              <span style={{ color: 'var(--text-secondary)' }}>{imgAfter?.description || 'Foto final'}</span>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ fontSize: '0.82rem', padding: '0.45rem 1.1rem' }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
