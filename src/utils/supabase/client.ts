import { createBrowserClient } from '@supabase/ssr'

export const createClient = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error("Supabase environment variables are missing!");
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export function withTimeout<T>(promise: PromiseLike<T>, ms: number, message = 'Timeout'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error(message)), ms);

    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

export async function getUserWithSessionFallback(supabase: any) {
  try {
    const { data, error } = await withTimeout<any>(supabase.auth.getUser() as any, 8000, 'getUser timeout');
    if (!error && data?.user) return data.user;
  } catch {}

  try {
    const { data } = await withTimeout<any>(supabase.auth.getSession() as any, 4000, 'getSession timeout');
    return data?.session?.user ?? null;
  } catch {
    return null;
  }
}
