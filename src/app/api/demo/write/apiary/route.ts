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
  return host === 'localhost' || host === '127.0.0.1' || host === 'staging.lekbie.no' || host.startsWith('staging.');
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

async function requireValidDemoSession(request: Request) {
  const cookieStore = cookies();
  const sessionId = cookieStore.get('lek_demo_session_id')?.value || '';
  const token = cookieStore.get('lek_demo_session_token')?.value || '';

  if (!sessionId || !token) {
    return {
      ok: false as const,
      response: NextResponse.json({ success: false, error: 'Mangler demo-session' }, { status: 401 }),
      demoSessionId: null,
      demoOwnerId: null,
    };
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('demo_sessions')
    .select('id, token_hash, expires_at, ended_at, demo_owner_id')
    .eq('id', sessionId)
    .single();

  if (error || !data) {
    return {
      ok: false as const,
      response: NextResponse.json({ success: false, error: 'Ugyldig demo-session' }, { status: 401 }),
      demoSessionId: null,
      demoOwnerId: null,
    };
  }

  if (String(data.token_hash) !== tokenHash) {
    return {
      ok: false as const,
      response: NextResponse.json({ success: false, error: 'Ugyldig demo-token' }, { status: 401 }),
      demoSessionId: null,
      demoOwnerId: null,
    };
  }

  if (data.ended_at) {
    return {
      ok: false as const,
      response: NextResponse.json({ success: false, error: 'Demo-session er avsluttet' }, { status: 403 }),
      demoSessionId: null,
      demoOwnerId: null,
    };
  }

  if (!data.expires_at || new Date(String(data.expires_at)).getTime() <= Date.now()) {
    return {
      ok: false as const,
      response: NextResponse.json({ success: false, error: 'Demo-session er utløpt' }, { status: 403 }),
      demoSessionId: null,
      demoOwnerId: null,
    };
  }

  const demoOwnerId = String(data.demo_owner_id || '');
  if (!demoOwnerId) {
    return {
      ok: false as const,
      response: NextResponse.json({ success: false, error: 'Demo-konto mangler i session' }, { status: 500 }),
      demoSessionId: null,
      demoOwnerId: null,
    };
  }

  return { ok: true as const, demoSessionId: sessionId, demoOwnerId };
}

function getPrefixForType(type: string) {
  if (type === 'bigård') return 'BG';
  if (type === 'lager') return 'LG';
  if (type === 'bil') return 'BIL';
  if (type === 'oppstart') return 'OPP';
  return 'BG';
}

async function getNextApiaryNumber(admin: ReturnType<typeof createAdminClient>, ownerId: string, prefix: string) {
  const { data } = await admin.from('apiaries').select('apiary_number').eq('user_id', ownerId).ilike('apiary_number', `${prefix}-%`);
  const list = Array.isArray(data) ? data : [];

  let maxNum = 0;
  for (const row of list) {
    const value = String((row as any)?.apiary_number || '');
    const match = value.match(/-(\d{1,})/);
    if (!match) continue;
    const num = parseInt(match[1], 10);
    if (!Number.isNaN(num) && num > maxNum) maxNum = num;
  }

  const next = maxNum + 1;
  return `${prefix}-${next.toString().padStart(3, '0')}`;
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

  const demo = await requireValidDemoSession(request);
  if (!demo.ok) return demo.response;

  const body = await request.json().catch(() => null);
  const name = String(body?.name || '').trim();
  const type = String(body?.type || 'bigård').trim();
  const location = String(body?.location || '').trim();
  const coordinates = body?.coordinates != null ? String(body.coordinates) : null;
  const latitude = typeof body?.latitude === 'number' ? body.latitude : body?.latitude != null ? Number(body.latitude) : null;
  const longitude = typeof body?.longitude === 'number' ? body.longitude : body?.longitude != null ? Number(body.longitude) : null;
  const registrationNumber = body?.registration_number != null ? String(body.registration_number) : null;

  if (!name) {
    return NextResponse.json({ success: false, error: 'Navn mangler' }, { status: 400 });
  }

  const admin = createAdminClient();
  const prefix = getPrefixForType(type);
  const apiaryNumber = await getNextApiaryNumber(admin, demo.demoOwnerId, prefix);

  const { data: created, error } = await admin
    .from('apiaries')
    .insert({
      user_id: demo.demoOwnerId,
      demo_session_id: demo.demoSessionId,
      name,
      type,
      location: location || null,
      coordinates,
      latitude: Number.isFinite(latitude) ? latitude : null,
      longitude: Number.isFinite(longitude) ? longitude : null,
      apiary_number: apiaryNumber,
      registration_number: registrationNumber,
    })
    .select('id, apiary_number')
    .single();

  if (error || !created) {
    return NextResponse.json({ success: false, error: error?.message || 'Kunne ikke opprette bigård' }, { status: 500 });
  }

  return NextResponse.json({ success: true, apiary: created });
}
