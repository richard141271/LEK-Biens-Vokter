import { createClient } from '@supabase/supabase-js'

export function createAdminClient(options?: { headers?: Record<string, string> }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL mangler')
  }
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY mangler (kreves for admin-operasjoner)')
  }

  return createClient(
    url,
    serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: options?.headers ? { headers: options.headers } : undefined
    }
  )
}
