import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const COOKIE_NAME = 'grunneier_token';

function asString(v: any) {
  return typeof v === 'string' ? v : '';
}

async function getVerifiedContextForEmail(email: string) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value || '';
  if (!token) return { ok: false, contactId: '' };

  const admin = createAdminClient();
  const { data: magicToken } = await admin
    .from('magic_tokens')
    .select('email, expires_at, purpose, contact_id')
    .eq('token', token)
    .maybeSingle();

  const purpose = String((magicToken as any)?.purpose || 'portal').trim();
  if (purpose !== 'portal' && purpose !== 'agreement') return { ok: false, contactId: '' };

  const tokenEmail = String(magicToken?.email || '').trim().toLowerCase();
  const expiresAtMs = magicToken?.expires_at ? new Date(magicToken.expires_at).getTime() : 0;
  const isExpired = !Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now();
  if (isExpired) return { ok: false, contactId: '' };

  return {
    ok: tokenEmail === email.toLowerCase(),
    contactId: String((magicToken as any)?.contact_id || '').trim(),
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = asString(body?.email).trim().toLowerCase();
    const password = asString(body?.password);
    const fullName = asString(body?.fullName).trim();

    if (!email || !password || password.length < 8) {
      return NextResponse.json({ error: 'Mangler data' }, { status: 400 });
    }

    const admin = createAdminClient();
    const verification = await getVerifiedContextForEmail(email);
    if (!verification.ok) {
      return NextResponse.json(
        { error: 'Åpne engangslenken på e-posten din først, og opprett konto derfra.' },
        { status: 401 }
      );
    }

    const contactId = verification.contactId || '';
    let derivedFullName = fullName;
    if (!derivedFullName && contactId) {
      const { data: contact } = await admin.from('contacts').select('name').eq('id', contactId).maybeSingle();
      derivedFullName = String((contact as any)?.name || '').trim();
    }

    const createRes = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: contactId ? { landowner_contact_id: contactId } : undefined,
      user_metadata: {
        is_landowner: true,
        full_name: derivedFullName || null,
      },
    });

    if (!createRes.error) {
      return NextResponse.json({ success: true, created: true });
    }

    const msg = String(createRes.error.message || '');
    const alreadyExists =
      msg.toLowerCase().includes('already registered') ||
      msg.toLowerCase().includes('already') ||
      msg.toLowerCase().includes('exists');

    if (!alreadyExists) {
      return NextResponse.json({ error: msg || 'Kunne ikke opprette konto' }, { status: 500 });
    }
    return NextResponse.json({
      success: true,
      created: false,
      exists: true,
      passwordUpdated: false,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Ukjent feil' }, { status: 500 });
  }
}
