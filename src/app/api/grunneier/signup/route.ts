import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function asString(v: any) {
  return typeof v === 'string' ? v : '';
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
      if (listRes.error) break;
      const users = (listRes.data?.users || []) as any[];
      const found = users.find((u) => String(u?.email || '').trim().toLowerCase() === email);
      if (found?.id) {
        foundUserId = String(found.id);
        break;
      }
      if (users.length < 1000) break;
    }

    if (!foundUserId) {
      return NextResponse.json({ success: true, created: false });
    }

    await admin.auth.admin.updateUserById(foundUserId, {
      email_confirm: true,
      user_metadata: {
        is_landowner: true,
        full_name: fullName || null,
      },
    });

    return NextResponse.json({ success: true, created: false });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Ukjent feil' }, { status: 500 });
  }
}

