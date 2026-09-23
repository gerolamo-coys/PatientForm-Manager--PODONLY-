import { useState, useMemo } from 'react'
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Maximize2,
  Split,
  Printer,
  Filter,
  Search,
  LayoutGrid,
  GitCommit,
  CheckCircle2,
  ArrowUpDown,
  MapPin,
  Sparkles,
  Info,
  X
} from 'lucide-react'
import { PatientImage, PhotoEvolutionTag } from '../../../shared/types'

interface PatientPhotoTimelineProps {
  patientId: number
  patientName: string
  images: (PatientImage & { base64: string | null })[]
  onAddImage: () => Promise<void>
  onDeleteImage: (id: number, fileName: string) => Promise<void>
  onUpdateMetadata: (
    id: number,
    data: { description?: string; tag?: string; category?: string; photo_date?: string }
  ) => Promise<void>
  onOpenComparison: (beforeId?: number, afterId?: number) => void
  onOpenPrintReport: () => void
  onFullscreenZoom: (base64: string) => void
}

const COMMON_REGIONS = [
  'Geral',
  'Hálux D (Dedão Direito)',
  'Hálux E (Dedão Esquerdo)',
  'Dedos Menores D',
  'Dedos Menores E',
  'Região Plantar D',
  'Região Plantar E',
  'Calcanhar D',
  'Calcanhar E',
  'Interdigital'
]

const STAGE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; dotColor: string }
> = {
  ANTES: {
    label: 'Antes',
    color: '#ffffff',
    bg: '#dc2626',
    border: '#b91c1c',
    dotColor: '#dc2626'
  },
  DURANTE: {
    label: 'Durante',
    color: '#ffffff',
    bg: '#d97706',
    border: '#b45309',
    dotColor: '#d97706'
  },
  DEPOIS: {
    label: 'Depois',
    color: '#ffffff',
    bg: '#059669',
    border: '#047857',
    dotColor: '#059669'
  },
  RETORNO: {
    label: 'Retorno',
    color: '#ffffff',
    bg: '#0284c7',
    border: '#0369a1',
    dotColor: '#0284c7'
  }
}

function formatDateDisplay(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  try {
    const raw = dateStr.split('T')[0].split(' ')[0]
    const [year, month, day] = raw.split('-')
    if (year && month && day) {
      return `${day}/${month}/${year}`
    }
    return raw
  } catch {
    return dateStr || '-'
  }
}

function parseDateForDiff(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null
  try {
    const raw = dateStr.split('T')[0].split(' ')[0]
    const [year, month, day] = raw.split('-').map(Number)
    if (year && month && day) {
      return new Date(year, month - 1, day, 12, 0, 0)
    }
    return new Date(dateStr)
  } catch {
    return null
  }
}

