import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ success: false, error: 'Ikke logget inn' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const ownerId = String(body?.ownerId || '').trim();
    if (!ownerId) return NextResponse.json({ success: false, error: 'Mangler ownerId' }, { status: 400 });

    const admin = createAdminClient();
    const { error } = await admin
      .from('account_access')
      .delete()
      .eq('owner_id', ownerId)
      .eq('member_id', user.id);

    if (error) {
      const msg = String(error?.message || 'Kunne ikke fjerne tilgang');
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Ukjent feil' }, { status: 500 });
  }
}
