import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'grunneier_token';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = (searchParams.get('token') || '').trim();

    if (!token) {
      return NextResponse.json({ error: 'Mangler token' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: magicToken, error } = await admin
      .from('magic_tokens')
      .select('id, token, email, expires_at, used')
      .eq('token', token)
      .single();

    if (error || !magicToken) {
      return NextResponse.json({ error: 'Ugyldig lenke' }, { status: 400 });
    }

    const expiresAtMs = new Date(magicToken.expires_at).getTime();
    const isExpired = Number.isFinite(expiresAtMs) ? expiresAtMs <= Date.now() : true;

    if (magicToken.used) {
      return NextResponse.json(
        { error: 'Lenken er utløpt', code: 'used' },
        { status: 410 }
      );
    }

    if (isExpired) {
      return NextResponse.json(
        { error: 'Lenken er utløpt', code: 'expired' },
        { status: 410 }
      );
    }

    const { error: updateError } = await admin
      .from('magic_tokens')
      .update({ used: true })
      .eq('id', magicToken.id);

    if (updateError) {
      return NextResponse.json({ error: 'Kunne ikke aktivere lenke' }, { status: 500 });
    }

    const res = NextResponse.json({ success: true });
    res.cookies.set({
      name: COOKIE_NAME,
      value: magicToken.token,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      expires: new Date(magicToken.expires_at),
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Ukjent feil' }, { status: 500 });
  }
}
