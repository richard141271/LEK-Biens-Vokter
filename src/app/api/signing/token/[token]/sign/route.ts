import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: { token: string } }) {
  try {
    const token = String(context.params.token || '').trim();
    const body = await request.json().catch(() => ({}));
    const signatureName = String(body?.signatureName || '').trim();
    const hasRead = body?.hasRead === true;

    if (!token || !signatureName || !hasRead) {
      return NextResponse.json({ error: 'Mangler data' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: signRequest, error } = await admin
      .from('sign_requests')
      .select('id, status, recipient_signed_at')
      .eq('token', token)
      .single();

    if (error || !signRequest) {
      return NextResponse.json({ error: 'Fant ikke signering' }, { status: 404 });
    }

    if (signRequest.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Dokumentet er allerede fullfoert' }, { status: 400 });
    }
    if (signRequest.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Signeringen er avbrutt' }, { status: 400 });
    }
    if (signRequest.recipient_signed_at) {
      return NextResponse.json({ error: 'Mottaker har allerede signert' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { error: updateError } = await admin
      .from('sign_requests')
      .update({
        recipient_signature_name: signatureName,
        recipient_signed_at: now,
        status: 'SIGNED_BY_RECIPIENT',
        updated_at: now,
      })
      .eq('id', signRequest.id);

    if (updateError) {
      return NextResponse.json({ error: 'Kunne ikke signere dokumentet' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Ukjent feil' }, { status: 500 });
  }
}
