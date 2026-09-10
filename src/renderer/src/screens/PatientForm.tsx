import React, { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate } from 'react-router-dom'
import { Save, X, Activity, ClipboardList, AlertCircle, Map, User, FileText, Settings, Plus, Edit2, Trash2, RotateCcw, Copy, History, Sparkles, Printer, Sliders, Check } from 'lucide-react'
import FootMapCanvas from '../components/FootMapCanvas'
import FeetCanvasBuilderModal from '../components/FeetCanvasBuilderModal'
import { calculateAge } from '../utils/ageHelper'
import type { Patient } from '../../../shared/types'
import PrintDocumentModal from '../components/PrintDocumentModal'

export interface HomeCareTemplate {
  id: string
  title: string
  content: string
}

const DEFAULT_HOME_CARE_TEMPLATES: HomeCareTemplate[] = [
  {
    id: 'pe_diabetico',
    title: 'Pé Diabético',
    content: "Recomendações Home Care (Pé Diabético):\n- Inspeção diária dos pés.\n- Secar bem entre os dedos após o banho.\n- Uso de calçados confortáveis e sem costuras internas.\n- Hidratação diária, evitando a região entre os dedos.\n- Não andar descalço.\n- Cortar as unhas retas."
  },
  {
    id: 'higienizacao_calcados',
    title: 'Higienização Calçados',
    content: "Recomendações Home Care (Higienização de Calçados):\n- Limpar os calçados com pano úmido e sabão neutro.\n- Deixar secar em local arejado e à sombra.\n- Alternar o uso dos calçados, não usando o mesmo par por dias seguidos.\n- Utilizar talco ou spray antisséptico para prevenir odores e fungos."
  },
  {
    id: 'onicocriptose',
    title: 'Onicocriptose',
    content: "Recomendações Home Care (Onicocriptose):\n- Evitar o uso de calçados de bico fino ou muito apertados.\n- Cortar as unhas de forma reta, sem arredondar os cantos.\n- Em caso de dor ou inflamação, retornar ao podólogo.\n- Não tentar desencravar em casa."
  }
]

export const DEFAULT_PROCEDURE_OPTIONS: string[] = [
  'Podoprofilaxia',
  'Laser PDT',
  'Laser',
  'Desbaste plantar',
  'Desbaste ungueal',
  'Retirada de espícula',
  'Retirada de onicofose',
  'Curativo'
]

