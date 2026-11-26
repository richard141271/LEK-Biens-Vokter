import { createBrowserClient } from '@supabase/ssr'

// #region debug-point A:mobile-auth-reporting
export function reportAuthDebug(hypothesisId: string, msg: string, data: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return
  try {
    void fetch('http://192.168.0.35:7777/event', {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({
        sessionId: 'android-login-stall',
        runId: 'pre-fix',
        hypothesisId,
        location: 'src/utils/supabase/client.ts',
        msg: `[DEBUG] ${msg}`,
        data,
        ts: Date.now(),
      }),
    }).catch(() => {})
  } catch {}
}
// #endregion

export const createClient = () => {
  // #region debug-point B:client-startup
  reportAuthDebug('B', 'Supabase browser client initialization started')
  // #endregion
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error("Supabase environment variables are missing!");
  }

  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  // #region debug-point B:client-ready
  reportAuthDebug('B', 'Supabase browser client initialized')
  // #endregion
  return client
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
  // #region debug-point A:auth-entry
  reportAuthDebug('A', 'Session lookup entered')
  // #endregion
  try {
    // #region debug-point A:get-user-start
    reportAuthDebug('A', 'getUser request started')
    // #endregion
    const { data, error } = await withTimeout<any>(supabase.auth.getUser() as any, 8000, 'getUser timeout');
    // #region debug-point A:get-user-result
    reportAuthDebug('A', 'getUser request completed', { hasUser: Boolean(data?.user), errorCode: error?.code || null })
    // #endregion
    if (!error && data?.user) return data.user;
  } catch (error: any) {
    // #region debug-point A:get-user-error
    reportAuthDebug('A', 'getUser request failed', { errorName: error?.name || 'unknown', isTimeout: error?.message === 'getUser timeout' })
    // #endregion
  }

  try {
    // #region debug-point A:get-session-start
    reportAuthDebug('A', 'getSession request started')
    // #endregion
    const { data } = await withTimeout<any>(supabase.auth.getSession() as any, 4000, 'getSession timeout');
    // #region debug-point A:get-session-result
    reportAuthDebug('A', 'getSession request completed', { hasSession: Boolean(data?.session), hasUser: Boolean(data?.session?.user) })
    // #endregion
    return data?.session?.user ?? null;
  } catch (error: any) {
    // #region debug-point A:get-session-error
    reportAuthDebug('A', 'getSession request failed', { errorName: error?.name || 'unknown', isTimeout: error?.message === 'getSession timeout' })
    // #endregion
    return null;
  }
}
