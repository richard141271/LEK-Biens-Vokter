import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { hardDeleteUser } from '@/app/actions/user-management';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getHost(request: Request) {
  const rawHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  return rawHost.split(',')[0]?.trim().split(':')[0]?.toLowerCase() || '';
}

function isStagingHost(host: string) {
  return host === 'localhost' || host === '127.0.0.1' || host === 'staging.lekbie.no' || host.startsWith('staging.');
}

function isDemoEnabled() {
  return process.env.LEK_DEMO_ENABLED === '1' || process.env.LEK_DEMO_ENABLED === 'true';
}

export async function POST(request: Request) {
  const host = getHost(request);
  if (!isStagingHost(host) && !isDemoEnabled()) {
    return NextResponse.json({ success: false, error: 'Not available' }, { status: 404 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Ikke logget inn' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (profileError) {
    return NextResponse.json({ success: false, error: 'Kunne ikke verifisere tilgang' }, { status: 500 });
  }
  if (profile?.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Ingen tilgang' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const dryRun = Boolean(body?.dryRun);

  const { data: candidates, error: candidatesError } = await admin
    .from('profiles')
    .select('id, email, full_name')
    .or(
      [
        'email.ilike.%@demo.no',
        'email.ilike.demo-session-%@example.com',
        'full_name.eq.Demo konto',
        'full_name.ilike.kursdeltager%',
      ].join(',')
    )
    .order('created_at', { ascending: false });

  if (candidatesError) {
    return NextResponse.json({ success: false, error: candidatesError.message }, { status: 500 });
  }

  const list = Array.isArray(candidates) ? candidates : [];
  const uniqueUserIds = Array.from(
    new Set(
      list
        .map((p: any) => String(p?.id || '').trim())
        .filter(Boolean)
        .filter((id) => id !== user.id)
    )
  );

  if (dryRun) {
    return NextResponse.json({
      success: true,
      dryRun: true,
      candidates: list.map((p: any) => ({
        id: String(p?.id || ''),
        email: String(p?.email || ''),
        full_name: String(p?.full_name || ''),
      })),
      count: uniqueUserIds.length,
    });
  }

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];
  for (const id of uniqueUserIds) {
    const res = await hardDeleteUser(id);
    if ((res as any)?.error) results.push({ id, ok: false, error: String((res as any).error) });
    else results.push({ id, ok: true });
  }

  const deleted = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  return NextResponse.json({ success: true, deleted, failed, results });
}

