import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host =
    request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  return `${proto}://${host}`;
}

export async function GET(request: Request) {
  const admin = createAdminClient();
  const url = new URL(request.url);
  const token = String(url.searchParams.get('token') || '').trim();

  if (!token) {
    return NextResponse.json({ error: 'Mangler token' }, { status: 400 });
  }

  const { data: tokenRow, error: tokenError } = await admin
    .from('magic_tokens')
    .select('email, expires_at, used, purpose, user_id')
    .eq('token', token)
    .maybeSingle();

  if (tokenError) {
    return NextResponse.json({ error: tokenError.message }, { status: 500 });
  }

  if (!tokenRow?.email) {
    return NextResponse.json({ error: 'Ugyldig token' }, { status: 404 });
  }

  if (tokenRow.purpose !== 'company_login') {
    return NextResponse.json({ error: 'Ugyldig token-type' }, { status: 400 });
  }

  if (tokenRow.used) {
    return NextResponse.json({ error: 'Token er allerede brukt' }, { status: 400 });
  }

  const expiresAt = tokenRow.expires_at ? new Date(tokenRow.expires_at) : null;
  if (!expiresAt || expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: 'Token er utløpt' }, { status: 400 });
  }

  await admin.from('magic_tokens').update({ used: true }).eq('token', token);

  const redirectTo = `${getBaseUrl(request)}/dashboard`;
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: tokenRow.email,
    options: { redirectTo },
  });

  if (linkError || !linkData?.properties?.action_link) {
    return NextResponse.json(
      { error: linkError?.message || 'Kunne ikke generere innlogging' },
      { status: 500 }
    );
  }

  return NextResponse.redirect(linkData.properties.action_link, { status: 302 });
}

