import { useEffect, useState, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Plus, Calendar, Clock, User, Trash2, CheckSquare, Users, AlertCircle, FileEdit, CheckCircle2, ChevronRight, Filter } from 'lucide-react'
import { PatientListItem, SortMode } from '../../../shared/types'
import { calculateAge, formatDateOfBirth } from '../utils/ageHelper'

export default function PatientList() {
  const navigate = useNavigate()
  const [patients, setPatients] = useState<PatientListItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('last_created')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL')
  const [isManageMode, setIsManageMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return
    if (!window.confirm(`Tem certeza que deseja excluir ${selectedIds.length} paciente(s)?\nIsso removerá a ficha e o paciente permanentemente.`)) return
    
    try {
      await window.api.deletePatients(selectedIds)
      setSelectedIds([])
      setIsManageMode(false)
      fetchPatients()
    } catch (error) {
      console.error('Falha ao excluir:', error)
    }
  }

  const fetchPatients = async () => {
    try {
      const data = await window.api.listPatients(sortMode, searchQuery)
      setPatients(data)
    } catch (error) {
      console.error('Falha ao buscar pacientes:', error)
    }
  }

  useEffect(() => {
    fetchPatients()
  }, [sortMode, searchQuery])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/') {
        const tag = document.activeElement?.tagName.toLowerCase()
        if (tag !== 'input' && tag !== 'textarea') {
          e.preventDefault()
          searchInputRef.current?.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Calculate counts for badges and filters
  const pendingCount = useMemo(() => {
    return patients.filter(p => p.has_pending_form).length
  }, [patients])

  const completedCount = useMemo(() => {
    return patients.filter(p => !p.has_pending_form).length
  }, [patients])

  // Filter patients based on selected filter chip
  const filteredPatients = useMemo(() => {
    if (statusFilter === 'PENDING') {
      return patients.filter(p => p.has_pending_form)
    }
    if (statusFilter === 'COMPLETED') {
      return patients.filter(p => !p.has_pending_form)
    }
    return patients
  }, [patients, statusFilter])

  return (
    <div className="glass-card">
      {/* Top Reminder Banner for Pending Clinical Forms */}
      {pendingCount > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(217, 119, 6, 0.08))',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '12px',
          padding: '0.75rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              background: '#f59e0b',
              color: 'white',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <AlertCircle size={16} />
            </div>
            <div>
              <span style={{ fontWeight: 700, color: '#92400e', fontSize: '0.88rem' }}>
                {pendingCount} {pendingCount === 1 ? 'paciente com ficha pendente' : 'pacientes com fichas pendentes'}
              </span>
              <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.78rem', color: '#b45309' }}>
                Cadastros que ainda não possuem consulta clínica registrada ou estão com a anamnese incompleta.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn"
            onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
            style={{
              backgroundColor: statusFilter === 'PENDING' ? '#b45309' : '#f59e0b',
              color: 'white',
              border: 'none',
              fontSize: '0.78rem',
              padding: '0.4rem 0.85rem',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
              fontWeight: 600,
              boxShadow: '0 2px 6px rgba(245, 158, 11, 0.3)'
            }}
          >
            {statusFilter === 'PENDING' ? 'Ver Todos os Pacientes' : 'Filtrar Apenas Pendentes'}
          </button>
        </div>
      )}

      <div className="list-header">
        <h2 className="section-title" style={{ border: 'none', margin: 0, padding: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={24} /> Lista de Pacientes
        </h2>
        <div className="search-bar">
          <div style={{ position: 'relative', flex: 1 }}>
            <Search 
              size={18} 
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} 
            />
            <input
              ref={searchInputRef}
              type="text"
              className="form-control"
              placeholder="Buscar pacientes por nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <select 
            className="form-control" 
            style={{ width: 'auto' }}
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
          >
            <option value="last_created">Ordenar por Mais Recente</option>
            <option value="alphabetical">Ordenar Alfabeticamente</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isManageMode ? (
            <>
              <button className="btn btn-secondary" onClick={() => { setIsManageMode(false); setSelectedIds([]); }}>
                Cancelar
              </button>
              <button 
                className="btn btn-primary" 
                style={{ backgroundColor: 'var(--danger-color)', borderColor: 'var(--danger-color)' }}
                onClick={handleDeleteSelected}
                disabled={selectedIds.length === 0}
              >
                <Trash2 size={18} /> Excluir ({selectedIds.length})
              </button>
            </>
          ) : (
            <button className="btn btn-secondary" onClick={() => setIsManageMode(true)}>
              <CheckSquare size={18} /> Gerenciar
            </button>
          )}
          <Link to="/patient/new" className="btn btn-primary">
            <Plus size={18} /> Novo
          </Link>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginTop: '0.5rem',
        marginBottom: '1rem',
        flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
          <Filter size={13} /> Filtrar status:
        </span>

        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          style={{
            border: 'none',
            background: statusFilter === 'ALL' ? 'var(--accent-color)' : 'rgba(14, 145, 168, 0.08)',
            color: statusFilter === 'ALL' ? 'white' : 'var(--text-secondary)',
            padding: '0.3rem 0.8rem',
            borderRadius: '16px',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          Todos ({patients.length})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('PENDING')}
          style={{
            border: statusFilter === 'PENDING' ? 'none' : '1px solid rgba(245, 158, 11, 0.4)',
            background: statusFilter === 'PENDING' ? '#f59e0b' : 'rgba(245, 158, 11, 0.08)',
            color: statusFilter === 'PENDING' ? 'white' : '#b45309',
            padding: '0.3rem 0.8rem',
            borderRadius: '16px',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.15s ease'
          }}
        >
          <AlertCircle size={13} />
          Fichas Pendentes ({pendingCount})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('COMPLETED')}
          style={{
            border: statusFilter === 'COMPLETED' ? 'none' : '1px solid rgba(16, 185, 129, 0.3)',
            background: statusFilter === 'COMPLETED' ? '#10b981' : 'rgba(16, 185, 129, 0.08)',
            color: statusFilter === 'COMPLETED' ? 'white' : '#047857',
            padding: '0.3rem 0.8rem',
            borderRadius: '16px',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.15s ease'
          }}
        >
          <CheckCircle2 size={13} />
          Em Dia ({completedCount})
        </button>
      </div>

      <div className="table-container">
        {filteredPatients.length > 0 ? (
          <table>
            <thead>
              <tr>
                {isManageMode && <th style={{ width: '40px' }}></th>}
                <th>Nome</th>
                <th>Status da Ficha</th>
                <th>Data de Nascimento</th>
                <th>Criado em</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map(patient => {
                const isPending = Boolean(patient.has_pending_form)

                return (
                  <tr 
                    key={patient.id} 
                    onClick={() => {
                      if (isManageMode) {
                        toggleSelect(patient.id)
                      } else {
                        navigate(`/patient/${patient.id}`)
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {isManageMode && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(patient.id)}
                          onChange={() => toggleSelect(patient.id)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                      </td>
                    )}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <User size={16} color="var(--accent-color)" />
                        <strong>{patient.first_name} {patient.last_name}</strong>
                      </div>
                    </td>
                    <td>
                      {isPending ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            padding: '0.25rem 0.65rem',
                            borderRadius: '12px',
                            background: 'rgba(245, 158, 11, 0.12)',
                            color: '#b45309',
                            border: '1px solid rgba(245, 158, 11, 0.3)'
                          }}>
                            <AlertCircle size={12} />
                            {patient.forms_count === 0 ? 'Sem Consulta' : 'Ficha Incompleta'}
                          </span>
                        </div>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          padding: '0.25rem 0.65rem',
                          borderRadius: '12px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: '#059669',
                          border: '1px solid rgba(16, 185, 129, 0.25)'
                        }}>
                          <CheckCircle2 size={12} />
                          Em dia ({patient.forms_count} {patient.forms_count === 1 ? 'consulta' : 'consultas'})
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                        <Calendar size={14} />
                        {patient.date_of_birth ? (
                          <>
                            {formatDateOfBirth(patient.date_of_birth)}
                            {calculateAge(patient.date_of_birth) !== null && (
                              <span> ({calculateAge(patient.date_of_birth)} {calculateAge(patient.date_of_birth) === 1 ? 'ano' : 'anos'})</span>
                            )}
                          </>
                        ) : (
                          'N/A'
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                        <Clock size={14} />
                        {new Date(patient.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      {isPending ? (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => navigate(`/patient/${patient.id}/form/new`)}
                          style={{
                            fontSize: '0.76rem',
                            padding: '0.3rem 0.65rem',
                            borderColor: 'rgba(245, 158, 11, 0.4)',
                            color: '#b45309',
                            background: 'rgba(245, 158, 11, 0.05)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontWeight: 600
                          }}
                          title="Preencher nova ficha de consulta clínica para este paciente"
                        >
                          <FileEdit size={13} /> Preencher Ficha
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-icon-subtle"
                          onClick={() => navigate(`/patient/${patient.id}`)}
                          style={{ padding: '0.35rem', borderRadius: '6px' }}
                          title="Ver Prontuário do Paciente"
                        >
                          <ChevronRight size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <User size={48} />
            <h3>Nenhum paciente encontrado</h3>
            <p>
              {statusFilter !== 'ALL' 
                ? 'Nenhum paciente corresponde ao filtro de status selecionado.' 
                : 'Tente ajustar sua busca ou adicione um novo paciente.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
