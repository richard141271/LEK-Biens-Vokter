import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getHost(request: Request) {
  const rawHost =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    '';
  return rawHost.split(',')[0]?.trim().split(':')[0]?.toLowerCase() || '';
}

function isStagingHost(host: string) {
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === 'staging.lekbie.no' ||
    host.startsWith('staging.')
  );
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
      user: null,
    };
  }

  const adminVerifier = createAdminClient();
  const { data: profile, error } = await adminVerifier
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error) {
    return {
      ok: false as const,
      response: NextResponse.json({ success: false, error: 'Kunne ikke verifisere tilgang' }, { status: 500 }),
      user: null,
    };
  }

  if (profile?.role !== 'admin') {
    return {
      ok: false as const,
      response: NextResponse.json({ success: false, error: 'Ingen tilgang' }, { status: 403 }),
      user: null,
    };
  }

  return { ok: true as const, user };
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

  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('demo_sessions')
      .insert({
        created_by: auth.user.id,
        token_hash: tokenHash,
      })
      .select('id, created_at, expires_at')
      .single();

    if (error) {
      const isMissingTable =
        /demo_sessions/i.test(error.message) &&
        /(schema cache|does not exist|relation .* does not exist)/i.test(error.message);

      if (isMissingTable) {
        return NextResponse.json(
          {
            success: false,
            error: 'Demo-tabell mangler i databasen. Kjør migrasjon: src/db/migrations/86_demo_sessions.sql',
          },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      session: {
        id: data.id,
        createdAt: data.created_at,
        expiresAt: data.expires_at,
      },
      token,
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Ukjent feil' }, { status: 500 });
  }
}

