import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const id = String(context.params.id || '').trim();
    const body = await request.json().catch(() => ({}));
    const signatureName = String(body?.signatureName || '').trim();

    if (!id || !signatureName) {
      return NextResponse.json({ error: 'Mangler data' }, { status: 400 });
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Ikke logget inn' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: signRequest, error } = await admin
      .from('sign_requests')
      .select('*')
      .eq('id', id)
      .eq('created_by_user_id', user.id)
      .single();

    if (error || !signRequest) {
      return NextResponse.json({ error: 'Fant ikke signering' }, { status: 404 });
    }

    if (!signRequest.recipient_signed_at) {
      return NextResponse.json({ error: 'Mottaker maa signere foerst' }, { status: 400 });
    }

    if (signRequest.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Signeringen er allerede fullfoert' }, { status: 400 });
    }

    if (signRequest.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Signeringen er avbrutt' }, { status: 400 });
    }

    const completedPdfPath =
      signRequest.completed_pdf_path || `${user.id}/signing-completed/${signRequest.id}-${Date.now()}.pdf`;

    if (!signRequest.completed_pdf_path) {
      const { error: copyError } = await admin.storage.from('sign-documents').copy(signRequest.pdf_path, completedPdfPath);
      if (copyError) {
        return NextResponse.json({ error: 'Kunne ikke lagre ferdig signert dokument' }, { status: 500 });
      }
    }

    const now = new Date().toISOString();
    const { error: updateError } = await admin
      .from('sign_requests')
      .update({
        sender_signature_name: signatureName,
        sender_signed_at: now,
        status: 'COMPLETED',
        updated_at: now,
        completed_pdf_path: completedPdfPath,
      })
      .eq('id', signRequest.id);

    if (updateError) {
      return NextResponse.json({ error: 'Kunne ikke fullfoere signering' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Ukjent feil' }, { status: 500 });
  }
}
