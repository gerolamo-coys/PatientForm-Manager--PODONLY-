import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Save, X, User, Activity, AlertCircle, Plus, Calendar, Clock, Image as ImageIcon, Trash2, Search } from 'lucide-react'
import { Patient, PodiatryHistoryForm, PatientImage } from '../../../shared/types'
import { calculateAge } from '../utils/ageHelper'

export default function PatientDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEditing = Boolean(id)

  const [patient, setPatient] = useState<Omit<Patient, 'id' | 'created_at' | 'updated_at'>>({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    phone: '',
    address: '',
    profession: '',
    practices_sports: '',
    past_medical_history: '',
    past_surgical_history: '',
    medications: '',
    allergies: '',
    medical_problems: '{}',
    shoe_type: '[]',
    nail_shape: '[]'
  })
  
  const [forms, setForms] = useState<PodiatryHistoryForm[]>([])
  const [images, setImages] = useState<(PatientImage & { base64: string | null })[]>([])
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [createdSuccess, setCreatedSuccess] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    window.scrollTo(0, 0)
    const appContent = document.querySelector('.app-content')
    if (appContent) {
      appContent.scrollTop = 0
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc key to go back
      if (e.key === 'Escape') {
        const tag = document.activeElement?.tagName.toLowerCase()
        if (tag !== 'input' && tag !== 'textarea') {
          e.preventDefault()
          navigate('/patients')
        }
      }
      // Ctrl+S / Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        const dummyFormEvent = {
          preventDefault: () => {}
        } as React.FormEvent;
        handleSavePatient(dummyFormEvent);
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [patient, navigate])

  useEffect(() => {
    if (isEditing && id) {
      const loadData = async () => {
        try {
          const patientId = parseInt(id, 10)
          const patientData = await window.api.getPatient(patientId)
          setPatient({
            first_name: patientData.first_name,
            last_name: patientData.last_name,
            date_of_birth: patientData.date_of_birth || '',
            phone: patientData.phone || '',
            address: patientData.address || '',
            profession: patientData.profession || '',
            practices_sports: patientData.practices_sports || '',
            past_medical_history: patientData.past_medical_history || '',
            past_surgical_history: patientData.past_surgical_history || '',
            medications: patientData.medications || '',
            allergies: patientData.allergies || '',
            medical_problems: patientData.medical_problems || '{}',
            shoe_type: patientData.shoe_type || '',
            nail_shape: patientData.nail_shape || '[]'
          })
          
          const formsData = await window.api.getPatientForms(patientId)
          setForms(formsData)

          const imagesData = await window.api.getPatientImages(patientId)
          const imagesWithBase64 = await Promise.all(imagesData.map(async (img) => {
            const base64 = await window.api.readPatientImageBase64(img.file_name)
            return { ...img, base64 }
          }))
          setImages(imagesWithBase64)
        } catch (err: any) {
          setError(err.message || 'Falha ao carregar dados do paciente.')
        }
      }
      loadData()
    }
  }, [id, isEditing])

  const handleAddImage = async () => {
    if (!id) return
    const newId = await window.api.pickAndSavePatientImage(parseInt(id, 10))
    if (newId) {
      const imagesData = await window.api.getPatientImages(parseInt(id, 10))
      const imagesWithBase64 = await Promise.all(imagesData.map(async (img) => {
        const base64 = await window.api.readPatientImageBase64(img.file_name)
        return { ...img, base64 }
      }))
      setImages(imagesWithBase64)
    }
  }

  const handleDeleteImage = async (imgId: number, fileName: string) => {
    if (!confirm('Tem certeza que deseja apagar esta foto?')) return
    await window.api.deletePatientImage(imgId, fileName)
    setImages(images.filter(i => i.id !== imgId))
  }

  const handleUpdateDescription = async (imgId: number, text: string) => {
    await window.api.updatePatientImageDescription(imgId, text)
    setImages(images.map(i => i.id === imgId ? { ...i, description: text } : i))
  }


  const handlePatientChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setPatient({ ...patient, [e.target.name]: e.target.value })
  }

  const handleMedicalProblemChange = (problem: string, value: string) => {
    try {
      const current = JSON.parse(patient.medical_problems || '{}')
      current[problem] = value
      setPatient({ ...patient, medical_problems: JSON.stringify(current) })
    } catch {
      setPatient({ ...patient, medical_problems: JSON.stringify({ [problem]: value }) })
    }
  }

  const handleCheckboxArrayChange = (field: 'nail_shape' | 'shoe_type', value: string) => {
    try {
      const current: string[] = JSON.parse(patient[field] || '[]')
      if (current.includes(value)) {
        setPatient({ ...patient, [field]: JSON.stringify(current.filter(i => i !== value)) })
      } else {
        setPatient({ ...patient, [field]: JSON.stringify([...current, value]) })
      }
    } catch {
      setPatient({ ...patient, [field]: JSON.stringify([value]) })
    }
  }

  const validate = () => {
    if (!patient.last_name.trim()) return 'Sobrenome é obrigatório.'
    if (!patient.first_name.trim()) return 'Nome é obrigatório.'
    return null
  }

  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      if (isEditing && id) {
        await window.api.updatePatient(parseInt(id, 10), patient)
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      } else {
        const newPatientId = await window.api.createPatient(patient)
        setCreatedSuccess(true)
        setTimeout(() => setCreatedSuccess(false), 3000)
        navigate(`/patient/${newPatientId}`)
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar os dados.')
    }
  }

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
            <User color="var(--accent-color)" /> 
            {isEditing ? 'Prontuário do Paciente' : 'Novo Paciente'}
          </h2>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/patients')}>
          <X size={18} /> Voltar
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
          Dados do paciente atualizados com sucesso!
        </div>,
        document.body
      )}

      {createdSuccess && createPortal(
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
          Paciente registrado com sucesso.
        </div>,
        document.body
      )}

      <form onSubmit={handleSavePatient}>
        <h3 className="section-title">Dados Demográficos</h3>
        <div className="grid-3">
          <div className="form-group">
            <label className="form-label">Nome *</label>
            <input type="text" className="form-control" name="first_name" value={patient.first_name} onChange={handlePatientChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Sobrenome *</label>
            <input type="text" className="form-control" name="last_name" value={patient.last_name} onChange={handlePatientChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">
              Data de Nascimento {calculateAge(patient.date_of_birth) !== null ? `(${calculateAge(patient.date_of_birth)} ${calculateAge(patient.date_of_birth) === 1 ? 'ano' : 'anos'})` : ''}
            </label>
            <input type="date" className="form-control" name="date_of_birth" value={patient.date_of_birth || ''} onChange={handlePatientChange} />
          </div>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Telefone</label>
            <input type="tel" className="form-control" name="phone" value={patient.phone || ''} onChange={handlePatientChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Endereço</label>
            <input type="text" className="form-control" name="address" value={patient.address || ''} onChange={handlePatientChange} />
          </div>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Profissão</label>
            <input type="text" className="form-control" name="profession" value={patient.profession || ''} onChange={handlePatientChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Pratica atividade Fisica?</label>
            <input type="text" className="form-control" name="practices_sports" value={patient.practices_sports || ''} onChange={handlePatientChange} placeholder="Sim/Não, qual?" />
          </div>
        </div>

        <h3 className="section-title" style={{ marginTop: '2rem' }}>Histórico Médico</h3>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Histórico Médico Pregresso</label>
            <textarea className="form-control" name="past_medical_history" value={patient.past_medical_history || ''} onChange={handlePatientChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Medicamentos em Uso</label>
            <textarea className="form-control" name="medications" value={patient.medications || ''} onChange={handlePatientChange} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Problemas Médicos (Sim/Não)</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
            {[
              'Alergia', 'Cardiopatia', 'Hipertensão', 'Diabetes', 'Colesterol', 
              'Fumante', 'Artrite Reumatóide', 'Artrose', 'Gota', 'Possui Marca Passo'
            ].map(prob => {
              let currentVal = ''
              try {
                currentVal = JSON.parse(patient.medical_problems || '{}')[prob] || ''
              } catch {}
              return (
                <div key={prob} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.9rem' }}>{prob}</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <input type="radio" name={`med_prob_${prob}`} checked={currentVal === 'Sim'} onChange={() => handleMedicalProblemChange(prob, 'Sim')} /> Sim
                    </label>
                    <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <input type="radio" name={`med_prob_${prob}`} checked={currentVal === 'Não'} onChange={() => handleMedicalProblemChange(prob, 'Não')} /> Não
                    </label>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid-2" style={{ marginTop: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Tipo de calçado que costuma usar</label>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              {['Aberto', 'Fechado'].map(item => {
                let isChecked = false
                try {
                  isChecked = JSON.parse(patient.shoe_type || '[]').includes(item)
                } catch {
                  if (patient.shoe_type && patient.shoe_type.toLowerCase().includes(item.toLowerCase())) isChecked = true;
                }
                return (
                  <label key={item} style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={isChecked} onChange={() => handleCheckboxArrayChange('shoe_type', item)} /> {item}
                  </label>
                )
              })}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Formato de Unha</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
              {[
                'Normal', 'Telha', 'Funil', 'Gancho', 'Caracol', 'Distrófica', 'Torquês'
              ].map(item => {
                let isChecked = false
                try {
                  isChecked = JSON.parse(patient.nail_shape || '[]').includes(item)
                } catch {}
                return (
                  <label key={item} style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={isChecked} onChange={() => handleCheckboxArrayChange('nail_shape', item)} /> {item}
                  </label>
                )
              })}
            </div>
          </div>
        </div>

        <div className="form-actions" style={{ justifyContent: 'flex-start', marginTop: '2rem' }}>
          <button type="submit" className="btn btn-primary">
            <Save size={18} /> {isEditing ? 'Salvar Alterações' : 'Criar Paciente'}
          </button>
        </div>
      </form>

      {isEditing && (
        <div style={{ marginTop: '3rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity color="var(--success-color)" size={20} /> Histórico de Consultas
            </h3>
            <Link to={`/patient/${id}/form/new`} className="btn btn-primary">
              <Plus size={18} /> Nova Consulta
            </Link>
          </div>

          {forms.length > 0 && (
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.5rem 1rem', border: '1px solid var(--surface-border)' }}>
              <Search size={18} color="var(--text-secondary)" style={{ marginRight: '0.5rem' }} />
              <input
                type="text"
                placeholder="Buscar por queixa ou data..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%', fontSize: '0.9rem' }}
              />
            </div>
          )}

          {forms.length > 0 ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Data da Consulta</th>
                    <th>Queixa Principal</th>
                    <th>Registrado em</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {forms.filter(form => 
                    (form.chief_complaint || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    new Date(form.visit_date.split('T')[0] + 'T12:00:00').toLocaleDateString().includes(searchQuery)
                  ).map(form => (
                    <tr key={form.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Calendar size={14} color="var(--text-secondary)" />
                          <strong>{new Date(form.visit_date.split('T')[0] + 'T12:00:00').toLocaleDateString()}</strong>
                        </div>
                      </td>
                      <td>{form.chief_complaint || '-'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                          <Clock size={14} />
                          {new Date(form.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link to={`/patient/${id}/form/${form.id}`} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                          Ver Ficha
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <Activity size={32} style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }} />
              <p>Nenhuma consulta registrada para este paciente.</p>
              <Link to={`/patient/${id}/form/new`} className="btn btn-primary" style={{ marginTop: '1rem' }}>
                Registrar Primeira Consulta
              </Link>
            </div>
          )}
        </div>
      )}

      {isEditing && (
        <div style={{ marginTop: '3rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ImageIcon color="var(--accent-color)" size={20} /> Galeria de Fotos
            </h3>
            <button type="button" className="btn btn-primary" onClick={handleAddImage}>
              <Plus size={18} /> Adicionar Foto
            </button>
          </div>

          {images.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
              {images.map(img => (
                <div key={img.id} className="glass-card" style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {img.base64 ? (
                    <img 
                      src={img.base64} 
                      alt={img.description || 'Foto'} 
                      onClick={() => { setFullscreenImage(img.base64); setZoom(1); }}
                      style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '4px', cursor: 'zoom-in', transition: 'transform 0.2s ease' }} 
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '200px', backgroundColor: 'rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      Imagem não encontrada
                    </div>
                  )}
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Descrição (ex: Antes do tratamento)" 
                    value={img.description || ''} 
                    onChange={(e) => setImages(images.map(i => i.id === img.id ? { ...i, description: e.target.value } : i))}
                    onBlur={(e) => handleUpdateDescription(img.id, e.target.value)}
                    style={{ fontSize: '0.9rem', padding: '0.4rem' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Data: {new Date(img.created_at).toLocaleDateString()}
                    </span>
                    <button type="button" onClick={() => handleDeleteImage(img.id, img.file_name)} style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <ImageIcon size={32} style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }} />
              <p>Nenhuma foto importada para este paciente.</p>
            </div>
          )}
        </div>
      )}

      {fullscreenImage && createPortal(
        <>
          <div 
            onClick={(e) => {
              if (e.target === e.currentTarget) setFullscreenImage(null)
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: zoom === 1 ? 'center' : 'flex-start',
              justifyContent: zoom === 1 ? 'center' : 'flex-start',
              zIndex: 999998,
              overflow: 'auto',
              animation: 'fadeIn 0.2s ease-out',
              padding: zoom === 1 ? 0 : '2rem'
            }}
          >
            <img 
              src={fullscreenImage} 
              alt="Fullscreen" 
              onClick={() => setZoom(z => z === 1 ? 2 : 1)} 
              style={{
                maxHeight: zoom === 1 ? '90vh' : 'none',
                maxWidth: zoom === 1 ? '90vw' : 'none',
                width: zoom > 1 ? `${90 * zoom}vw` : 'auto',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                cursor: zoom === 1 ? 'zoom-in' : 'zoom-out',
                transition: 'width 0.2s ease, max-width 0.2s ease, max-height 0.2s ease',
                animation: 'zoomIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                margin: zoom > 1 ? 'auto' : 0
              }} 
            />
          </div>

          <div style={{ 
            position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', 
            display: 'flex', gap: '1rem', backgroundColor: 'rgba(0,0,0,0.7)', padding: '0.5rem 1.5rem', 
            borderRadius: '2rem', zIndex: 999999, color: 'white', alignItems: 'center',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            animation: 'fadeIn 0.2s ease-out'
          }}>
             <button onClick={() => setZoom(z => Math.max(1, z - 0.5))} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }}>-</button>
             <span style={{ fontSize: '0.9rem', minWidth: '40px', textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
             <button onClick={() => setZoom(z => Math.min(5, z + 0.5))} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }}>+</button>
             <div style={{ width: '1px', height: '1.5rem', backgroundColor: 'rgba(255,255,255,0.3)', margin: '0 0.5rem' }} />
             <button onClick={() => setFullscreenImage(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }}>&times;</button>
          </div>
        </>,
        document.body
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes zoomIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

