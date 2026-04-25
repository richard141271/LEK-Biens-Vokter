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

function isAllowlisted(email: string | null | undefined) {
  const raw = process.env.LEK_DEMO_ALLOWED_EMAILS || '';
  const list = raw
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  if (list.length === 0) return true;
  const e = String(email || '').trim().toLowerCase();
  if (!e) return false;
  return list.includes(e);
}

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, response: NextResponse.json({ success: false, error: 'Ikke logget inn' }, { status: 401 }) };
  }

  if (!isAllowlisted(user.email)) {
    return { ok: false as const, response: NextResponse.json({ success: false, error: 'Ingen tilgang' }, { status: 403 }) };
  }

  const adminVerifier = createAdminClient();
  const { data: profile, error } = await adminVerifier.from('profiles').select('role').eq('id', user.id).single();

  if (error) {
    return {
      ok: false as const,
      response: NextResponse.json({ success: false, error: 'Kunne ikke verifisere tilgang' }, { status: 500 }),
    };
  }

  if (profile?.role !== 'admin') {
    return { ok: false as const, response: NextResponse.json({ success: false, error: 'Ingen tilgang' }, { status: 403 }) };
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

export async function POST(request: Request) {
  const host = getHost(request);
  if (!isStagingHost(host) && !isDemoEnabled()) {
    return NextResponse.json({ success: false, error: 'Not available' }, { status: 404 });
  }

  const source = request.headers.get('x-lek-demo-source') || '';
  if (source !== 'demo-ui') {
    return NextResponse.json({ success: false, error: 'Kun tilgjengelig i demo-modus' }, { status: 403 });
  }

  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const demo = await requireValidDemoSession();
  if (!demo.ok) return demo.response;

  const body = await request.json().catch(() => null);
  const hiveId = String(body?.hiveId || '').trim();
  const inspection = body?.inspection || null;
  const details = String(body?.details || '').trim();
  const operationId = body?.operationId != null ? String(body.operationId) : crypto.randomUUID();

  if (!hiveId || !inspection) {
    return NextResponse.json({ success: false, error: 'Ugyldig payload' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: hive, error: hiveError } = await admin
    .from('hives')
    .select('id, apiary_id')
    .eq('id', hiveId)
    .eq('user_id', demo.demoOwnerId)
    .eq('demo_session_id', demo.demoSessionId)
    .single();

  if (hiveError || !hive) {
    return NextResponse.json({ success: false, error: 'Ugyldig demo-kube' }, { status: 403 });
  }

  const inspectionRow: any = {
    id: operationId,
    demo_session_id: demo.demoSessionId,
    hive_id: hiveId,
    user_id: demo.demoOwnerId,
    inspection_date: inspection.inspection_date,
    time: inspection.time,
    queen_seen: inspection.queen_seen,
    queen_color: inspection.queen_color ?? null,
    queen_year: inspection.queen_year ?? null,
    eggs_seen: inspection.eggs_seen,
    brood_condition: inspection.brood_condition,
    honey_stores: inspection.honey_stores,
    temperament: inspection.temperament,
    notes: inspection.notes,
    status: inspection.status,
    temperature: inspection.temperature ?? null,
    weather: inspection.weather,
    weather_place: inspection.weather_place ?? null,
    image_url: inspection.image_url ?? null,
    actions: inspection.actions ?? null,
  };

  const { error: inspectionError } = await admin.from('inspections').insert(inspectionRow);
  if (inspectionError) {
    return NextResponse.json({ success: false, error: inspectionError.message }, { status: 500 });
  }

  const hiveStatus = String(inspection.status || '').trim() === 'DØD' ? 'DØD' : 'AKTIV';
  await admin
    .from('hives')
    .update({
      status: hiveStatus,
      last_inspection_date: inspection.inspection_date,
    })
    .eq('id', hiveId)
    .eq('user_id', demo.demoOwnerId)
    .eq('demo_session_id', demo.demoSessionId);

  const logDetails = details || `Inspeksjon utført. Status: ${inspection.status || ''}.`;
  const { error: logError } = await admin.from('hive_logs').insert({
    id: operationId,
    demo_session_id: demo.demoSessionId,
    hive_id: hiveId,
    user_id: demo.demoOwnerId,
    action: 'INSPEKSJON',
    details: logDetails,
  });

  if (logError) {
    return NextResponse.json({ success: false, error: logError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