export default function PatientPhotoTimeline({
  images,
  onAddImage,
  onDeleteImage,
  onUpdateMetadata,
  onOpenComparison,
  onOpenPrintReport,
  onFullscreenZoom
}: PatientPhotoTimelineProps) {
  // View states
  const [viewMode, setViewMode] = useState<'timeline' | 'grid'>('timeline')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc') // desc: newest first

  // Filters
  const [selectedStage, setSelectedStage] = useState<string>('ALL')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Comparison selection
  const [selectedForCompare, setSelectedForCompare] = useState<number[]>([])

  // Distinct categories from existing images
  const existingCategories = useMemo(() => {
    const set = new Set<string>()
    images.forEach((img) => {
      if (img.category && img.category.trim()) {
        set.add(img.category.trim())
      }
    })
    return Array.from(set)
  }, [images])

  // Combined category options
  const categoryOptions = useMemo(() => {
    const all = new Set([...COMMON_REGIONS, ...existingCategories])
    return Array.from(all)
  }, [existingCategories])

  // Filtered & Sorted images
  const filteredImages = useMemo(() => {
    return images.filter((img) => {
      const tag = (img.tag || 'ANTES').toUpperCase()
      if (selectedStage !== 'ALL' && tag !== selectedStage) {
        return false
      }
      if (selectedCategory !== 'ALL' && (img.category || 'Geral') !== selectedCategory) {
        return false
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const descMatch = (img.description || '').toLowerCase().includes(query)
        const catMatch = (img.category || '').toLowerCase().includes(query)
        const tagMatch = tag.toLowerCase().includes(query)
        if (!descMatch && !catMatch && !tagMatch) return false
      }
      return true
    })
  }, [images, selectedStage, selectedCategory, searchQuery])

  // Earliest image date overall (for relative days calculation)
  const earliestDate = useMemo<Date | null>(() => {
    if (images.length === 0) return null
    let minDate: Date | null = null
    images.forEach((img) => {
      const d = parseDateForDiff(img.photo_date || img.created_at)
      if (d) {
        if (!minDate || d < minDate) minDate = d
      }
    })
    return minDate
  }, [images])

  // Group images by date for Timeline view
  const groupedByDate = useMemo(() => {
    const map = new Map<string, (PatientImage & { base64: string | null })[]>()

    filteredImages.forEach((img) => {
      const dateKey = (img.photo_date || img.created_at || '').split('T')[0].split(' ')[0] || 'Sem Data'
      if (!map.has(dateKey)) {
        map.set(dateKey, [])
      }
      map.get(dateKey)!.push(img)
    })

    // Sort groups
    const sortedKeys = Array.from(map.keys()).sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.localeCompare(b)
      }
      return b.localeCompare(a)
    })

    const baseDate = earliestDate

    return sortedKeys.map((dateKey) => {
      const groupImages = map.get(dateKey) || []
      const groupDate = parseDateForDiff(dateKey)
      let daysFromStart: number | null = null
      if (groupDate && baseDate) {
        const diffMs = groupDate.getTime() - baseDate.getTime()
        daysFromStart = Math.round(diffMs / (1000 * 60 * 60 * 24))
      }

      return {
        dateKey,
        dateFormatted: formatDateDisplay(dateKey),
        daysFromStart,
        images: groupImages
      }
    })
  }, [filteredImages, sortOrder, earliestDate])

  // Toggle selection for comparison
  const handleToggleCompare = (id: number) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id)
      }
      if (prev.length >= 2) {
        // Keep the second one and add the new one
        return [prev[1], id]
      }
      return [...prev, id]
    })
  }

  // Launch comparison with the two selected photos
  const handleLaunchComparisonWithSelection = () => {
    if (selectedForCompare.length === 2) {
      // Order them chronologically so older is "Before" and newer is "After"
      const imgA = images.find((i) => i.id === selectedForCompare[0])
      const imgB = images.find((i) => i.id === selectedForCompare[1])
      if (imgA && imgB) {
        const dateA = imgA.photo_date || imgA.created_at || ''
        const dateB = imgB.photo_date || imgB.created_at || ''
        if (dateA <= dateB) {
          onOpenComparison(imgA.id, imgB.id)
        } else {
          onOpenComparison(imgB.id, imgA.id)
        }
        return
      }
    }
    onOpenComparison()
  }

  // Quick tag change
  const handleQuickTagChange = async (imgId: number, newTag: PhotoEvolutionTag) => {
    await onUpdateMetadata(imgId, { tag: newTag })
  }

  // Quick category change
  const handleCategoryChange = async (imgId: number, newCat: string) => {
    await onUpdateMetadata(imgId, { category: newCat })
  }

  // Quick date change
  const handleDateChange = async (imgId: number, newDate: string) => {
    if (!newDate) return
    await onUpdateMetadata(imgId, { photo_date: newDate })
  }

  return (
    <div style={{ marginTop: '2.5rem', borderTop: '1px solid var(--surface-border)', paddingTop: '2rem' }}>
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(14, 145, 168, 0.15), rgba(16, 185, 129, 0.15))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-color)'
              }}
            >
              <GitCommit size={20} />
            </div>
            <div>
              <h3 className="section-title" style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                Galeria de Evolução Clínica
              </h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Linha do tempo fotográfica dos tratamentos, com marcadores evolutivos e comparação interativa.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {images.length >= 2 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onOpenComparison()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                color: 'var(--accent-color)',
                borderColor: 'var(--accent-color)',
                fontSize: '0.85rem'
              }}
              title="Comparar evolução em fotos com slider interativo"
            >
              <Split size={16} /> Comparar Antes / Depois
            </button>
          )}

          {images.length > 0 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onOpenPrintReport}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                color: '#475569',
                fontSize: '0.85rem'
              }}
              title="Gerar e imprimir relatório fotográfico em PDF"
            >
              <Printer size={16} /> Relatório Fotográfico
            </button>
          )}

          <button
            type="button"
            className="btn btn-primary"
            onClick={onAddImage}
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem' }}
          >
            <Plus size={17} /> Anexar Foto
          </button>
        </div>
      </div>

      {/* Control Bar: View Toggle, Stage Filters, Category Selector & Search */}
      {images.length > 0 && (
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.65)',
            backdropFilter: 'blur(8px)',
            borderRadius: '12px',
            border: '1px solid var(--surface-border)',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}
        >
          {/* Row 1: Filters & Search */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}
          >
            {/* Stage Filter Chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginRight: '0.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <Filter size={13} /> Estágio:
              </span>
              {[
                { id: 'ALL', label: `Todas (${images.length})` },
                { id: 'ANTES', label: 'Antes', color: '#dc2626' },
                { id: 'DURANTE', label: 'Durante', color: '#d97706' },
                { id: 'DEPOIS', label: 'Depois', color: '#059669' },
                { id: 'RETORNO', label: 'Retorno', color: '#0284c7' }
              ].map((stage) => {
                const count =
                  stage.id === 'ALL'
                    ? images.length
                    : images.filter((i) => (i.tag || 'ANTES').toUpperCase() === stage.id).length
                const isActive = selectedStage === stage.id
                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => setSelectedStage(stage.id)}
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: isActive ? 700 : 500,
                      border: '1px solid',
                      borderColor: isActive ? 'var(--accent-color)' : 'var(--surface-border)',
                      background: isActive ? 'var(--accent-color)' : '#ffffff',
                      color: isActive ? '#ffffff' : 'var(--text-primary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {stage.label} {stage.id !== 'ALL' && `(${count})`}
                  </button>
                )
              })}
            </div>

            {/* View Mode & Sort Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {/* Sort Order */}
              <button
                type="button"
                onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                title={sortOrder === 'desc' ? 'Mais recentes primeiro' : 'Mais antigas primeiro'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.65rem',
                  background: '#ffffff',
                  border: '1px solid var(--surface-border)',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                <ArrowUpDown size={13} />
                <span>{sortOrder === 'desc' ? 'Mais recentes' : 'Mais antigas'}</span>
              </button>

              {/* View Switcher (Timeline vs Grid) */}
              <div
                style={{
                  display: 'flex',
                  background: 'rgba(14, 145, 168, 0.08)',
                  padding: '2px',
                  borderRadius: '8px'
                }}
              >
                <button
                  type="button"
                  onClick={() => setViewMode('timeline')}
                  title="Modo Linha do Tempo"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.35rem 0.7rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: viewMode === 'timeline' ? '#ffffff' : 'transparent',
                    color: viewMode === 'timeline' ? 'var(--accent-color)' : 'var(--text-secondary)',
                    fontWeight: viewMode === 'timeline' ? 700 : 500,
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    boxShadow: viewMode === 'timeline' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  <Clock size={13} /> Linha do Tempo
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  title="Modo Grade"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.35rem 0.7rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: viewMode === 'grid' ? '#ffffff' : 'transparent',
                    color: viewMode === 'grid' ? 'var(--accent-color)' : 'var(--text-secondary)',
                    fontWeight: viewMode === 'grid' ? 700 : 500,
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  <LayoutGrid size={13} /> Grade
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Region Filter & Search Input */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
              paddingTop: '0.3rem',
              borderTop: '1px dashed var(--surface-border)'
            }}
          >
            {/* Region Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: '220px' }}>
              <MapPin size={13} color="var(--text-secondary)" />
              <select
                className="form-control"
                style={{
                  fontSize: '0.76rem',
                  padding: '0.25rem 0.5rem',
                  height: '30px',
                  background: '#ffffff'
                }}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="ALL">Todas as Regiões Anatômicas</option>
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Text Search */}
            <div
              style={{
                flex: 1,
                minWidth: '200px',
                display: 'flex',
                alignItems: 'center',
                background: '#ffffff',
                border: '1px solid var(--surface-border)',
                borderRadius: '6px',
                padding: '0.2rem 0.6rem',
                gap: '0.4rem'
              }}
            >
              <Search size={13} color="var(--text-secondary)" />
              <input
                type="text"
                placeholder="Buscar por descrição, lesão ou observação..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.78rem',
                  width: '100%',
                  background: 'transparent'
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    padding: 0
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Results counter */}
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Exibindo <strong>{filteredImages.length}</strong> de {images.length} fotos
            </span>
          </div>
        </div>
      )}

      {/* Floating Compare Bar when photos are selected */}
      {selectedForCompare.length > 0 && (
        <div
          style={{
            position: 'sticky',
            bottom: '1rem',
            zIndex: 50,
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(12px)',
            color: '#ffffff',
            padding: '0.75rem 1.25rem',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1.5rem',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(14, 145, 168, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8'
              }}
            >
              <Split size={17} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                {selectedForCompare.length === 1
                  ? '1 foto selecionada'
                  : '2 fotos selecionadas para comparação'}
              </div>
              <div style={{ fontSize: '0.73rem', color: '#94a3b8' }}>
                {selectedForCompare.length === 1
                  ? 'Selecione mais 1 foto para abrir o Comparador Antes x Depois.'
                  : 'Pronto! Clique ao lado para abrir a comparação interativa com slider.'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              type="button"
              onClick={() => setSelectedForCompare([])}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#cbd5e1',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              Limpar seleção
            </button>

            <button
              type="button"
              disabled={selectedForCompare.length < 2}
              onClick={handleLaunchComparisonWithSelection}
              style={{
                background:
                  selectedForCompare.length === 2
                    ? 'var(--accent-color)'
                    : 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: 'none',
                padding: '0.45rem 1rem',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: selectedForCompare.length === 2 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow:
                  selectedForCompare.length === 2 ? '0 4px 12px rgba(14, 145, 168, 0.4)' : 'none'
              }}
            >
              <Sparkles size={14} /> Abrir Comparador Interativo
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {images.length === 0 ? (
        /* Empty State */
        <div
          onClick={onAddImage}
          style={{
            padding: '3.5rem 2rem',
            textAlign: 'center',
            border: '2px dashed var(--surface-border)',
            borderRadius: '16px',
            background: 'rgba(241, 245, 249, 0.4)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent-color)'
            e.currentTarget.style.background = 'rgba(14, 145, 168, 0.04)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--surface-border)'
            e.currentTarget.style.background = 'rgba(241, 245, 249, 0.4)'
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(14, 145, 168, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto',
              color: 'var(--accent-color)'
            }}
          >
            <Plus size={28} />
          </div>
          <h4
            style={{
              margin: '0 0 0.4rem 0',
              fontSize: '1.05rem',
              fontWeight: 700,
              color: 'var(--text-primary)'
            }}
          >
            Iniciar Timeline Fotográfica
          </h4>
          <p
            style={{
              margin: '0 auto',
              maxWidth: '420px',
              fontSize: '0.86rem',
              color: 'var(--text-secondary)'
            }}
          >
            Anexe a primeira foto clínica deste paciente para acompanhar a evolução do tratamento
            (Antes, Durante, Depois e Retorno).
          </p>
        </div>
      ) : filteredImages.length === 0 ? (
        /* Empty Filter State */
        <div
          style={{
            padding: '3rem 2rem',
            textAlign: 'center',
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid var(--surface-border)'
          }}
        >
          <Info size={32} color="var(--text-secondary)" style={{ marginBottom: '0.75rem' }} />
          <h4 style={{ margin: '0 0 0.35rem 0', color: 'var(--text-primary)' }}>
            Nenhuma foto encontrada para os filtros selecionados
          </h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Tente alterar o estágio ou limpar o campo de busca.
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setSelectedStage('ALL')
              setSelectedCategory('ALL')
              setSearchQuery('')
            }}
            style={{ marginTop: '1rem', fontSize: '0.8rem' }}
          >
            Limpar Filtros
          </button>
        </div>
      ) : viewMode === 'timeline' ? (
        /* TIMELINE VIEW */
        <div style={{ position: 'relative', paddingLeft: '1.5rem' }}>
          {/* Vertical Rail Line */}
          <div
            style={{
              position: 'absolute',
              top: '15px',
              bottom: '15px',
              left: '7px',
              width: '2px',
              background:
                'linear-gradient(to bottom, var(--accent-color) 0%, rgba(14, 145, 168, 0.2) 100%)'
            }}
          />

          {groupedByDate.map((group) => (
            <div key={group.dateKey} style={{ marginBottom: '2.5rem', position: 'relative' }}>
              {/* Date Marker Node on Timeline */}
              <div
                style={{
                  position: 'absolute',
                  left: '-1.5rem',
                  top: '4px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  border: '3px solid var(--accent-color)',
                  boxShadow: '0 0 0 4px rgba(14, 145, 168, 0.15)',
                  zIndex: 2
                }}
              />

              {/* Date Header Banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                  flexWrap: 'wrap'
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: '#ffffff',
                    border: '1px solid var(--surface-border)',
                    padding: '0.35rem 0.8rem',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}
                >
                  <Calendar size={14} color="var(--accent-color)" />
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {group.dateFormatted}
                  </strong>
                </div>

                {group.daysFromStart !== null && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: group.daysFromStart === 0 ? 'var(--accent-color)' : '#059669',
                      background:
                        group.daysFromStart === 0
                          ? 'rgba(14, 145, 168, 0.08)'
                          : 'rgba(16, 185, 129, 0.1)',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '12px'
                    }}
                  >
                    {group.daysFromStart === 0
                      ? 'Sessão Inicial (Dia 0)'
                      : `+${group.daysFromStart} dias de evolução`}
                  </span>
                )}

                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {group.images.length} {group.images.length === 1 ? 'foto' : 'fotos'}
                </span>
              </div>

              {/* Photos in this Session Group */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '1.25rem'
                }}
              >
                {group.images.map((img) => renderPhotoCard(img))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* GRID VIEW */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.25rem'
          }}
        >
          {filteredImages.map((img) => renderPhotoCard(img))}
        </div>
      )}
    </div>
  )

  // Sub-renderer for a photo card
  function renderPhotoCard(img: PatientImage & { base64: string | null }) {
    const rawTag = (img.tag || 'ANTES').toUpperCase()
    const stageInfo = STAGE_CONFIG[rawTag] || STAGE_CONFIG['ANTES']
    const isSelected = selectedForCompare.includes(img.id)
    const rawDate = (img.photo_date || img.created_at || '').split('T')[0].split(' ')[0]

    return (
      <div
        key={img.id}
        className="glass-card"
        style={{
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '14px',
          border: isSelected ? '2px solid var(--accent-color)' : '1px solid var(--surface-border)',
          boxShadow: isSelected
            ? '0 8px 24px rgba(14, 145, 168, 0.2)'
            : '0 4px 12px rgba(0,0,0,0.03)',
          transition: 'all 0.2s ease',
          background: '#ffffff',
          position: 'relative'
        }}
      >
        {/* Photo Container */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '210px',
            overflow: 'hidden',
            background: '#f1f5f9'
          }}
        >
          {img.base64 ? (
            <img
              src={img.base64}
              alt={img.description || 'Foto do tratamento'}
              onClick={() => onFullscreenZoom(img.base64!)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                cursor: 'zoom-in',
                transition: 'transform 0.3s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem'
              }}
            >
              Imagem não disponível
            </div>
          )}

          {/* Top Left: Stage Badge (clickable to change) */}
          <div style={{ position: 'absolute', top: '0.6rem', left: '0.6rem', zIndex: 3 }}>
            <select
              value={rawTag}
              onChange={(e) => handleQuickTagChange(img.id, e.target.value as PhotoEvolutionTag)}
              style={{
                background: stageInfo.bg,
                color: stageInfo.color,
                border: `1px solid ${stageInfo.border}`,
                borderRadius: '6px',
                padding: '0.2rem 0.55rem',
                fontSize: '0.74rem',
                fontWeight: 700,
                letterSpacing: '0.5px',
                cursor: 'pointer',
                outline: 'none',
                boxShadow: '0 2px 6px rgba(0,0,0,0.18)'
              }}
              title="Clique para alterar o estágio evolutivo"
            >
              <option value="ANTES" style={{ background: '#ffffff', color: '#dc2626', fontWeight: 700 }}>ANTES</option>
              <option value="DURANTE" style={{ background: '#ffffff', color: '#d97706', fontWeight: 700 }}>DURANTE</option>
              <option value="DEPOIS" style={{ background: '#ffffff', color: '#059669', fontWeight: 700 }}>DEPOIS</option>
              <option value="RETORNO" style={{ background: '#ffffff', color: '#0284c7', fontWeight: 700 }}>RETORNO</option>
            </select>
          </div>

          {/* Top Right: Actions (Compare Checkbox + Delete) */}
          <div
            style={{
              position: 'absolute',
              top: '0.6rem',
              right: '0.6rem',
              display: 'flex',
              gap: '0.35rem',
              zIndex: 3
            }}
          >
            {/* Compare Selector Checkbox */}
            <button
              type="button"
              onClick={() => handleToggleCompare(img.id)}
              title={
                isSelected ? 'Remover da comparação' : 'Selecionar esta foto para comparar Antes x Depois'
              }
              style={{
                background: isSelected ? 'var(--accent-color)' : 'rgba(255, 255, 255, 0.92)',
                color: isSelected ? '#ffffff' : '#475569',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '6px',
                padding: '0.25rem 0.5rem',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
                transition: 'all 0.15s ease'
              }}
            >
              <CheckCircle2 size={13} color={isSelected ? '#ffffff' : '#94a3b8'} />
              <span>{isSelected ? 'Selecionada' : 'Comparar'}</span>
            </button>

            {/* Delete Button */}
            <button
              type="button"
              onClick={() => onDeleteImage(img.id, img.file_name)}
              title="Excluir foto"
              style={{
                background: 'rgba(255, 255, 255, 0.92)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--danger-color)',
                cursor: 'pointer',
                boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ef4444'
                e.currentTarget.style.color = '#ffffff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.92)'
                e.currentTarget.style.color = 'var(--danger-color)'
              }}
            >
              <Trash2 size={13} />
            </button>
          </div>

          {/* Bottom Right: Zoom Button */}
          {img.base64 && (
            <button
              type="button"
              onClick={() => onFullscreenZoom(img.base64!)}
              title="Ampliar imagem"
              style={{
                position: 'absolute',
                bottom: '0.5rem',
                right: '0.5rem',
                background: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(4px)',
                border: 'none',
                borderRadius: '6px',
                padding: '0.2rem 0.45rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                color: 'white',
                fontSize: '0.7rem',
                cursor: 'pointer'
              }}
            >
              <Maximize2 size={11} /> Ampliar
            </button>
          )}
        </div>

        {/* Card Body: Metadata & Notes */}
        <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {/* Meta Row: Date & Region */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              fontSize: '0.75rem'
            }}
          >
            {/* Date Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Calendar size={12} color="var(--text-secondary)" />
              <input
                type="date"
                defaultValue={rawDate}
                onBlur={(e) => handleDateChange(img.id, e.target.value)}
                style={{
                  border: '1px solid transparent',
                  background: 'transparent',
                  fontSize: '0.75rem',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '1px 3px',
                  borderRadius: '4px'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.background = '#ffffff'
                  e.currentTarget.style.borderColor = 'var(--surface-border)'
                }}
                title="Clique para editar a data desta foto"
              />
            </div>

            {/* Region / Category Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', maxWidth: '55%' }}>
              <MapPin size={11} color="var(--text-secondary)" />
              <select
                value={img.category || 'Geral'}
                onChange={(e) => handleCategoryChange(img.id, e.target.value)}
                style={{
                  border: '1px solid transparent',
                  background: 'transparent',
                  fontSize: '0.72rem',
                  color: '#475569',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: '1px 2px',
                  borderRadius: '4px',
                  maxWidth: '120px',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.background = '#ffffff'
                  e.currentTarget.style.borderColor = 'var(--surface-border)'
                }}
                title="Região anatômica da foto"
              >
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description Input */}
          <div>
            <input
              type="text"
              className="form-control"
              placeholder="Observação clínica (ex: Fissura profunda calcanhar D)..."
              defaultValue={img.description || ''}
              onBlur={(e) => onUpdateMetadata(img.id, { description: e.target.value })}
              style={{
                fontSize: '0.8rem',
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid var(--surface-border)',
                width: '100%',
                background: '#f8fafc'
              }}
            />
          </div>
        </div>
      </div>
    )
  }
}