export default function PatientForm() {
  const { id, formId } = useParams<{ id: string; formId?: string }>()
  const navigate = useNavigate()
  const isEditing = Boolean(formId)

  const [form, setForm] = useState({
    visit_date: new Date().toISOString().split('T')[0],
    chief_complaint: '',
    clinical_prescription: '',
    general_observations: '',
    procedures_performed: '',
    foot_specific_history: '',
    foot_map_image: '',
    dermatological_pathologies: '[]'
  })

  const [error, setError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [activeSection, setActiveSection] = useState('dados')
  const [patient, setPatient] = useState<Patient | null>(null)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [showFeetBuilderModal, setShowFeetBuilderModal] = useState(false)

  const sections = [
    { id: 'dados', title: 'Dados da Consulta', icon: User },
    { id: 'avaliacao', title: 'Avaliação Podológica', icon: Activity },
    { id: 'historico', title: 'Histórico', icon: FileText },
    { id: 'mapa', title: 'Mapa do Pé', icon: Map },
    { id: 'conclusao', title: 'Conclusão', icon: ClipboardList }
  ]

  const sectionRefs = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    window.scrollTo(0, 0)
    const appContent = document.querySelector('.app-content')
    if (appContent) {
      appContent.scrollTop = 0
    }
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      {
        root: null,
        rootMargin: '-20% 0px -60% 0px', 
        threshold: 0
      }
    )

    sectionRefs.current.forEach(ref => {
      if (ref) observer.observe(ref)
    })

    return () => observer.disconnect()
  }, [])

  const [previousForm, setPreviousForm] = useState<any | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!id) return;
        const patientId = parseInt(id, 10);

        const patientData = await window.api.getPatient(patientId)
        setPatient(patientData)

        // Fetch patient's previous consultations
        const formsData = await window.api.getPatientForms(patientId)
        if (formsData && formsData.length > 0) {
          const otherForms = isEditing && formId 
            ? formsData.filter(f => f.id !== parseInt(formId, 10)) 
            : formsData
          if (otherForms.length > 0) {
            const sorted = [...otherForms].sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime())
            setPreviousForm(sorted[0])
          }
        }

        if (isEditing && formId) {
          const formData = await window.api.getForm(parseInt(formId, 10))
          setForm({
            visit_date: formData.visit_date.split('T')[0],
            chief_complaint: formData.chief_complaint || '',
            clinical_prescription: formData.clinical_prescription || '',
            general_observations: formData.general_observations || '',
            procedures_performed: formData.procedures_performed || '',
            foot_specific_history: formData.foot_specific_history || '',
            foot_map_image: formData.foot_map_image || '',
            dermatological_pathologies: formData.dermatological_pathologies || '[]'
          })
        }
      } catch (err: unknown) {
        const errorObj = err as { message?: string } | null
        setError(errorObj?.message || 'Falha ao carregar dados da ficha.')
      }

    }
    loadData()
  }, [id, formId, isEditing])

  const handleCopyPreviousForm = () => {
    if (!previousForm) return
    setForm(prev => ({
      ...prev,
      chief_complaint: previousForm.chief_complaint || '',
      clinical_prescription: previousForm.clinical_prescription || '',
      general_observations: previousForm.general_observations || '',
      procedures_performed: previousForm.procedures_performed || '',
      foot_specific_history: previousForm.foot_specific_history || '',
      foot_map_image: previousForm.foot_map_image || '',
      dermatological_pathologies: previousForm.dermatological_pathologies || '[]'
    }))
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 3500)
  }

  // Home Care Prescription Templates state
  const [templates, setTemplates] = useState<HomeCareTemplate[]>(DEFAULT_HOME_CARE_TEMPLATES)
  const [showManageModal, setShowManageModal] = useState(false)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [templateTitle, setTemplateTitle] = useState('')
  const [templateContent, setTemplateContent] = useState('')

  // Procedure Options state
  const [procedureOptions, setProcedureOptions] = useState<string[]>(DEFAULT_PROCEDURE_OPTIONS)
  const [showManageProceduresModal, setShowManageProceduresModal] = useState(false)
  const [newProcedureInput, setNewProcedureInput] = useState('')

  useEffect(() => {
    const loadProcedures = async () => {
      try {
        const saved = await window.api.getSetting('custom_procedure_options')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProcedureOptions(parsed)
          }
        }
      } catch (err) {
        console.error('Erro ao carregar opções de procedimentos:', err)
      }
    }
    loadProcedures()
  }, [])

  const handleSaveProcedureOptions = async (updatedList: string[]) => {
    setProcedureOptions(updatedList)
    try {
      await window.api.setSetting('custom_procedure_options', JSON.stringify(updatedList))
    } catch (err) {
      console.error('Erro ao salvar opções de procedimentos:', err)
    }
  }

  const handleToggleProcedure = (proc: string) => {
    const currentText = form.procedures_performed || ''
    const items = currentText
      .split(/[,;\n]+/)
      .map(s => s.trim())
      .filter(Boolean)

    const lowerProc = proc.trim().toLowerCase()
    const existingIdx = items.findIndex(item => item.toLowerCase() === lowerProc)

    let newItems: string[]
    if (existingIdx >= 0) {
      newItems = items.filter((_, idx) => idx !== existingIdx)
    } else {
      newItems = [...items, proc]
    }

    setForm(prev => ({
      ...prev,
      procedures_performed: newItems.join(', ')
    }))
  }

  const isProcSelected = (proc: string) => {
    if (!form.procedures_performed) return false
    const items = form.procedures_performed
      .split(/[,;\n]+/)
      .map(s => s.trim().toLowerCase())
    return items.includes(proc.trim().toLowerCase())
  }

  const handleAddProcedureOption = () => {
    const trimmed = newProcedureInput.trim()
    if (!trimmed) return
    if (procedureOptions.some(p => p.toLowerCase() === trimmed.toLowerCase())) {
      alert('Este procedimento já está na lista.')
      return
    }
    const updated = [...procedureOptions, trimmed]
    handleSaveProcedureOptions(updated)
    setNewProcedureInput('')
  }

  const handleDeleteProcedureOption = (procToDelete: string) => {
    const updated = procedureOptions.filter(p => p !== procToDelete)
    handleSaveProcedureOptions(updated)
  }

  const handleResetProcedureOptions = () => {
    if (window.confirm('Deseja restaurar a lista padrão de procedimentos realizados?')) {
      handleSaveProcedureOptions(DEFAULT_PROCEDURE_OPTIONS)
    }
  }

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const saved = await window.api.getSetting('home_care_templates')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTemplates(parsed)
          }
        }
      } catch (err) {
        console.error('Erro ao carregar modelos de prescrição:', err)
      }
    }
    loadTemplates()
  }, [])

  const handleSaveTemplateList = async (updatedList: HomeCareTemplate[]) => {
    setTemplates(updatedList)
    try {
      await window.api.setSetting('home_care_templates', JSON.stringify(updatedList))
    } catch (err) {
      console.error('Erro ao salvar lista de modelos:', err)
    }
  }

  const handleSaveSingleTemplate = () => {
    if (!templateTitle.trim() || !templateContent.trim()) {
      alert('Por favor, preencha o título e o conteúdo do modelo.')
      return
    }

    if (editingTemplateId) {
      const updated = templates.map(t => t.id === editingTemplateId ? { ...t, title: templateTitle, content: templateContent } : t)
      handleSaveTemplateList(updated)
    } else {
      const newTemplate: HomeCareTemplate = {
        id: `tpl_${Date.now()}`,
        title: templateTitle.trim(),
        content: templateContent.trim()
      }
      handleSaveTemplateList([...templates, newTemplate])
    }

    setEditingTemplateId(null)
    setTemplateTitle('')
    setTemplateContent('')
  }

  const handleEditTemplate = (tpl: HomeCareTemplate) => {
    setEditingTemplateId(tpl.id)
    setTemplateTitle(tpl.title)
    setTemplateContent(tpl.content)
  }

  const handleDeleteTemplate = (idToDelete: string) => {
    if (window.confirm('Tem certeza que deseja excluir este modelo?')) {
      const updated = templates.filter(t => t.id !== idToDelete)
      handleSaveTemplateList(updated)
      if (editingTemplateId === idToDelete) {
        setEditingTemplateId(null)
        setTemplateTitle('')
        setTemplateContent('')
      }
    }
  }

  const handleResetTemplates = () => {
    if (window.confirm('Deseja restaurar os modelos padrão?')) {
      handleSaveTemplateList(DEFAULT_HOME_CARE_TEMPLATES)
      setEditingTemplateId(null)
      setTemplateTitle('')
      setTemplateContent('')
    }
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleCheckboxArrayChange = (field: 'dermatological_pathologies', value: string) => {
    try {
      const current: string[] = JSON.parse(form[field])
      if (current.includes(value)) {
        setForm({ ...form, [field]: JSON.stringify(current.filter(i => i !== value)) })
      } else {
        setForm({ ...form, [field]: JSON.stringify([...current, value]) })
      }
    } catch {
      setForm({ ...form, [field]: JSON.stringify([value]) })
    }
  }

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveSection(sectionId)
    }
  }

  const handleAppendTemplate = (text: string) => {
    setForm(prev => ({
      ...prev,
      clinical_prescription: prev.clinical_prescription 
        ? `${prev.clinical_prescription}\n\n${text}` 
        : text
    }))
  }

  const validate = () => {
    if (!form.visit_date) return 'Data da Consulta é obrigatória.'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    if (!id) return;

    try {
      const payload = {
        ...form,
        visit_date: new Date(form.visit_date).toISOString()
      }

      if (isEditing && formId) {
        await window.api.updatePatientForm(parseInt(formId, 10), payload)
      } else {
        await window.api.createPatientForm(parseInt(id, 10), payload)
      }
      setSaveSuccess(true)
      setTimeout(() => {
        navigate(`/patient/${id}`)
      }, 1500)
    } catch (err: unknown) {
      const errorObj = err as { message?: string } | null
      setError(errorObj?.message || 'Falha ao salvar a ficha.')
    }

  }

  return (
    <div>
      <div className="glass-card" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
            <ClipboardList color="var(--accent-color)" /> 
            {isEditing ? 'Visualizar / Editar Consulta' : 'Nova Consulta'}
            {patient && (
              <span style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', fontWeight: 'normal', marginLeft: '0.25rem' }}>
                — {patient.first_name} {patient.last_name}
                {patient.date_of_birth && calculateAge(patient.date_of_birth) !== null && (
                  ` (${calculateAge(patient.date_of_birth)} ${calculateAge(patient.date_of_birth) === 1 ? 'ano' : 'anos'})`
                )}
              </span>
            )}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {patient && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowPrintModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-color)', borderColor: 'var(--accent-color)' }}
              title="Imprimir ou salvar Ficha / Cuidados em PDF"
            >
              <Printer size={16} /> Imprimir / PDF
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={() => navigate(`/patient/${id}`)}>
            <X size={18} /> Cancelar
          </button>
        </div>
      </div>

      {error && (
        <div style={{ 
          padding: '1rem', 
          backgroundColor: 'rgba(239, 68, 68, 0.1)', 
          border: '1px solid var(--danger-color)', 
          borderRadius: '8px',
          color: '#fca5a5',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {saveSuccess && createPortal(
        <div style={{ 
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          padding: '1rem 1.5rem', 
          backgroundColor: 'var(--success-color)', 
          border: '1px solid rgba(255,255,255,0.3)', 
          borderRadius: '12px',
          color: 'white',
          boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          zIndex: 9999,
          animation: 'pageFadeInUp 0.3s ease-out'
        }}>
          Consulta salva com sucesso.
        </div>,
        document.body
      )}

      {/* 1-Click Copy Previous Visit Banner */}
      {!isEditing && previousForm && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem 1.25rem',
          background: 'linear-gradient(135deg, rgba(14, 145, 168, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)',
          border: '1px solid rgba(14, 145, 168, 0.25)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
          boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              background: 'var(--accent-color)',
              color: 'white',
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <History size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Consulta Anterior Encontrada
                <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-secondary)', background: 'white', padding: '0.15rem 0.6rem', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
                  {new Date(previousForm.visit_date).toLocaleDateString()}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Copie os procedimentos, histórico, prescrições e anotações do mapa do pé da última visita para agilizar o atendimento.
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCopyPreviousForm}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(14, 145, 168, 0.25)'
            }}
          >
            <Copy size={16} /> Copiar da Consulta Anterior
          </button>
        </div>
      )}

      {/* Copy Success Toast */}
      {copySuccess && createPortal(
        <div style={{ 
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          padding: '1rem 1.5rem', 
          backgroundColor: 'var(--accent-color)', 
          border: '1px solid rgba(255,255,255,0.3)', 
          borderRadius: '12px',
          color: 'white',
          boxShadow: '0 10px 25px rgba(14, 145, 168, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          zIndex: 9999,
          animation: 'pageFadeInUp 0.3s ease-out'
        }}>
          <Sparkles size={18} /> Dados e mapa do pé copiados da consulta de {new Date(previousForm.visit_date).toLocaleDateString()}!
        </div>,
        document.body
      )}

      <div className="form-layout-container">
        <aside className="form-sidebar glass-card">
          {sections.map(section => {
            const Icon = section.icon
            return (
              <button
                key={section.id}
                type="button"
                className={`form-sidebar-link ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => scrollToSection(section.id)}
              >
                <Icon size={18} />
                {section.title}
              </button>
            )
          })}
        </aside>

        <div className="form-main-content">
          <form 
            onSubmit={handleSubmit} 
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.target as HTMLElement).tagName.toLowerCase() !== 'textarea') {
                e.preventDefault();
              }
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
          >
            
            <section id="dados" ref={el => { sectionRefs.current[0] = el; }} className="glass-card" style={{ scrollMarginTop: '6rem' }}>
              <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User color="var(--success-color)" size={20} /> Dados da Consulta
              </h3>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Data da Consulta *</label>
                  <input type="date" className="form-control" name="visit_date" value={form.visit_date} onChange={handleFormChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Queixa Principal</label>
                  <input type="text" className="form-control" name="chief_complaint" value={form.chief_complaint} onChange={handleFormChange} />
                </div>
              </div>
            </section>

            <section id="avaliacao" ref={el => { sectionRefs.current[1] = el; }} className="glass-card" style={{ scrollMarginTop: '6rem' }}>
              <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity color="var(--success-color)" size={20} /> Avaliação Podológica
              </h3>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Patologia Dermatológica Presente</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {[
                      'Bromidrose', 'Desidrose', 'Exostose', 'Hiperidrose', 
                      'Hiperqueratose', 'Micose Interdigital', 'Micose Plantar', 'Onicocriptose', 
                      'Onicofose', 'Onicomicose', 'Psoríase', 'Ressecamento'
                    ].map(item => {
                      let isChecked = false
                      try {
                        isChecked = JSON.parse(form.dermatological_pathologies).includes(item)
                      } catch {}
                      return (
                        <label key={item} style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input type="checkbox" checked={isChecked} onChange={() => handleCheckboxArrayChange('dermatological_pathologies', item)} /> {item}
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>
            </section>

            <section id="historico" ref={el => { sectionRefs.current[2] = el; }} className="glass-card" style={{ scrollMarginTop: '6rem' }}>
              <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText color="var(--success-color)" size={20} /> Histórico Específico dos Pés
              </h3>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Cirurgias prévias nos pés, neuropatia, úlceras, localização da dor, duração, tratamentos anteriores, etc.</label>
                <textarea className="form-control" name="foot_specific_history" value={form.foot_specific_history} onChange={handleFormChange} style={{ minHeight: '150px' }} />
              </div>
            </section>

            <section id="mapa" ref={el => { sectionRefs.current[3] = el; }} className="glass-card" style={{ scrollMarginTop: '6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <Map color="var(--success-color)" size={20} /> Mapa do Pé (Anotações Clínicas)
                </h3>
                <button
                  type="button"
                  onClick={() => setShowFeetBuilderModal(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-color)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                  title="Personalizar Modelo dos Pés, Cores e Legendas"
                >
                  <Sliders size={13} /> Personalizar Diagrama & Legenda
                </button>
              </div>
              <div style={{ marginBottom: 0 }}>
                <FootMapCanvas 
                  initialAnnotation={form.foot_map_image}
                  onSaveAnnotation={(base64) => setForm({ ...form, foot_map_image: base64 })} 
                />
              </div>
            </section>

            <section id="conclusao" ref={el => { sectionRefs.current[4] = el; }} className="glass-card" style={{ scrollMarginTop: '6rem' }}>
              <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ClipboardList color="var(--success-color)" size={20} /> Conclusão
              </h3>
              
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <label className="form-label" style={{ margin: 0 }}>Procedimento Realizado</label>
                  <button
                    type="button"
                    onClick={() => setShowManageProceduresModal(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-color)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <Settings size={13} /> Gerenciar Opções
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                  {procedureOptions.map(proc => {
                    const selected = isProcSelected(proc)
                    return (
                      <button
                        key={proc}
                        type="button"
                        onClick={() => handleToggleProcedure(proc)}
                        style={{
                          background: selected ? 'var(--accent-color)' : 'rgba(14, 145, 168, 0.08)',
                          border: selected ? '1px solid var(--accent-color)' : '1px solid rgba(14, 145, 168, 0.2)',
                          color: selected ? '#ffffff' : 'var(--accent-color)',
                          fontSize: '0.78rem',
                          fontWeight: selected ? 600 : 500,
                          padding: '0.25rem 0.65rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          boxShadow: selected ? '0 2px 4px rgba(14, 145, 168, 0.25)' : 'none'
                        }}
                        title={selected ? `Remover ${proc}` : `Adicionar ${proc}`}
                      >
                        {selected ? <Check size={13} /> : <Plus size={13} />} {proc}
                      </button>
                    )
                  })}
                </div>

                <textarea
                  className="form-control"
                  name="procedures_performed"
                  value={form.procedures_performed}
                  onChange={handleFormChange}
                  placeholder="Selecione os procedimentos acima ou digite observações personalizadas..."
                  style={{ minHeight: '90px' }}
                />
              </div>
              <div className="grid-2">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <label className="form-label" style={{ margin: 0 }}>Prescrição clínica / Home Care</label>
                    <button
                      type="button"
                      onClick={() => setShowManageModal(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-color)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      <Settings size={13} /> Gerenciar Modelos
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    {templates.map(tpl => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => handleAppendTemplate(tpl.content)}
                        style={{
                          background: 'rgba(14, 145, 168, 0.08)',
                          border: '1px solid rgba(14, 145, 168, 0.2)',
                          color: 'var(--accent-color)',
                          fontSize: '0.78rem',
                          fontWeight: 500,
                          padding: '0.25rem 0.6rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                        title={`Inserir modelo: ${tpl.title}`}
                      >
                        + {tpl.title}
                      </button>
                    ))}
                  </div>
                  <textarea className="form-control" name="clinical_prescription" value={form.clinical_prescription} onChange={handleFormChange} style={{ minHeight: '100px' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Observações gerais</label>
                  <textarea className="form-control" name="general_observations" value={form.general_observations} onChange={handleFormChange} style={{ minHeight: '100px' }} />
                </div>
              </div>
              
              <div className="form-actions" style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--surface-border)', paddingTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => navigate(`/patient/${id}`)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save size={18} /> {isEditing ? 'Atualizar Consulta' : 'Salvar Consulta'}
                </button>
              </div>
            </section>

          </form>
        </div>
      </div>

      {/* Interactive Prescription Template Manager Modal */}
      {showManageModal && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          backdropFilter: 'blur(5px)'
        }}>
          <div className="glass-card" style={{ width: '620px', maxWidth: '92vw', background: 'white', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', animation: 'pageFadeInUp 0.25s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Settings size={20} color="var(--accent-color)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Gerenciar Modelos de Prescrição (Home Care)
                </h3>
              </div>
              <button className="modal-close-btn" onClick={() => { setShowManageModal(false); setEditingTemplateId(null); setTemplateTitle(''); setTemplateContent(''); }}>
                <X size={16} />
              </button>
            </div>

            {/* Existing Templates List */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.88rem', color: 'var(--text-primary)', margin: '0 0 0.75rem 0', fontWeight: 600 }}>
                Modelos Salvos ({templates.length})
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '220px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                {templates.map(tpl => (
                  <div
                    key={tpl.id}
                    style={{
                      background: '#fcfdfe',
                      border: '1px solid var(--surface-border)',
                      borderRadius: '8px',
                      padding: '0.75rem 0.85rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                        {tpl.title}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {tpl.content}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleEditTemplate(tpl)}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                        title="Editar modelo"
                      >
                        <Edit2 size={13} /> Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleDeleteTemplate(tpl.id)}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }}
                        title="Excluir modelo"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Create / Edit Form */}
            <div style={{ background: 'rgba(14, 145, 168, 0.04)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--surface-border)', marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--accent-color)', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {editingTemplateId ? <Edit2 size={15} /> : <Plus size={15} />}
                {editingTemplateId ? 'Editar Modelo Selecionado' : 'Criar Novo Modelo de Prescrição'}
              </h4>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Título do Modelo (ex: Tratamento Fissuras)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: Recomendações Onicomicose"
                  value={templateTitle}
                  onChange={(e) => setTemplateTitle(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Conteúdo da Orientação / Prescrição</label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Insira as orientações detalhadas de Home Care para o paciente..."
                  value={templateContent}
                  onChange={(e) => setTemplateContent(e.target.value)}
                  style={{ fontSize: '0.82rem', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                {editingTemplateId && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => { setEditingTemplateId(null); setTemplateTitle(''); setTemplateContent(''); }}
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                  >
                    Cancelar Edição
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveSingleTemplate}
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Save size={14} /> {editingTemplateId ? 'Atualizar Modelo' : 'Adicionar Modelo'}
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--surface-border)', paddingTop: '0.85rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleResetTemplates}
                style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <RotateCcw size={13} /> Restaurar Padrões
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setShowManageModal(false); setEditingTemplateId(null); setTemplateTitle(''); setTemplateContent(''); }}
                style={{ fontSize: '0.85rem' }}
              >
                Concluir
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Interactive Procedure Options Manager Modal */}
      {showManageProceduresModal && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10050,
          backdropFilter: 'blur(5px)'
        }}>
          <div className="glass-card" style={{ width: '540px', maxWidth: '92vw', background: 'white', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', animation: 'pageFadeInUp 0.25s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Settings size={20} color="var(--accent-color)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Gerenciar Procedimentos Pré-Digitados
                </h3>
              </div>
              <button className="modal-close-btn" onClick={() => { setShowManageProceduresModal(false); setNewProcedureInput(''); }}>
                <X size={16} />
              </button>
            </div>

            {/* Existing Procedures List */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.88rem', color: 'var(--text-primary)', margin: '0 0 0.75rem 0', fontWeight: 600 }}>
                Procedimentos na Lista ({procedureOptions.length})
              </h4>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto', padding: '0.5rem', background: '#fcfdfe', border: '1px solid var(--surface-border)', borderRadius: '8px' }}>
                {procedureOptions.map(proc => (
                  <div
                    key={proc}
                    style={{
                      background: 'rgba(14, 145, 168, 0.08)',
                      border: '1px solid rgba(14, 145, 168, 0.2)',
                      color: 'var(--accent-color)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      padding: '0.3rem 0.65rem',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <span>{proc}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteProcedureOption(proc)}
                      style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                      title={`Remover ${proc}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add New Procedure Form */}
            <div style={{ background: 'rgba(14, 145, 168, 0.04)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--surface-border)', marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--accent-color)', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Plus size={15} /> Adicionar Novo Procedimento
              </h4>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: Cauterização, Órtese de Aço..."
                  value={newProcedureInput}
                  onChange={(e) => setNewProcedureInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddProcedureOption(); } }}
                  style={{ fontSize: '0.85rem', flex: 1 }}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAddProcedureOption}
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}
                >
                  <Plus size={14} /> Adicionar
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--surface-border)', paddingTop: '0.85rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleResetProcedureOptions}
                style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <RotateCcw size={13} /> Restaurar Padrões
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowManageProceduresModal(false)}
                style={{ fontSize: '0.82rem', padding: '0.4rem 1.1rem' }}
              >
                Concluído
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Print Document Modal */}
      {showPrintModal && patient && createPortal(
        <PrintDocumentModal
          patient={patient}
          currentForm={{
            id: formId ? parseInt(formId, 10) : 0,
            patient_id: parseInt(id || '0', 10),
            visit_date: form.visit_date,
            chief_complaint: form.chief_complaint,
            foot_specific_history: form.foot_specific_history,
            foot_map_image: form.foot_map_image,
            dermatological_pathologies: form.dermatological_pathologies,
            clinical_prescription: form.clinical_prescription,
            general_observations: form.general_observations,
            procedures_performed: form.procedures_performed,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }}
          defaultDocType="consultation"
          onClose={() => setShowPrintModal(false)}
        />,
        document.body
      )}

      {showFeetBuilderModal && (
        <FeetCanvasBuilderModal
          isOpen={showFeetBuilderModal}
          onClose={() => setShowFeetBuilderModal(false)}
        />
      )}
    </div>
  )
}
