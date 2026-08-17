import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Plus, Calendar, Clock, User, Trash2, CheckSquare } from 'lucide-react'
import { PatientListItem, SortMode } from '../../../shared/types'
import { calculateAge, formatDateOfBirth } from '../utils/ageHelper'

export default function PatientList() {
  const navigate = useNavigate()
  const [patients, setPatients] = useState<PatientListItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('last_created')
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

  return (
    <div className="glass-card">
      <div className="list-header">
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

      <div className="table-container">
        {patients.length > 0 ? (
          <table>
            <thead>
              <tr>
                {isManageMode && <th style={{ width: '40px' }}></th>}
                <th>Nome</th>
                <th>Data de Nascimento</th>
                <th>Criado em</th>
              </tr>
            </thead>
            <tbody>
              {patients.map(patient => (
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
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <User size={48} />
            <h3>Nenhum paciente encontrado</h3>
            <p>Tente ajustar sua busca ou adicione um novo paciente.</p>
          </div>
        )}
      </div>
    </div>
  )
}
