import React from 'react'
import type { CustomFieldDefinition } from '../../../shared/types'

interface DynamicCustomFieldsRendererProps {
  fields: CustomFieldDefinition[]
  customDataObj: Record<string, any>
  onChange: (updatedObj: Record<string, any>) => void
  gridLayout?: boolean
}

export default function DynamicCustomFieldsRenderer({
  fields,
  customDataObj,
  onChange,
  gridLayout = true
}: DynamicCustomFieldsRendererProps): React.JSX.Element | null {
  // Show enabled fields OR disabled fields that already contain historical data for this record
  const visibleFields = fields.filter(f => {
    if (f.enabled) return true
    const val = customDataObj[f.id]
    if (val === undefined || val === null || val === '') return false
    if (Array.isArray(val) && val.length === 0) return false
    if (typeof val === 'object' && Object.keys(val).length === 0) return false
    return true
  })

  if (visibleFields.length === 0) return null

  const handleFieldValue = (fieldId: string, value: any) => {
    onChange({
      ...customDataObj,
      [fieldId]: value
    })
  }

  const handleToggleMultiCheckbox = (fieldId: string, option: string) => {
    const currentList: string[] = Array.isArray(customDataObj[fieldId])
      ? customDataObj[fieldId]
      : []
    const nextList = currentList.includes(option)
      ? currentList.filter(item => item !== option)
      : [...currentList, option]
    handleFieldValue(fieldId, nextList)
  }

  const handleYesNoTableChange = (fieldId: string, item: string, answer: 'Sim' | 'Não') => {
    const currentMap: Record<string, string> =
      typeof customDataObj[fieldId] === 'object' && customDataObj[fieldId] !== null
        ? customDataObj[fieldId]
        : {}
    handleFieldValue(fieldId, {
      ...currentMap,
      [item]: answer
    })
  }

  return (
    <div
      style={{
        display: gridLayout ? 'grid' : 'flex',
        gridTemplateColumns: gridLayout ? 'repeat(auto-fit, minmax(260px, 1fr))' : undefined,
        flexDirection: gridLayout ? undefined : 'column',
        gap: '1.15rem'
      }}
    >
      {visibleFields.map(field => {
        const val = customDataObj[field.id]
        const isFullWidth =
          field.type === 'long_text' ||
          field.type === 'yes_no_table' ||
          field.type === 'multi_checkbox'

        return (
          <div
            key={field.id}
            className="form-group"
            style={{
              marginBottom: 0,
              gridColumn: gridLayout && isFullWidth ? '1 / -1' : undefined
            }}
          >
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {field.label}
              {field.required && <span style={{ color: 'var(--danger-color)' }}>*</span>}
              {!field.enabled && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    background: 'rgba(100,116,139,0.12)',
                    color: '#64748b',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '10px'
                  }}
                >
                  Histórico Arquivado
                </span>
              )}
            </label>

            {field.type === 'short_text' && (
              <input
                type="text"
                className="form-control"
                placeholder={field.placeholder || ''}
                value={typeof val === 'string' ? val : ''}
                onChange={e => handleFieldValue(field.id, e.target.value)}
                required={field.required && field.enabled}
              />
            )}

            {field.type === 'number' && (
              <input
                type="number"
                step="any"
                className="form-control"
                placeholder={field.placeholder || '0'}
                value={val !== undefined && val !== null ? val : ''}
                onChange={e => handleFieldValue(field.id, e.target.value)}
                required={field.required && field.enabled}
              />
            )}

            {field.type === 'date' && (
              <input
                type="date"
                className="form-control"
                value={typeof val === 'string' ? val : ''}
                onChange={e => handleFieldValue(field.id, e.target.value)}
                required={field.required && field.enabled}
              />
            )}

            {field.type === 'long_text' && (
              <textarea
                className="form-control"
                rows={3}
                placeholder={field.placeholder || ''}
                value={typeof val === 'string' ? val : ''}
                onChange={e => handleFieldValue(field.id, e.target.value)}
                required={field.required && field.enabled}
              />
            )}

            {field.type === 'single_select' && (
              <select
                className="form-control"
                value={typeof val === 'string' ? val : ''}
                onChange={e => handleFieldValue(field.id, e.target.value)}
                required={field.required && field.enabled}
              >
                <option value="">Selecione...</option>
                {(field.options || []).map(opt => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}

            {field.type === 'multi_checkbox' && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.85rem',
                  marginTop: '0.4rem',
                  padding: '0.65rem 0.85rem',
                  background: 'rgba(5, 129, 157, 0.03)',
                  borderRadius: '8px',
                  border: '1px solid var(--surface-border)'
                }}
              >
                {(field.options || []).map(opt => {
                  const checked = Array.isArray(val) && val.includes(opt)
                  return (
                    <label
                      key={opt}
                      style={{
                        fontSize: '0.88rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleMultiCheckbox(field.id, opt)}
                      />
                      {opt}
                    </label>
                  )
                })}
              </div>
            )}

            {field.type === 'yes_no_table' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                  gap: '0.75rem',
                  marginTop: '0.4rem'
                }}
              >
                {(field.options || []).map(opt => {
                  const mapObj = typeof val === 'object' && val !== null ? val : {}
                  const currentAnswer = mapObj[opt] || ''
                  return (
                    <div
                      key={opt}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem 0.65rem',
                        backgroundColor: 'rgba(5, 129, 157, 0.04)',
                        border: '1px solid var(--surface-border)',
                        borderRadius: '8px'
                      }}
                    >
                      <span style={{ fontSize: '0.86rem', fontWeight: 500 }}>{opt}</span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <label
                          style={{
                            fontSize: '0.78rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                            cursor: 'pointer'
                          }}
                        >
                          <input
                            type="radio"
                            name={`custom_yn_${field.id}_${opt}`}
                            checked={currentAnswer === 'Sim'}
                            onChange={() => handleYesNoTableChange(field.id, opt, 'Sim')}
                          />
                          Sim
                        </label>
                        <label
                          style={{
                            fontSize: '0.78rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                            cursor: 'pointer'
                          }}
                        >
                          <input
                            type="radio"
                            name={`custom_yn_${field.id}_${opt}`}
                            checked={currentAnswer === 'Não'}
                            onChange={() => handleYesNoTableChange(field.id, opt, 'Não')}
                          />
                          Não
                        </label>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
