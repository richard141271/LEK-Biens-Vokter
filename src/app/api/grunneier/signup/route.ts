import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const COOKIE_NAME = 'grunneier_token';

function asString(v: any) {
  return typeof v === 'string' ? v : '';
}

async function isVerifiedForEmail(email: string) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value || '';
  if (!token) return false;

  const admin = createAdminClient();
  const { data: magicToken } = await admin
    .from('magic_tokens')
    .select('email, expires_at')
    .eq('token', token)
    .maybeSingle();

  const tokenEmail = String(magicToken?.email || '').trim().toLowerCase();
  const expiresAtMs = magicToken?.expires_at ? new Date(magicToken.expires_at).getTime() : 0;
  const isExpired = !Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now();
  if (isExpired) return false;

  return tokenEmail === email.toLowerCase();
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

    const createRes = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        is_landowner: true,
        full_name: fullName || null,
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

    let foundUserId = '';
    for (let page = 1; page <= 10; page++) {
      const listRes = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (listRes.error) {
        return NextResponse.json(
          { error: listRes.error.message || 'Kunne ikke slå opp eksisterende konto' },
          { status: 500 }
        );
      }
      const users = (listRes.data?.users || []) as any[];
      const found = users.find((u) => String(u?.email || '').trim().toLowerCase() === email);
      if (found?.id) {
        foundUserId = String(found.id);
        break;
      }
      if (users.length < 1000) break;
    }

    if (!foundUserId) {
      return NextResponse.json({ error: 'Konto finnes allerede. Prøv å logge inn.' }, { status: 409 });
    }

    const canUpdatePassword = await isVerifiedForEmail(email);
    if (canUpdatePassword) {
      const updateRes = await admin.auth.admin.updateUserById(foundUserId, {
        email_confirm: true,
        password,
        user_metadata: {
          is_landowner: true,
          full_name: fullName || null,
        },
      });
      if (updateRes.error) {
        return NextResponse.json(
          { error: updateRes.error.message || 'Kunne ikke oppdatere passord' },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, created: false, passwordUpdated: true });
    }

    const updateRes = await admin.auth.admin.updateUserById(foundUserId, {
      email_confirm: true,
      user_metadata: {
        is_landowner: true,
        full_name: fullName || null,
      },
    });
    if (updateRes.error) {
      return NextResponse.json(
        { error: updateRes.error.message || 'Kunne ikke oppdatere konto' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      created: false,
      passwordUpdated: false,
      exists: true,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Ukjent feil' }, { status: 500 });
  }
}
