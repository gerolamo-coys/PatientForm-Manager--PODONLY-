import { machineIdSync } from 'node-machine-id'
import { getSetting, setSetting } from './database'

const SUPABASE_URL = 'https://nqydiepmxvzbaofuctma.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xeWRpZXBteHZ6YmFvZnVjdG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Njc3NjUsImV4cCI6MjA5NjI0Mzc2NX0.2GwsBbKemE5Er9LiP7Bjy4LbaFX6xBbXPcgy7TggsbI'
const ASAAS_API_KEY = import.meta.env.MAIN_VITE_ASAAS_API_KEY || ''

export async function validateLicense(key: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const hwId = machineIdSync()

    // 1. Try local Next.js Web App API first if server is running
    try {
      const webRes = await fetch('http://localhost:3000/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, machine_id: hwId })
      })
      if (webRes.ok) {
        const webData = await webRes.json()
        if (webData.valid) {
          setSetting('license_key', key)
          const offlineValidUntil = new Date()
          offlineValidUntil.setDate(offlineValidUntil.getDate() + 7)
          setSetting('license_offline_valid_until', offlineValidUntil.toISOString())
          return { valid: true }
        } else {
          return { valid: false, error: webData.error || 'Licença inválida' }
        }
      }
    } catch {
      // Local web app server not running
    }


    // 2. Direct Supabase RPC Call
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/activate_license`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify({ p_key: key, p_license_key: key, p_machine_id: hwId })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.valid) {
          setSetting('license_key', key)
          const offlineValidUntil = new Date()
          offlineValidUntil.setDate(offlineValidUntil.getDate() + 7)
          setSetting('license_offline_valid_until', offlineValidUntil.toISOString())
          return { valid: true }
        } else if (data.error) {
          return { valid: false, error: data.error }
        }
      }
    } catch (e) {
      console.warn('RPC activate_license failed, attempting PostgREST fallback...', e)
    }

    // 3. Direct PostgREST Table Fallback (if RPC function fails or has column errors)
    try {
      const tableRes = await fetch(`${SUPABASE_URL}/rest/v1/licenses?license_key=eq.${encodeURIComponent(key)}&select=*`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      })

      if (tableRes.ok) {
        const licenses = await tableRes.json()
        if (Array.isArray(licenses) && licenses.length > 0) {
          const lic = licenses[0]
          const status = lic.status?.toLowerCase()
          if (status === 'active' || status === 'trialing') {
            setSetting('license_key', key)
            const offlineValidUntil = new Date()
            offlineValidUntil.setDate(offlineValidUntil.getDate() + 7)
            setSetting('license_offline_valid_until', offlineValidUntil.toISOString())
            return { valid: true }
          } else {
            return { valid: false, error: 'Esta licença está inativa ou suspensa.' }
          }
        }
      }
    } catch (e) {
      console.error('PostgREST fallback error:', e)
    }

    return { valid: false, error: 'Chave de licença inválida ou não encontrada.' }
  } catch (error: unknown) {
    console.error('Error validating license:', error)

    return { valid: false, error: 'Falha ao conectar com o servidor. Verifique sua conexão com a internet.' }
  }
}

export async function checkLicenseStatus(): Promise<{ valid: boolean; error?: string }> {
  const key = getSetting('license_key')
  if (!key) {
    return { valid: false, error: 'Nenhuma licença encontrada no sistema.' }
  }

  try {
    const hwId = machineIdSync()
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/activate_license`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({ p_key: key, p_machine_id: hwId })
    })

    if (response.ok) {
      const data = await response.json()
      if (data.valid) {
        const offlineValidUntil = new Date()
        offlineValidUntil.setDate(offlineValidUntil.getDate() + 7)
        setSetting('license_offline_valid_until', offlineValidUntil.toISOString())
        return { valid: true }
      } else {
        setSetting('license_offline_valid_until', '')
        return { valid: false, error: data.error || 'A licença tornou-se inválida ou expirou.' }
      }
    }
  } catch (error) {
    console.error('Offline or server error, falling back to local check', error)
  }

  const offlineValidUntilStr = getSetting('license_offline_valid_until')
  if (offlineValidUntilStr) {
    const offlineValidUntil = new Date(offlineValidUntilStr)
    if (offlineValidUntil > new Date()) {
      return { valid: true }
    } else {
      return { valid: false, error: 'O período offline expirou. Conecte-se à internet para verificar a licença novamente.' }
    }
  }

  return { valid: false, error: 'Não foi possível verificar a licença. Conecte-se à internet.' }
}

export function revokeLicenseLocal() {
  setSetting('license_key', '')
  setSetting('license_offline_valid_until', '')
}

export async function getSubscriptionDetails(): Promise<any> {
  const key = getSetting('license_key')
  if (!key) {
    return { success: false, error: 'Nenhuma chave de licença encontrada localmente.' }
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_asaas_subscription_details`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({ p_license_key: key, p_asaas_api_key: ASAAS_API_KEY })
    })

    if (!response.ok) {
      console.error('get_asaas_subscription_details HTTP error', response.status)
      return { success: false, error: 'Erro de comunicação com o servidor Supabase.' }
    }

    const data = await response.json()
    return data
  } catch (error: any) {
    console.error('Error fetching subscription details:', error)
    return { success: false, error: 'Falha ao buscar dados da assinatura.' }
  }
}

export async function cancelSubscription(): Promise<{ success: boolean; error?: string }> {
  const key = getSetting('license_key')
  if (!key) {
    return { success: false, error: 'Nenhuma chave de licença encontrada localmente.' }
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/cancel_asaas_subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({ p_license_key: key, p_asaas_api_key: ASAAS_API_KEY })
    })

    if (!response.ok) {
      console.error('cancel_asaas_subscription HTTP error', response.status)
      return { success: false, error: 'Erro de comunicação com o servidor Supabase.' }
    }

    const data = await response.json()
    return data
  } catch (error: any) {
    console.error('Error cancelling subscription:', error)
    return { success: false, error: 'Falha ao cancelar a assinatura.' }
  }
}
