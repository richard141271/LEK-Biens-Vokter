import { createClient } from '@supabase/supabase-js'

export function createAdminClient(options?: { headers?: Record<string, string> }) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: options?.headers ? { headers: options.headers } : undefined
    }
  )
}
