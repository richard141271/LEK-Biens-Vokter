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

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ success: false, error: 'Ikke logget inn' }, { status: 401 }),
    };
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
    return {
      ok: false as const,
      response: NextResponse.json({ success: false, error: 'Ingen tilgang' }, { status: 403 }),
    };
  }

  return { ok: true as const };
}

function extractInspectionImagePaths(text: string) {
  const paths = new Set<string>();
  const regex = /\/storage\/v1\/object\/public\/inspection-images\/([^?\s]+)/g;
  let match: RegExpExecArray | null = null;
  while ((match = regex.exec(text)) !== null) {
    const raw = match[1] || '';
    if (!raw) continue;
    try {
      paths.add(decodeURIComponent(raw));
    } catch {
      paths.add(raw);
    }
  }
  return Array.from(paths);
}

export async function POST(request: Request) {
  const host = getHost(request);
  if (!isStagingHost(host)) {
    return NextResponse.json({ success: false, error: 'Not available' }, { status: 404 });
  }

  const source = request.headers.get('x-lek-demo-source') || '';
  if (source !== 'temadag') {
    return NextResponse.json({ success: false, error: 'Kun tilgjengelig fra Temadag' }, { status: 403 });
  }

  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const cookieStore = cookies();
  const sessionId = cookieStore.get('lek_demo_session_id')?.value || '';
  const token = cookieStore.get('lek_demo_session_token')?.value || '';

  if (!sessionId || !token) {
    return NextResponse.json({ success: false, error: 'Mangler demo-session' }, { status: 401 });
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const admin = createAdminClient();

  const { data: session, error: sessionError } = await admin
    .from('demo_sessions')
    .select('id, token_hash, expires_at, ended_at, demo_owner_id')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ success: false, error: 'Ugyldig demo-session' }, { status: 401 });
  }

  if (String(session.token_hash) !== tokenHash) {
    return NextResponse.json({ success: false, error: 'Ugyldig demo-token' }, { status: 401 });
  }

  if (!session.expires_at || new Date(String(session.expires_at)).getTime() <= Date.now()) {
    return NextResponse.json({ success: false, error: 'Demo-session er utløpt' }, { status: 403 });
  }

  const { data: inspections, error: inspectionsError } = await admin
    .from('inspections')
    .select('image_url, notes')
    .eq('demo_session_id', sessionId);

  const missingColumn =
    /demo_session_id/i.test(inspectionsError?.message || '') &&
    /(column .* does not exist|schema cache|does not exist)/i.test(inspectionsError?.message || '');

  if (missingColumn) {
    return NextResponse.json(
      { success: false, error: 'Demo-skriving er ikke aktivert i databasen. Kjør migrasjon: src/db/migrations/87_demo_writing.sql' },
      { status: 500 }
    );
  }

  if (inspectionsError) {
    return NextResponse.json({ success: false, error: inspectionsError.message }, { status: 500 });
  }

  const imagePaths = new Set<string>();
  for (const row of inspections || []) {
    const imageUrl = String((row as any)?.image_url || '');
    const notes = String((row as any)?.notes || '');
    for (const p of extractInspectionImagePaths(imageUrl)) imagePaths.add(p);
    for (const p of extractInspectionImagePaths(notes)) imagePaths.add(p);
  }

  let deletedImages = 0;
  if (imagePaths.size > 0) {
    try {
      const { data: removed, error: removeError } = await admin.storage.from('inspection-images').remove(Array.from(imagePaths));
      if (!removeError) deletedImages = Array.isArray(removed) ? removed.length : Array.from(imagePaths).length;
    } catch {}
  }

  const { error: deleteLogsError, count: logsCount } = await admin
    .from('hive_logs')
    .delete({ count: 'exact' })
    .eq('demo_session_id', sessionId);
  if (deleteLogsError) return NextResponse.json({ success: false, error: deleteLogsError.message }, { status: 500 });

  const { error: deleteInspectionsError, count: inspectionsCount } = await admin
    .from('inspections')
    .delete({ count: 'exact' })
    .eq('demo_session_id', sessionId);
  if (deleteInspectionsError) return NextResponse.json({ success: false, error: deleteInspectionsError.message }, { status: 500 });

  const { error: deleteHivesError, count: hivesCount } = await admin
    .from('hives')
    .delete({ count: 'exact' })
    .eq('demo_session_id', sessionId);
  if (deleteHivesError) return NextResponse.json({ success: false, error: deleteHivesError.message }, { status: 500 });

  const { error: deleteApiariesError, count: apiariesCount } = await admin
    .from('apiaries')
    .delete({ count: 'exact' })
    .eq('demo_session_id', sessionId);
  if (deleteApiariesError) return NextResponse.json({ success: false, error: deleteApiariesError.message }, { status: 500 });

  await admin.from('demo_sessions').update({ ended_at: new Date().toISOString() }).eq('id', sessionId);

  const response = NextResponse.json({
    success: true,
    deleted: {
      apiaries: apiariesCount || 0,
      hives: hivesCount || 0,
      inspections: inspectionsCount || 0,
      logs: logsCount || 0,
      images: deletedImages,
    },
  });

  const isSecure = host !== 'localhost' && host !== '127.0.0.1';
  response.cookies.set('lek_demo_session_id', '', { httpOnly: true, sameSite: 'lax', secure: isSecure, path: '/', maxAge: 0 });
  response.cookies.set('lek_demo_session_token', '', { httpOnly: true, sameSite: 'lax', secure: isSecure, path: '/', maxAge: 0 });

  return response;
}
