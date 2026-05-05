import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Ikke logget inn' }, { status: 401 });
    }

    const adminVerifier = createAdminClient();
    const { data: adminProfile } = await adminVerifier
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Ingen tilgang' }, { status: 403 });
    }

    const agreementId = String(params?.id || '').trim();
    if (!agreementId) {
      return NextResponse.json({ error: 'Mangler id' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from('grunneier_agreements')
      .update({
        status: 'active',
        terminated_at: null,
        terminated_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agreementId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Ukjent feil' }, { status: 500 });
  }
}
