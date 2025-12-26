import { createBrowserClient } from '@supabase/ssr'

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase environment variables are missing!");
    // Return a dummy client or throw a more descriptive error?
    // If we throw here, it might crash the app startup. 
    // But createBrowserClient throws anyway if missing.
    // Let's rely on the global error boundary to catch it, 
    // but at least we log it clearly.
  }

  return createBrowserClient(
    supabaseUrl!,
    supabaseKey!
  )
}
