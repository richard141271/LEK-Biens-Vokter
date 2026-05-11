import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function toPath(input: string) {
  const raw = String(input || '').trim();
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      return new URL(raw).pathname || '';
    } catch {
      return '';
    }
  }
  return raw;
}

function extractEntity(pathname: string) {
  const p = String(pathname || '').trim();
  const hiveMatch = p.match(/^\/hives\/([^/]+)/i);
  if (hiveMatch?.[1]) return { kind: 'hive' as const, id: hiveMatch[1] };
  const apiaryMatch = p.match(/^\/apiaries\/([^/]+)/i);
  if (apiaryMatch?.[1]) return { kind: 'apiary' as const, id: apiaryMatch[1] };
  return null;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const decodedText = String(body?.decodedText || '');

  const pathname = toPath(decodedText);
  const entity = extractEntity(pathname);
  if (!entity) {
    return NextResponse.json({ success: false, error: 'Ugyldig QR-kode' }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ success: false, error: 'Ikke logget inn' }, { status: 401 });
  }

  let admin: ReturnType<typeof createAdminClient> | null = null;
  try {
    admin = createAdminClient();
  } catch {
    admin = null;
  }

  const db = admin ?? supabase;

  if (entity.kind === 'hive') {
    const { data: hive, error: hiveError } = await db
      .from('hives')
      .select('id, user_id')
      .eq('id', entity.id)
      .single();

    if (hiveError || !hive?.id) {
      return NextResponse.json({ success: false, error: 'Kube ikke funnet' }, { status: 404 });
    }

    const ownerId = String((hive as any).user_id || '').trim();
    if (!ownerId) {
      return NextResponse.json({ success: false, error: 'Kube mangler eier' }, { status: 500 });
    }

    if (ownerId !== user.id) {
      const { data: access } = await db
        .from('account_access')
        .select('owner_id, member_id')
        .eq('owner_id', ownerId)
        .eq('member_id', user.id)
        .maybeSingle();

      if (!access) {
        return NextResponse.json({ success: false, error: 'Ingen tilgang til denne kuben' }, { status: 403 });
      }
    }

    return NextResponse.json({ success: true, kind: 'hive', id: hive.id, redirectTo: `/hives/${hive.id}` });
  }

  const { data: apiary, error: apiaryError } = await db
    .from('apiaries')
    .select('id, user_id')
    .eq('id', entity.id)
    .single();

  if (apiaryError || !apiary?.id) {
    return NextResponse.json({ success: false, error: 'Bigård ikke funnet' }, { status: 404 });
  }

  const ownerId = String((apiary as any).user_id || '').trim();
  if (!ownerId) {
    return NextResponse.json({ success: false, error: 'Bigård mangler eier' }, { status: 500 });
  }

  if (ownerId !== user.id) {
    const { data: access } = await db
      .from('account_access')
      .select('owner_id, member_id')
      .eq('owner_id', ownerId)
      .eq('member_id', user.id)
      .maybeSingle();

    if (!access) {
      return NextResponse.json({ success: false, error: 'Ingen tilgang til denne bigården' }, { status: 403 });
    }
  }

  return NextResponse.json({ success: true, kind: 'apiary', id: apiary.id, redirectTo: `/apiaries/${apiary.id}` });
}

