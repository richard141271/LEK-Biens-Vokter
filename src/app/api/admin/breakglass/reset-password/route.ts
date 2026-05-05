import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function asString(v: any) {
  return typeof v === 'string' ? v : '';
}

function normalizeEmail(v: string) {
  return v.trim().toLowerCase();
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

async function findUserByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  const target = normalizeEmail(email);
  for (let page = 1; page <= 20; page++) {
    const res = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (res.error) throw new Error(res.error.message || 'Kunne ikke hente brukere');
    const users = (res.data?.users || []) as any[];
    const found = users.find((u) => normalizeEmail(String(u?.email || '')) === target);
    if (found?.id) return found;
    if (users.length < 1000) break;
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(asString(body?.email));
    const newPassword = asString(body?.newPassword);
    const secret = asString(body?.secret);

    if (!email || !newPassword || !secret) {
      return NextResponse.json({ error: 'Mangler data' }, { status: 400 });
    }
    if (newPassword.length < 12) {
      return NextResponse.json({ error: 'Passord må være minst 12 tegn' }, { status: 400 });
    }

    const envSecret = String(process.env.ADMIN_BREAKGLASS_SECRET || '');
    if (!envSecret) {
      return NextResponse.json({ error: 'Breakglass er ikke konfigurert' }, { status: 503 });
    }
    if (!safeEqual(secret, envSecret)) {
      return NextResponse.json({ error: 'Ingen tilgang' }, { status: 403 });
    }

    const allowlistRaw = String(process.env.ADMIN_BREAKGLASS_EMAIL_ALLOWLIST || '').trim();
    const allowlist = allowlistRaw
      ? allowlistRaw
          .split(',')
          .map((e) => normalizeEmail(e))
          .filter(Boolean)
      : [];

    if (allowlist.length > 0 && !allowlist.includes(email)) {
      return NextResponse.json({ error: 'E-post er ikke tillatt for breakglass' }, { status: 403 });
    }

    const admin = createAdminClient();
    const user = await findUserByEmail(admin, email);
    if (!user?.id) {
      return NextResponse.json({ error: 'Fant ikke bruker' }, { status: 404 });
    }

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, role')
      .eq('id', String(user.id))
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message || 'Kunne ikke verifisere rolle' }, { status: 500 });
    }
    if (String(profile?.role || '') !== 'admin') {
      return NextResponse.json({ error: 'Brukeren er ikke admin' }, { status: 403 });
    }

    const { error } = await admin.auth.admin.updateUserById(String(user.id), { password: newPassword });
    if (error) {
      return NextResponse.json({ error: error.message || 'Kunne ikke oppdatere passord' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Ukjent feil' }, { status: 500 });
  }
}

