import { machineIdSync } from 'node-machine-id'
import { getSetting, setSetting } from './database'

const SUPABASE_URL = 'https://nqydiepmxvzbaofuctma.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xeWRpZXBteHZ6YmFvZnVjdG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Njc3NjUsImV4cCI6MjA5NjI0Mzc2NX0.2GwsBbKemE5Er9LiP7Bjy4LbaFX6xBbXPcgy7TggsbI'
const STRIPE_API_KEY = import.meta.env.MAIN_VITE_STRIPE_API_KEY || ''
import Stripe from 'stripe'
const stripe = new Stripe(STRIPE_API_KEY || 'sk_test_dummy', { apiVersion: '2026-07-29.dahlia' as any })



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


/**
 * Retrieve subscription details for the current license.
 * Returns a success flag and the license/subscription data.
 */
export async function getSubscriptionDetails(): Promise<any> {
  const key = getSetting('license_key')
  if (!key) {
    return { success: false, error: 'Nenhuma licença encontrada' }
  }
  try {
    // Fetch license row from Supabase
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/licenses?license_key=eq.${encodeURIComponent(key)}&select=stripe_subscription_id,stripe_customer_id,status,expires_at,license_key`, {
      method: 'GET',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
    })
    if (!resp.ok) throw new Error('Supabase request falhou')
    const data = await resp.json()
    if (!Array.isArray(data) || data.length === 0) {
      return { success: false, error: 'Licença não encontrada no Supabase' }
    }
    const lic = data[0]
    // Optionally pull full Stripe subscription details
    let stripeSub: any = null
    if (lic.stripe_subscription_id) {
      try {
        stripeSub = await stripe.subscriptions.retrieve(lic.stripe_subscription_id)
      } catch (e) {
        console.warn('Não foi possível obter detalhes da assinatura Stripe', e)
      }
    }
    return { success: true, data: { ...lic, stripeSub } }
  } catch (e: any) {
    console.error('Erro ao obter detalhes da assinatura', e)
    return { success: false, error: e.message }
  }
}

/**
 * Cancel the Stripe subscription linked to the current license.
 */
export async function cancelSubscription(): Promise<{ success: boolean; error?: string }> {
  const key = getSetting('license_key')
  if (!key) {
    return { success: false, error: 'Nenhuma licença encontrada' }
  }
  try {
    // Get subscription id from Supabase
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/licenses?license_key=eq.${encodeURIComponent(key)}&select=stripe_subscription_id`, {
      method: 'GET',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
    })
    if (!resp.ok) throw new Error('Supabase request falhou')
    const rows = await resp.json()
    if (!Array.isArray(rows) || rows.length === 0) {
      return { success: false, error: 'Licença não encontrada' }
    }
    const subscriptionId = rows[0].stripe_subscription_id
    if (!subscriptionId) {
      return { success: false, error: 'Assinatura não associada à licença' }
    }
    // Cancel via Stripe API
    await stripe.subscriptions.cancel(subscriptionId)
    // Mark as canceled in Supabase (PATCH request)
    await fetch(`${SUPABASE_URL}/rest/v1/licenses?stripe_subscription_id=eq.${encodeURIComponent(subscriptionId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({ status: 'canceled' }),
    })
    return { success: true }
  } catch (e: any) {
    console.error('Erro ao cancelar assinatura', e)
    return { success: false, error: e.message }
  }
}

