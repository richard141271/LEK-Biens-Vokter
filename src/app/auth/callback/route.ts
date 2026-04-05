import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;
  const host = requestUrl.hostname.toLowerCase();
  const nextParam = requestUrl.searchParams.get('next');
  const safeNext = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : null;

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // URL to redirect to after sign in process completes
  const defaultNext = host === 'aksjer.lekbie.no' || host.startsWith('aksjer.') ? '/aksjer/dashboard' : '/dashboard';
  return NextResponse.redirect(`${origin}${safeNext || defaultNext}`);
}
