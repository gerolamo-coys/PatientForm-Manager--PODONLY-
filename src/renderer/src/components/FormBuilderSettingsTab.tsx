import React, { useState, useEffect } from 'react'
import {
  Lock,
  Plus,
  Trash2,
  RotateCcw,
  Save,
  CheckCircle2,
  User,
  ClipboardList,
  Calendar,
  Layers,
  ListChecks,
  Eye,
  EyeOff
} from 'lucide-react'
import type {
  FormsCustomizationConfig,
  CustomBlockDefinition,
  CustomFieldDefinition,
  CustomFieldType
} from '../../../shared/types'
import {
  DEFAULT_FORMS_CONFIG,
  loadFormsConfig,
  saveFormsConfig
} from '../utils/formSchemaHelper'

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  short_text: 'Texto Curto',
  long_text: 'Texto Longo (Múltiplas Linhas)',
  number: 'Número / Valor',
  date: 'Data',
  single_select: 'Lista Suspensa (Seleção Única)',
  multi_checkbox: 'Caixas de Marcação (Múltipla Escolha)',
  yes_no_table: 'Grade de Perguntas (Sim / Não)'
}

export default function FormBuilderSettingsTab(): React.JSX.Element {
  const [subTab, setSubTab] = useState<'patient' | 'consultation' | 'appointment'>('patient')
  const [config, setConfig] = useState<FormsCustomizationConfig>(structuredClone(DEFAULT_FORMS_CONFIG))
  const [savedToast, setSavedToast] = useState(false)

  // Selector inputs
  const [newMedProb, setNewMedProb] = useState('')
  const [newShoeType, setNewShoeType] = useState('')
  const [newNailShape, setNewNailShape] = useState('')
  const [newDermPathology, setNewDermPathology] = useState('')
  const [newServiceName, setNewServiceName] = useState('')
  const [newServicePrice, setNewServicePrice] = useState('')

  // Custom Block & Field Creator States
  const [newBlockTitle, setNewBlockTitle] = useState('')
  const [activeBlockForField, setActiveBlockForField] = useState<string | null>(null)
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>('short_text')
  const [newFieldOptions, setNewFieldOptions] = useState('')

  useEffect(() => {
    loadFormsConfig().then(loaded => {
      setConfig(loaded)
    })
  }, [])

  const handleSaveAll = async (nextConfig?: FormsCustomizationConfig) => {
    const target = nextConfig || config
    await saveFormsConfig(target)
    setSavedToast(true)
    setTimeout(() => setSavedToast(false), 2500)
  }

  const handleResetModule = async () => {
    if (!window.confirm('Deseja restaurar este módulo para a configuração padrão do PodOnly? Os dados já preenchidos nos prontuários antigos continuarão salvos.')) {
      return
    }
    const next = structuredClone(config)
    if (subTab === 'patient') {
      next.patient = structuredClone(DEFAULT_FORMS_CONFIG.patient)
    } else if (subTab === 'consultation') {
      next.consultation = structuredClone(DEFAULT_FORMS_CONFIG.consultation)
    } else {
      next.appointment = structuredClone(DEFAULT_FORMS_CONFIG.appointment)
    }
    setConfig(next)
    await handleSaveAll(next)
  }

  // Selector helpers
  const addStringOption = (list: string[], value: string, updater: (next: string[]) => void, clear: () => void) => {
    const trimmed = value.trim()
    if (!trimmed) return
    if (list.some(item => item.toLowerCase() === trimmed.toLowerCase())) return
    updater([...list, trimmed])
    clear()
  }

  const removeStringOption = (list: string[], itemToRemove: string, updater: (next: string[]) => void) => {
    updater(list.filter(item => item !== itemToRemove))
  }

  // Custom Blocks & Fields helpers
  const handleAddBlock = (targetModule: 'patient' | 'consultation') => {
    const title = newBlockTitle.trim()
    if (!title) return
    const newBlock: CustomBlockDefinition = {
      id: `block_${Date.now()}`,
      title,
      enabled: true,
      fields: []
    }
    setConfig(prev => ({
      ...prev,
      [targetModule]: {
        ...prev[targetModule],
        customBlocks: [...prev[targetModule].customBlocks, newBlock]
      }
    }))
    setNewBlockTitle('')
    setActiveBlockForField(newBlock.id)
  }

  const handleDeleteBlock = (targetModule: 'patient' | 'consultation', blockId: string) => {
    if (!window.confirm('Remover este bloco personalizado do formulário?')) return
    setConfig(prev => ({
      ...prev,
      [targetModule]: {
        ...prev[targetModule],
        customBlocks: prev[targetModule].customBlocks.filter(b => b.id !== blockId)
      }
    }))
  }

  const handleToggleBlock = (targetModule: 'patient' | 'consultation', blockId: string) => {
    setConfig(prev => ({
      ...prev,
      [targetModule]: {
        ...prev[targetModule],
        customBlocks: prev[targetModule].customBlocks.map(b =>
          b.id === blockId ? { ...b, enabled: !b.enabled } : b
        )
      }
    }))
  }

  const handleAddFieldToBlock = (targetModule: 'patient' | 'consultation', blockId: string) => {
    const label = newFieldLabel.trim()
    if (!label) return
    const needsOptions =
      newFieldType === 'single_select' ||
      newFieldType === 'multi_checkbox' ||
      newFieldType === 'yes_no_table'
    const parsedOpts = needsOptions
      ? newFieldOptions
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      : undefined

    if (needsOptions && (!parsedOpts || parsedOpts.length === 0)) {
      alert('Informe pelo menos uma opção separada por vírgula para este tipo de campo.')
      return
    }

    const newField: CustomFieldDefinition = {
      id: `field_${Date.now()}`,
      label,
      type: newFieldType,
      options: parsedOpts,
      enabled: true
    }

    setConfig(prev => ({
      ...prev,
      [targetModule]: {
        ...prev[targetModule],
        customBlocks: prev[targetModule].customBlocks.map(b =>
          b.id === blockId ? { ...b, fields: [...b.fields, newField] } : b
        )
      }
    }))
    setNewFieldLabel('')
    setNewFieldOptions('')
  }

  const handleRemoveFieldFromBlock = (
    targetModule: 'patient' | 'consultation',
    blockId: string,
    fieldId: string
  ) => {
    setConfig(prev => ({
      ...prev,
      [targetModule]: {
        ...prev[targetModule],
        customBlocks: prev[targetModule].customBlocks.map(b =>
          b.id === blockId
            ? { ...b, fields: b.fields.filter(f => f.id !== fieldId) }
            : b
        )
      }
    }))
  }

  const handleAddAppointmentCustomField = () => {
    const label = newFieldLabel.trim()
    if (!label) return
    const needsOptions =
      newFieldType === 'single_select' ||
      newFieldType === 'multi_checkbox' ||
      newFieldType === 'yes_no_table'
    const parsedOpts = needsOptions
      ? newFieldOptions
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      : undefined

    if (needsOptions && (!parsedOpts || parsedOpts.length === 0)) {
      alert('Informe pelo menos uma opção separada por vírgula.')
      return
    }

    const newField: CustomFieldDefinition = {
      id: `appt_field_${Date.now()}`,
      label,
      type: newFieldType,
      options: parsedOpts,
      enabled: true
    }

    setConfig(prev => ({
      ...prev,
      appointment: {
        ...prev.appointment,
        customFields: [...prev.appointment.customFields, newField]
      }
    }))
    setNewFieldLabel('')
    setNewFieldOptions('')
  }

  const renderCustomBlocksManager = (targetModule: 'patient' | 'consultation') => {
    const blocks = config[targetModule].customBlocks

    return (
      <div
        style={{
          marginTop: '1.5rem',
          padding: '1.15rem',
          background: 'rgba(5, 129, 157, 0.03)',
          borderRadius: '12px',
          border: '1px solid rgba(5, 129, 157, 0.16)'
        }}
      >
        <h4
          style={{
            margin: '0 0 0.35rem 0',
            fontSize: '0.95rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}
        >
          <Layers size={17} color="var(--brand-dark)" />
          Blocos & Questionários Personalizados ({blocks.length})
        </h4>
        <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Crie blocos extras (ex: Avaliação Vascular, Teste de Sensibilidade, Hábitos) com campos de texto, listas ou tabelas Sim/Não.
        </p>

        {/* Add New Block Input */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.15rem' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Nome do novo bloco (ex: Avaliação Vascular e Pulsos)..."
            value={newBlockTitle}
            onChange={e => setNewBlockTitle(e.target.value)}
            style={{ flex: 1, fontSize: '0.86rem' }}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleAddBlock(targetModule)}
            style={{ fontSize: '0.82rem', padding: '0.45rem 0.95rem', whiteSpace: 'nowrap' }}
          >
            <Plus size={15} /> Criar Bloco
          </button>
        </div>

        {/* Existing Custom Blocks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {blocks.map(block => (
            <div
              key={block.id}
              style={{
                background: '#ffffff',
                border: '1px solid rgba(5, 129, 157, 0.2)',
                borderRadius: '10px',
                padding: '0.95rem'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem',
                  borderBottom: '1px solid rgba(5, 129, 157, 0.1)',
                  paddingBottom: '0.55rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    {block.title}
                  </strong>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      padding: '0.12rem 0.5rem',
                      borderRadius: '10px',
                      background: block.enabled ? 'rgba(43, 184, 130, 0.12)' : 'rgba(148, 163, 184, 0.15)',
                      color: block.enabled ? 'var(--success-color)' : '#64748b',
                      fontWeight: 600
                    }}
                  >
                    {block.enabled ? 'Ativo' : 'Oculto'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleToggleBlock(targetModule, block.id)}
                    style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                    title={block.enabled ? 'Ocultar bloco' : 'Mostrar bloco'}
                  >
                    {block.enabled ? <EyeOff size={13} /> : <Eye size={13} />}
                    {block.enabled ? 'Ocultar' : 'Exibir'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() =>
                      setActiveBlockForField(activeBlockForField === block.id ? null : block.id)
                    }
                    style={{
                      padding: '0.25rem 0.6rem',
                      fontSize: '0.75rem',
                      color: 'var(--brand-dark)',
                      borderColor: 'rgba(5, 129, 157, 0.3)'
                    }}
                  >
                    <Plus size={13} /> Adicionar Campo
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleDeleteBlock(targetModule, block.id)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      color: 'var(--danger-color)',
                      borderColor: 'rgba(239, 68, 68, 0.3)'
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Fields inside block */}
              {block.fields.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  Nenhum campo neste bloco ainda. Clique em &quot;+ Adicionar Campo&quot;.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  {block.fields.map(f => (
                    <div
                      key={f.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.45rem 0.65rem',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid rgba(5, 129, 157, 0.1)'
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {f.label}
                        </span>
                        <span
                          style={{
                            fontSize: '0.74rem',
                            color: 'var(--brand-dark)',
                            marginLeft: '0.5rem',
                            background: 'rgba(5, 129, 157, 0.08)',
                            padding: '0.1rem 0.45rem',
                            borderRadius: '6px'
                          }}
                        >
                          {FIELD_TYPE_LABELS[f.type]}
                        </span>
                        {f.options && f.options.length > 0 && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                            Opções: {f.options.join(', ')}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFieldFromBlock(targetModule, block.id, f.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--danger-color)',
                          cursor: 'pointer',
                          padding: '0.2rem'
                        }}
                        title="Remover campo"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Field Drawer for this block */}
              {activeBlockForField === block.id && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.85rem',
                    background: 'rgba(5, 129, 157, 0.05)',
                    borderRadius: '8px',
                    border: '1px dashed rgba(5, 129, 157, 0.3)'
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Nome da Pergunta / Campo</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ex: Pulso Pedioso, Sensibilidade..."
                        value={newFieldLabel}
                        onChange={e => setNewFieldLabel(e.target.value)}
                        style={{ fontSize: '0.82rem' }}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Tipo de Resposta</label>
                      <select
                        className="form-control"
                        value={newFieldType}
                        onChange={e => setNewFieldType(e.target.value as CustomFieldType)}
                        style={{ fontSize: '0.82rem' }}
                      >
                        {Object.entries(FIELD_TYPE_LABELS).map(([k, lbl]) => (
                          <option key={k} value={k}>
                            {lbl}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {(newFieldType === 'single_select' ||
                    newFieldType === 'multi_checkbox' ||
                    newFieldType === 'yes_no_table') && (
                    <div style={{ marginBottom: '0.6rem' }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>
                        Opções (separadas por vírgula)
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ex: Normal, Diminuído, Ausente"
                        value={newFieldOptions}
                        onChange={e => setNewFieldOptions(e.target.value)}
                        style={{ fontSize: '0.82rem' }}
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setActiveBlockForField(null)}
                      style={{ fontSize: '0.78rem', padding: '0.3rem 0.7rem' }}
                    >
                      Fechar
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleAddFieldToBlock(targetModule, block.id)}
                      style={{ fontSize: '0.78rem', padding: '0.3rem 0.8rem' }}
                    >
                      <Plus size={13} /> Inserir Campo no Bloco
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Module Selector Sub-tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          background: 'rgba(5, 129, 157, 0.06)',
          padding: '0.35rem',
          borderRadius: '12px',
          border: '1px solid rgba(5, 129, 157, 0.14)'
        }}
      >
        <button
          type="button"
          onClick={() => setSubTab('patient')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.45rem',
            padding: '0.6rem 0.85rem',
            borderRadius: '9px',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            background: subTab === 'patient' ? 'var(--brand-gradient)' : 'transparent',
            color: subTab === 'patient' ? '#ffffff' : 'var(--text-secondary)',
            boxShadow: subTab === 'patient' ? '0 4px 12px rgba(5, 129, 157, 0.25)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <User size={16} /> Ficha do Paciente
        </button>

        <button
          type="button"
          onClick={() => setSubTab('consultation')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.45rem',
            padding: '0.6rem 0.85rem',
            borderRadius: '9px',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            background: subTab === 'consultation' ? 'var(--brand-gradient)' : 'transparent',
            color: subTab === 'consultation' ? '#ffffff' : 'var(--text-secondary)',
            boxShadow: subTab === 'consultation' ? '0 4px 12px rgba(5, 129, 157, 0.25)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <ClipboardList size={16} /> Ficha de Consulta
        </button>

        <button
          type="button"
          onClick={() => setSubTab('appointment')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.45rem',
            padding: '0.6rem 0.85rem',
            borderRadius: '9px',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            background: subTab === 'appointment' ? 'var(--brand-gradient)' : 'transparent',
            color: subTab === 'appointment' ? '#ffffff' : 'var(--text-secondary)',
            boxShadow: subTab === 'appointment' ? '0 4px 12px rgba(5, 129, 157, 0.25)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <Calendar size={16} /> Agendamento
        </button>
      </div>

      {/* TAB 1: PATIENT RECORD CUSTOMIZATION */}
      {subTab === 'patient' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          {/* Protected Core Fields Banner */}
          <div
            style={{
              padding: '0.85rem 1rem',
              background: 'linear-gradient(135deg, rgba(5, 129, 157, 0.08) 0%, rgba(55, 214, 154, 0.08) 100%)',
              border: '1px solid rgba(5, 129, 157, 0.22)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}
          >
            <Lock size={18} color="var(--brand-dark)" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
              <strong>Campos Essenciais de Integração (Protegidos):</strong>{' '}
              <span style={{ color: 'var(--brand-dark)', fontWeight: 600 }}>
                Nome, Sobrenome, Data de Nascimento e Telefone
              </span>{' '}
              são fixos para manter o funcionamento de alertas de aniversário, cálculo de idade e lembretes via WhatsApp.
            </div>
          </div>

          {/* Visibility Toggles for Standard Patient Blocks */}
          <div
            style={{
              padding: '1rem',
              background: '#ffffff',
              border: '1px solid var(--surface-border)',
              borderRadius: '10px'
            }}
          >
            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: 700 }}>
              Campos e Blocos Padrão do Prontuário (Exibir / Ocultar)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              {[
                { key: 'showAddress', label: 'Endereço Residencial' },
                { key: 'showProfession', label: 'Profissão / Ocupação' },
                { key: 'showPracticesSports', label: 'Prática de Atividade Física' },
                { key: 'showPastMedicalHistory', label: 'Histórico Médico Pregresso' },
                { key: 'showMedications', label: 'Medicamentos em Uso' },
                { key: 'showMedicalProblems', label: 'Grade de Problemas Médicos (Sim/Não)' },
                { key: 'showShoeType', label: 'Seletor de Tipo de Calçado' },
                { key: 'showNailShape', label: 'Seletor de Formato de Unha' }
              ].map(item => {
                const checked = Boolean((config.patient as any)[item.key])
                return (
                  <label
                    key={item.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.85rem',
                      padding: '0.45rem 0.65rem',
                      background: checked ? 'rgba(5, 129, 157, 0.05)' : '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid rgba(5, 129, 157, 0.12)',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e =>
                        setConfig(prev => ({
                          ...prev,
                          patient: { ...prev.patient, [item.key]: e.target.checked }
                        }))
                      }
                    />
                    <span>{item.label}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Selector Options Editor: Medical Problems */}
          <div
            style={{
              padding: '1rem',
              background: '#ffffff',
              border: '1px solid var(--surface-border)',
              borderRadius: '10px'
            }}
          >
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ListChecks size={16} color="var(--brand-dark)" />
              Itens de &quot;Problemas Médicos (Sim/Não)&quot; ({config.patient.medicalProblemsOptions.length})
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
              {config.patient.medicalProblemsOptions.map(opt => (
                <span
                  key={opt}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.25rem 0.6rem',
                    background: 'rgba(5, 129, 157, 0.08)',
                    border: '1px solid rgba(5, 129, 157, 0.2)',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--brand-dark)'
                  }}
                >
                  {opt}
                  <button
                    type="button"
                    onClick={() =>
                      removeStringOption(config.patient.medicalProblemsOptions, opt, next =>
                        setConfig(prev => ({
                          ...prev,
                          patient: { ...prev.patient, medicalProblemsOptions: next }
                        }))
                      )
                    }
                    style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', padding: 0 }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Adicionar condição (ex: Hipotireoidismo, Gestante, Anticoagulante)..."
                value={newMedProb}
                onChange={e => setNewMedProb(e.target.value)}
                style={{ fontSize: '0.84rem', flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() =>
                  addStringOption(
                    config.patient.medicalProblemsOptions,
                    newMedProb,
                    next => setConfig(prev => ({ ...prev, patient: { ...prev.patient, medicalProblemsOptions: next } })),
                    () => setNewMedProb('')
                  )
                }
                style={{ fontSize: '0.8rem' }}
              >
                <Plus size={14} /> Adicionar
              </button>
            </div>
          </div>

          {/* Selector Options Editor: Shoe Type & Nail Shape */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div
              style={{
                padding: '1rem',
                background: '#ffffff',
                border: '1px solid var(--surface-border)',
                borderRadius: '10px'
              }}
            >
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.88rem', fontWeight: 700 }}>
                Opções de Tipo de Calçado ({config.patient.shoeTypeOptions.length})
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.65rem' }}>
                {config.patient.shoeTypeOptions.map(opt => (
                  <span
                    key={opt}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.2rem 0.55rem',
                      background: 'rgba(5, 129, 157, 0.08)',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: 'var(--brand-dark)'
                    }}
                  >
                    {opt}
                    <button
                      type="button"
                      onClick={() =>
                        removeStringOption(config.patient.shoeTypeOptions, opt, next =>
                          setConfig(prev => ({ ...prev, patient: { ...prev.patient, shoeTypeOptions: next } }))
                        )
                      }
                      style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer' }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: Esportivo, Salto, Botina..."
                  value={newShoeType}
                  onChange={e => setNewShoeType(e.target.value)}
                  style={{ fontSize: '0.8rem', flex: 1 }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() =>
                    addStringOption(
                      config.patient.shoeTypeOptions,
                      newShoeType,
                      next => setConfig(prev => ({ ...prev, patient: { ...prev.patient, shoeTypeOptions: next } })),
                      () => setNewShoeType('')
                    )
                  }
                  style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
                >
                  +
                </button>
              </div>
            </div>

            <div
              style={{
                padding: '1rem',
                background: '#ffffff',
                border: '1px solid var(--surface-border)',
                borderRadius: '10px'
              }}
            >
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.88rem', fontWeight: 700 }}>
                Opções de Formato de Unha ({config.patient.nailShapeOptions.length})
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.65rem' }}>
                {config.patient.nailShapeOptions.map(opt => (
                  <span
                    key={opt}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.2rem 0.55rem',
                      background: 'rgba(5, 129, 157, 0.08)',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: 'var(--brand-dark)'
                    }}
                  >
                    {opt}
                    <button
                      type="button"
                      onClick={() =>
                        removeStringOption(config.patient.nailShapeOptions, opt, next =>
                          setConfig(prev => ({ ...prev, patient: { ...prev.patient, nailShapeOptions: next } }))
                        )
                      }
                      style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer' }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: Pinça, Involuta..."
                  value={newNailShape}
                  onChange={e => setNewNailShape(e.target.value)}
                  style={{ fontSize: '0.8rem', flex: 1 }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() =>
                    addStringOption(
                      config.patient.nailShapeOptions,
                      newNailShape,
                      next => setConfig(prev => ({ ...prev, patient: { ...prev.patient, nailShapeOptions: next } })),
                      () => setNewNailShape('')
                    )
                  }
                  style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Custom Blocks for Patient */}
          {renderCustomBlocksManager('patient')}
        </div>
      )}

      {/* TAB 2: CONSULTATION FORM CUSTOMIZATION */}
      {subTab === 'consultation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          {/* Protected Core Fields Banner */}
          <div
            style={{
              padding: '0.85rem 1rem',
              background: 'linear-gradient(135deg, rgba(5, 129, 157, 0.08) 0%, rgba(55, 214, 154, 0.08) 100%)',
              border: '1px solid rgba(5, 129, 157, 0.22)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}
          >
            <Lock size={18} color="var(--brand-dark)" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
              <strong>Campos Essenciais da Consulta (Protegidos):</strong>{' '}
              <span style={{ color: 'var(--brand-dark)', fontWeight: 600 }}>
                Data da Consulta, Queixa Principal, Mapa do Pé e Procedimento Realizado
              </span>{' '}
              são mantidos ativos para preservar a linha do tempo, comparativos e alertas automáticos de retorno.
            </div>
          </div>

          {/* Visibility Toggles for Consultation Sections */}
          <div
            style={{
              padding: '1rem',
              background: '#ffffff',
              border: '1px solid var(--surface-border)',
              borderRadius: '10px'
            }}
          >
            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: 700 }}>
              Seções da Ficha de Consulta (Exibir / Ocultar)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              {[
                { key: 'showDermatologicalPathologies', label: 'Avaliação Podológica (Patologias Dermatológicas)' },
                { key: 'showFootSpecificHistory', label: 'Histórico Específico dos Pés' },
                { key: 'showClinicalPrescription', label: 'Prescrição Clínica / Recomendações Home Care' },
                { key: 'showGeneralObservations', label: 'Observações Gerais da Consulta' }
              ].map(item => {
                const checked = Boolean((config.consultation as any)[item.key])
                return (
                  <label
                    key={item.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.85rem',
                      padding: '0.45rem 0.65rem',
                      background: checked ? 'rgba(5, 129, 157, 0.05)' : '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid rgba(5, 129, 157, 0.12)',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e =>
                        setConfig(prev => ({
                          ...prev,
                          consultation: { ...prev.consultation, [item.key]: e.target.checked }
                        }))
                      }
                    />
                    <span>{item.label}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Selector Options Editor: Dermatological Pathologies */}
          <div
            style={{
              padding: '1rem',
              background: '#ffffff',
              border: '1px solid var(--surface-border)',
              borderRadius: '10px'
            }}
          >
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ListChecks size={16} color="var(--brand-dark)" />
              Opções de &quot;Patologia Dermatológica Presente&quot; ({config.consultation.dermatologicalPathologiesOptions.length})
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
              {config.consultation.dermatologicalPathologiesOptions.map(opt => (
                <span
                  key={opt}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.25rem 0.6rem',
                    background: 'rgba(5, 129, 157, 0.08)',
                    border: '1px solid rgba(5, 129, 157, 0.2)',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--brand-dark)'
                  }}
                >
                  {opt}
                  <button
                    type="button"
                    onClick={() =>
                      removeStringOption(config.consultation.dermatologicalPathologiesOptions, opt, next =>
                        setConfig(prev => ({
                          ...prev,
                          consultation: { ...prev.consultation, dermatologicalPathologiesOptions: next }
                        }))
                      )
                    }
                    style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', padding: 0 }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Adicionar patologia (ex: Verruga Plantar, Fissura Calcânea, Tinea Pedis)..."
                value={newDermPathology}
                onChange={e => setNewDermPathology(e.target.value)}
                style={{ fontSize: '0.84rem', flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() =>
                  addStringOption(
                    config.consultation.dermatologicalPathologiesOptions,
                    newDermPathology,
                    next =>
                      setConfig(prev => ({
                        ...prev,
                        consultation: { ...prev.consultation, dermatologicalPathologiesOptions: next }
                      })),
                    () => setNewDermPathology('')
                  )
                }
                style={{ fontSize: '0.8rem' }}
              >
                <Plus size={14} /> Adicionar
              </button>
            </div>
          </div>

          {/* Custom Blocks for Consultation */}
          {renderCustomBlocksManager('consultation')}
        </div>
      )}

      {/* TAB 3: APPOINTMENT CUSTOMIZATION */}
      {subTab === 'appointment' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          {/* Protected Core Fields Banner */}
          <div
            style={{
              padding: '0.85rem 1rem',
              background: 'linear-gradient(135deg, rgba(5, 129, 157, 0.08) 0%, rgba(55, 214, 154, 0.08) 100%)',
              border: '1px solid rgba(5, 129, 157, 0.22)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}
          >
            <Lock size={18} color="var(--brand-dark)" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
              <strong>Campos Essenciais do Agendamento (Protegidos):</strong>{' '}
              <span style={{ color: 'var(--brand-dark)', fontWeight: 600 }}>
                Paciente, Data, Horário (Início/Fim), Status, Tipo de Serviço e Valor
              </span>{' '}
              são protegidos para garantir a sincronização com o Google Agenda e o lançamento automático no Financeiro.
            </div>
          </div>

          {/* Pre-configured Service Catalog with Default Price */}
          <div
            style={{
              padding: '1rem',
              background: '#ffffff',
              border: '1px solid var(--surface-border)',
              borderRadius: '10px'
            }}
          >
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: 700 }}>
              Catálogo de Serviços Rápidos da Agenda ({config.appointment.serviceOptions.length})
            </h4>
            <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Ao selecionar um serviço na criação do agendamento, o valor padrão será sugerido automaticamente.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.85rem' }}>
              {config.appointment.serviceOptions.map((srv, idx) => (
                <div
                  key={`${srv.name}_${idx}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.45rem 0.75rem',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid rgba(5, 129, 157, 0.12)'
                  }}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {srv.name}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {srv.defaultPrice !== undefined && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--brand-dark)', fontWeight: 700 }}>
                        R$ {Number(srv.defaultPrice).toFixed(2)}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setConfig(prev => ({
                          ...prev,
                          appointment: {
                            ...prev.appointment,
                            serviceOptions: prev.appointment.serviceOptions.filter((_, i) => i !== idx)
                          }
                        }))
                      }
                      style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Nome do Serviço (ex: Reflexologia Podal)..."
                value={newServiceName}
                onChange={e => setNewServiceName(e.target.value)}
                style={{ flex: 2, fontSize: '0.84rem' }}
              />
              <input
                type="number"
                step="0.01"
                className="form-control"
                placeholder="Valor R$ (opcional)"
                value={newServicePrice}
                onChange={e => setNewServicePrice(e.target.value)}
                style={{ flex: 1, fontSize: '0.84rem' }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  const trimmed = newServiceName.trim()
                  if (!trimmed) return
                  const priceNum = newServicePrice ? parseFloat(newServicePrice) : undefined
                  setConfig(prev => ({
                    ...prev,
                    appointment: {
                      ...prev.appointment,
                      serviceOptions: [
                        ...prev.appointment.serviceOptions,
                        { name: trimmed, defaultPrice: priceNum }
                      ]
                    }
                  }))
                  setNewServiceName('')
                  setNewServicePrice('')
                }}
                style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}
              >
                <Plus size={14} /> Adicionar
              </button>
            </div>
          </div>

          {/* Custom Appointment Fields */}
          <div
            style={{
              padding: '1rem',
              background: '#ffffff',
              border: '1px solid var(--surface-border)',
              borderRadius: '10px'
            }}
          >
            <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.9rem', fontWeight: 700 }}>
              Campos Extras no Modal de Agendamento ({config.appointment.customFields.length})
            </h4>
            <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Adicione seletores ou campos extras para suas marcações (ex: Sala/Cabine, Convênio, Profissional Responsável).
            </p>

            {config.appointment.customFields.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.85rem' }}>
                {config.appointment.customFields.map(f => (
                  <div
                    key={f.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.45rem 0.75rem',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid rgba(5, 129, 157, 0.12)'
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{f.label}</span>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          color: 'var(--brand-dark)',
                          marginLeft: '0.5rem',
                          background: 'rgba(5, 129, 157, 0.08)',
                          padding: '0.1rem 0.45rem',
                          borderRadius: '6px'
                        }}
                      >
                        {FIELD_TYPE_LABELS[f.type]}
                      </span>
                      {f.options && f.options.length > 0 && (
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                          Opções: {f.options.join(', ')}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setConfig(prev => ({
                          ...prev,
                          appointment: {
                            ...prev.appointment,
                            customFields: prev.appointment.customFields.filter(item => item.id !== f.id)
                          }
                        }))
                      }
                      style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div
              style={{
                padding: '0.85rem',
                background: 'rgba(5, 129, 157, 0.04)',
                borderRadius: '8px',
                border: '1px dashed rgba(5, 129, 157, 0.25)'
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Nome do Campo Extra</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ex: Sala / Cabine, Convênio..."
                    value={newFieldLabel}
                    onChange={e => setNewFieldLabel(e.target.value)}
                    style={{ fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Tipo de Campo</label>
                  <select
                    className="form-control"
                    value={newFieldType}
                    onChange={e => setNewFieldType(e.target.value as CustomFieldType)}
                    style={{ fontSize: '0.82rem' }}
                  >
                    {Object.entries(FIELD_TYPE_LABELS).map(([k, lbl]) => (
                      <option key={k} value={k}>
                        {lbl}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(newFieldType === 'single_select' ||
                newFieldType === 'multi_checkbox' ||
                newFieldType === 'yes_no_table') && (
                <div style={{ marginBottom: '0.6rem' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>
                    Opções (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ex: Cabine 1, Cabine 2, Domiciliar"
                    value={newFieldOptions}
                    onChange={e => setNewFieldOptions(e.target.value)}
                    style={{ fontSize: '0.82rem' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAddAppointmentCustomField}
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}
                >
                  <Plus size={14} /> Adicionar Campo à Agenda
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '0.85rem',
          borderTop: '1px solid var(--surface-border)',
          marginTop: '0.5rem'
        }}
      >
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleResetModule}
          style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <RotateCcw size={14} /> Restaurar Padrão deste Módulo
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {savedToast && (
            <span
              style={{
                color: 'var(--success-color)',
                fontSize: '0.84rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <CheckCircle2 size={16} /> Estrutura salva com sucesso!
            </span>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleSaveAll()}
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
          >
            <Save size={16} /> Salvar Estrutura de Formulários
          </button>
        </div>
      </div>
    </div>
  )
}
