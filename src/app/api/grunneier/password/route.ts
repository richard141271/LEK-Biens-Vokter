import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const COOKIE_NAME = 'grunneier_token';

function asString(v: any) {
  return typeof v === 'string' ? v : '';
}

async function getVerifiedEmailFromMagicToken() {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value || '';
  if (!token) return '';

  const admin = createAdminClient();
  const { data: magicToken } = await admin
    .from('magic_tokens')
    .select('email, expires_at')
    .eq('token', token)
    .maybeSingle();

  const email = String(magicToken?.email || '').trim().toLowerCase();
  const expiresAtMs = magicToken?.expires_at ? new Date(magicToken.expires_at).getTime() : 0;
  const isExpired = !Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now();
  if (!email || isExpired) return '';

  return email;
}

async function findUserIdByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  const target = email.toLowerCase();
  for (let page = 1; page <= 10; page++) {
    const listRes = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (listRes.error) {
      throw new Error(listRes.error.message || 'Kunne ikke hente brukere');
    }
    const users = (listRes.data?.users || []) as any[];
    const found = users.find((u) => String(u?.email || '').trim().toLowerCase() === target);
    if (found?.id) return String(found.id);
    if (users.length < 1000) break;
  }
  return '';
}

export async function POST(request: Request) {
  try {
    const verifiedEmail = await getVerifiedEmailFromMagicToken();
    if (!verifiedEmail) {
      return NextResponse.json({ error: 'Lenken er utløpt. Be om ny lenke.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const password = asString(body?.password);
    const fullName = asString(body?.fullName).trim();

    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Passord må være minst 8 tegn' }, { status: 400 });
    }

    const admin = createAdminClient();

    const existingUserId = await findUserIdByEmail(admin, verifiedEmail);
    if (existingUserId) {
      const updateRes = await admin.auth.admin.updateUserById(existingUserId, {
        email_confirm: true,
        password,
        user_metadata: {
          is_landowner: true,
          full_name: fullName || null,
        },
      });
      if (updateRes.error) {
        return NextResponse.json(
          { error: updateRes.error.message || 'Kunne ikke sette passord' },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, created: false });
    }

    const createRes = await admin.auth.admin.createUser({
      email: verifiedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        is_landowner: true,
        full_name: fullName || null,
      },
    });
    if (createRes.error) {
      return NextResponse.json({ error: createRes.error.message || 'Kunne ikke opprette konto' }, { status: 500 });
    }

    return NextResponse.json({ success: true, created: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Ukjent feil' }, { status: 500 });
  }
}

