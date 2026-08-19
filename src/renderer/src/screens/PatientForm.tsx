import React, { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate } from 'react-router-dom'
import { Save, X, Activity, ClipboardList, AlertCircle, Map, User, FileText } from 'lucide-react'
import FootMapCanvas from '../components/FootMapCanvas'
import { calculateAge } from '../utils/ageHelper'

const HOME_CARE_TEMPLATES = {
  "Pé Diabético": "Recomendações Home Care (Pé Diabético): \n- Inspeção diária dos pés.\n- Secar bem entre os dedos após o banho.\n- Uso de calçados confortáveis e sem costuras internas.\n- Hidratação diária, evitando a região entre os dedos.\n- Não andar descalço.\n- Cortar as unhas retas.",
  "Higienização Calçados": "Recomendações Home Care (Higienização de Calçados): \n- Limpar os calçados com pano úmido e sabão neutro.\n- Deixar secar em local arejado e à sombra.\n- Alternar o uso dos calçados, não usando o mesmo par por dias seguidos.\n- Utilizar talco ou spray antisséptico para prevenir odores e fungos.",
  "Onicocriptose": "Recomendações Home Care (Onicocriptose): \n- Evitar o uso de calçados de bico fino ou muito apertados.\n- Cortar as unhas de forma reta, sem arredondar os cantos.\n- Em caso de dor ou inflamação, retornar ao podólogo.\n- Não tentar desencravar em casa."
};

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
  const [patient, setPatient] = useState<{ first_name: string; last_name: string; date_of_birth: string | null } | null>(null)

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

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!id) return;
        const patientId = parseInt(id, 10);

        const patientData = await window.api.getPatient(patientId)
        setPatient(patientData)

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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc key to go back
      if (e.key === 'Escape') {
        const tag = document.activeElement?.tagName.toLowerCase()
        // Only trigger if we aren't actively editing fields, or allow Esc globally
        if (tag !== 'input' && tag !== 'textarea') {
          e.preventDefault()
          navigate(`/patient/${id}`)
        }
      }
      // Ctrl+S / Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        const dummyFormEvent = {
          preventDefault: () => {}
        } as React.FormEvent;
        handleSubmit(dummyFormEvent);
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [form, id, navigate])

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

  const handleAppendTemplate = (templateName: keyof typeof HOME_CARE_TEMPLATES) => {
    const text = HOME_CARE_TEMPLATES[templateName];
    setForm(prev => ({
      ...prev,
      clinical_prescription: prev.clinical_prescription 
        ? `${prev.clinical_prescription}\n\n${text}` 
        : text
    }));
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

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveSection(sectionId)
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
        <button type="button" className="btn btn-secondary" onClick={() => navigate(`/patient/${id}`)}>
          <X size={18} /> Cancelar
        </button>
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
              <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Map color="var(--success-color)" size={20} /> Mapa do Pé (Anotações)
              </h3>
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
                <label className="form-label">Procedimento Realizado</label>
                <textarea className="form-control" name="procedures_performed" value={form.procedures_performed} onChange={handleFormChange} style={{ minHeight: '100px' }} />
              </div>
              <div className="grid-2">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Prescrição clínica / Home Care</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    {Object.keys(HOME_CARE_TEMPLATES).map(templateName => (
                      <button
                        key={templateName}
                        type="button"
                        onClick={() => handleAppendTemplate(templateName as keyof typeof HOME_CARE_TEMPLATES)}
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid var(--surface-border)',
                          color: 'var(--text-secondary)',
                          fontSize: '0.75rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                      >
                        + {templateName}
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
    </div>
  )
}
