import React, { useState, useEffect } from 'react'

export default function LockScreen({ onUnlocked }: { onUnlocked: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [needsSetup, setNeedsSetup] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  
  useEffect(() => {
    window.api.hasAdminUser().then(hasAdmin => {
      setNeedsSetup(!hasAdmin)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      if (needsSetup) {
        if (password !== confirmPassword) {
          setError('As senhas não coincidem.')
          return
        }
        await window.api.setupAdminPassword(password)
        onUnlocked()
      } else {
        const success = await window.api.unlockSession(password)
        if (success) {
          onUnlocked()
        } else {
          setError('Senha incorreta.')
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao processar a senha.')
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'var(--bg-color)', zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="patient-card" style={{ padding: '2rem', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary-color)' }}>
          {needsSetup ? 'Configurar Senha Mestre' : 'Sessão Bloqueada'}
        </h2>
        
        {needsSetup && (
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Para aumentar a segurança dos dados dos pacientes, por favor, defina uma senha mestre.
          </p>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="password"
            autoFocus
            className="form-control"
            placeholder={needsSetup ? "Digite a senha mestre" : "Digite sua senha para continuar"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          
          {needsSetup && (
            <input
              type="password"
              className="form-control"
              placeholder="Confirme a senha mestre"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          )}

          {error && <div style={{ color: 'var(--danger-color)', fontSize: '0.9rem' }}>{error}</div>}

          <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
            {needsSetup ? 'Salvar Senha' : 'Desbloquear'}
          </button>
        </form>
      </div>
    </div>
  )
}
