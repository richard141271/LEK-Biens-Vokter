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
    const hiveId = String(body?.hiveId || '').trim();
    if (!hiveId) {
      return NextResponse.json({ success: false, error: 'Mangler hiveId' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: hiveRow, error: hiveError } = await admin
      .from('hives')
      .select('id, user_id')
      .eq('id', hiveId)
      .maybeSingle();

    if (hiveError) return NextResponse.json({ success: false, error: hiveError.message }, { status: 500 });
    if (!hiveRow?.id) return NextResponse.json({ success: false, error: 'Fant ikke kube' }, { status: 404 });
    if (String(hiveRow.user_id) !== String(user.id)) {
      return NextResponse.json({ success: false, error: 'Ingen tilgang' }, { status: 403 });
    }

    const { data: updated, error: updateError } = await admin
      .from('inspections')
      .update({ user_id: hiveRow.user_id })
      .eq('hive_id', hiveId)
      .neq('user_id', hiveRow.user_id)
      .select('id');

    if (updateError) return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });

    return NextResponse.json({ success: true, repaired: (updated || []).length });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Ukjent feil' }, { status: 500 });
  }
}
