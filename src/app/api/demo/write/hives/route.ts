import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getHost(request: Request) {
  const rawHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  return rawHost.split(',')[0]?.trim().split(':')[0]?.toLowerCase() || '';
}

function isStagingHost(host: string) {
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === 'staging.lekbie.no' ||
    host.endsWith('.staging.lekbie.no') ||
    host.startsWith('staging.') ||
    host === 'lek-biens-vokter-staging.vercel.app' ||
    host.endsWith('-staging.vercel.app') ||
    host.includes('lek-biens-vokter-staging') ||
    host.includes('-staging.')
  );
}

function isDemoEnabled() {
  return process.env.LEK_DEMO_ENABLED === '1' || process.env.LEK_DEMO_ENABLED === 'true';
}

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, response: NextResponse.json({ success: false, error: 'Ikke logget inn' }, { status: 401 }) };
  }

  return { ok: true as const };
}

async function requireValidDemoSession() {
  const cookieStore = cookies();
  const sessionId = cookieStore.get('lek_demo_session_id')?.value || '';
  const token = cookieStore.get('lek_demo_session_token')?.value || '';

  if (!sessionId || !token) {
    return { ok: false as const, response: NextResponse.json({ success: false, error: 'Mangler demo-session' }, { status: 401 }) };
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('demo_sessions')
    .select('id, token_hash, expires_at, ended_at, demo_owner_id')
    .eq('id', sessionId)
    .single();

  if (error || !data) {
    return { ok: false as const, response: NextResponse.json({ success: false, error: 'Ugyldig demo-session' }, { status: 401 }) };
  }

  if (String(data.token_hash) !== tokenHash) {
    return { ok: false as const, response: NextResponse.json({ success: false, error: 'Ugyldig demo-token' }, { status: 401 }) };
  }

  if (data.ended_at) {
    return { ok: false as const, response: NextResponse.json({ success: false, error: 'Demo-session er avsluttet' }, { status: 403 }) };
  }

  if (!data.expires_at || new Date(String(data.expires_at)).getTime() <= Date.now()) {
    return { ok: false as const, response: NextResponse.json({ success: false, error: 'Demo-session er utløpt' }, { status: 403 }) };
  }

  const demoOwnerId = String(data.demo_owner_id || '');
  if (!demoOwnerId) {
    return { ok: false as const, response: NextResponse.json({ success: false, error: 'Demo-konto mangler i session' }, { status: 500 }) };
  }

  return { ok: true as const, demoSessionId: sessionId, demoOwnerId };
}

async function getNextHiveNumber(admin: ReturnType<typeof createAdminClient>, ownerId: string) {
  const { data } = await admin.from('hives').select('hive_number').eq('user_id', ownerId);
  const list = Array.isArray(data) ? data : [];

  let maxNum = 0;
  for (const row of list) {
    const value = String((row as any)?.hive_number || '');
    const match = value.match(/KUBE-(\d+)/);
    if (!match) continue;
    const num = parseInt(match[1], 10);
    if (!Number.isNaN(num) && num > maxNum) maxNum = num;
  }

  return maxNum + 1;
}

export async function POST(request: Request) {
  const host = getHost(request);
  if (!isStagingHost(host) && !isDemoEnabled()) {
    return NextResponse.json({ success: false, error: 'Not available' }, { status: 404 });
  }

  const source = request.headers.get('x-lek-demo-source') || '';
  if (source !== 'demo-ui') {
    return NextResponse.json({ success: false, error: 'Kun tilgjengelig i demo-modus' }, { status: 403 });
  }

  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const demo = await requireValidDemoSession();
  if (!demo.ok) return demo.response;

  const body = await request.json().catch(() => null);
  const apiaryId = String(body?.apiaryId || '').trim();
  const countRaw = body?.count;
  const count = typeof countRaw === 'number' ? countRaw : parseInt(String(countRaw || '1'), 10);

  if (!apiaryId) {
    return NextResponse.json({ success: false, error: 'apiaryId mangler' }, { status: 400 });
  }
  if (!Number.isFinite(count) || count < 1 || count > 50) {
    return NextResponse.json({ success: false, error: 'Ugyldig antall' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: apiary, error: apiaryError } = await admin
    .from('apiaries')
    .select('id')
    .eq('id', apiaryId)
    .eq('user_id', demo.demoOwnerId)
    .eq('demo_session_id', demo.demoSessionId)
    .single();

  if (apiaryError || !apiary) {
    return NextResponse.json({ success: false, error: 'Ugyldig demo-bigård' }, { status: 403 });
  }

  const startNum = await getNextHiveNumber(admin, demo.demoOwnerId);
  const newHives: any[] = [];
  for (let i = 0; i < count; i++) {
    newHives.push({
      user_id: demo.demoOwnerId,
      demo_session_id: demo.demoSessionId,
      apiary_id: apiaryId,
      hive_number: `KUBE-${(startNum + i).toString().padStart(3, '0')}`,
      status: 'aktiv',
    });
  }

  const { data: created, error } = await admin.from('hives').insert(newHives).select('id, apiary_id');
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, hives: created || [] });
}
