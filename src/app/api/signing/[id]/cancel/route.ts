import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(_request: Request, context: { params: { id: string } }) {
  try {
    const id = String(context.params.id || '').trim();
    if (!id) {
      return NextResponse.json({ error: 'Mangler id' }, { status: 400 });
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Ikke logget inn' }, { status: 401 });
    }

    const { data: signRequest, error } = await supabase
      .from('sign_requests')
      .select('id, status')
      .eq('id', id)
      .eq('created_by_user_id', user.id)
      .single();

    if (error || !signRequest) {
      return NextResponse.json({ error: 'Fant ikke signering' }, { status: 404 });
    }

    if (signRequest.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Kan ikke avbryte en fullfoert signering' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('sign_requests')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('id', signRequest.id);

    if (updateError) {
      return NextResponse.json({ error: 'Kunne ikke avbryte signering' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Ukjent feil' }, { status: 500 });
  }
}
