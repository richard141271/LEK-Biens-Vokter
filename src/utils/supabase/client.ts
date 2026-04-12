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

export function withTimeout<T>(promise: PromiseLike<T>, ms: number, message = 'Timeout'): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([Promise.resolve(promise), timeoutPromise]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

export async function getUserWithSessionFallback(supabase: any) {
  try {
    const { data, error } = await withTimeout<any>(supabase.auth.getUser() as any, 2500, 'getUser timeout');
    if (!error && data?.user) return data.user;
  } catch {}

  try {
    const { data } = await withTimeout<any>(supabase.auth.getSession() as any, 800, 'getSession timeout');
    return data?.session?.user ?? null;
  } catch {
    return null;
  }
}
