import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Key, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react'

export default function ActivationScreen(): React.JSX.Element {
  const navigate = useNavigate()
  const [licenseKey, setLicenseKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!licenseKey.trim()) {
      setError('Por favor, insira uma chave de licença válida.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await window.api.validateLicense(licenseKey.trim())
      if (result.valid) {
        navigate('/')
      } else {
        setError(result.error || 'A chave informada é inválida.')
      }
    } catch {
      setError('Erro ao validar a licença. Verifique sua conexão com a internet.')
    }
 finally {
      setLoading(false)
    }
  }

  return (
    <div className="activation-container">
      <div className="activation-card">
        <div className="activation-header">
          <div className="activation-icon-wrapper">
            <ShieldCheck size={36} className="activation-icon" />
          </div>
          <h2>Ativação do Sistema</h2>
          <p>Por favor, insira a sua chave de licença para acessar o Podonly.</p>
        </div>

        <form onSubmit={handleActivate} className="activation-form">
          {error && (
            <div className="activation-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="input-group">
            <label htmlFor="licenseKey">Chave de Licença</label>
            <div className="input-with-icon">
              <Key size={18} className="input-icon" />
              <input
                id="licenseKey"
                type="text"
                placeholder="EX: PODO-2026-ABCD"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                disabled={loading}
                autoComplete="off"
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading || !licenseKey.trim()}>
            {loading ? (
              <>
                <Loader2 size={18} className="spinner" /> Validando...
              </>
            ) : (
              'Ativar Sistema'
            )}
          </button>
        </form>

        <div className="activation-footer">
          <p>Precisa de ajuda? Entre em contato com o suporte.</p>
        </div>
      </div>

      <style>{`
        .activation-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%);
          padding: 1.5rem;
        }

        .activation-card {
          background: white;
          width: 100%;
          max-width: 440px;
          border-radius: 20px;
          box-shadow: 0 20px 40px -15px rgba(14, 145, 168, 0.15), 0 0 0 1px rgba(14, 145, 168, 0.05);
          padding: 2.5rem;
          animation: slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .activation-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .activation-icon-wrapper {
          width: 72px;
          height: 72px;
          background: rgba(14, 145, 168, 0.1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.25rem;
          color: var(--accent-color);
        }

        .activation-header h2 {
          font-size: 1.5rem;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
          font-weight: 700;
        }

        .activation-header p {
          color: var(--text-secondary);
          font-size: 0.95rem;
          line-height: 1.5;
        }

        .activation-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .activation-error {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          background: rgba(239, 68, 68, 0.1);
          color: var(--danger-color);
          padding: 0.85rem 1rem;
          border-radius: 10px;
          font-size: 0.88rem;
          line-height: 1.4;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .input-group label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-with-icon .input-icon {
          position: absolute;
          left: 1rem;
          color: #94a3b8;
        }

        .input-with-icon input {
          width: 100%;
          padding: 0.85rem 1rem 0.85rem 2.8rem;
          border: 1px solid var(--surface-border);
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 500;
          color: var(--text-primary);
          background: #f8fafc;
          transition: all 0.2s;
        }

        .input-with-icon input:focus {
          outline: none;
          border-color: var(--accent-color);
          background: white;
          box-shadow: 0 0 0 4px rgba(14, 145, 168, 0.1);
        }

        .btn-block {
          width: 100%;
          justify-content: center;
          padding: 0.9rem;
          font-size: 1rem;
          font-weight: 600;
          border-radius: 12px;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .activation-footer {
          margin-top: 2rem;
          text-align: center;
          font-size: 0.85rem;
          color: #94a3b8;
        }
      `}</style>
    </div>
  )
}
