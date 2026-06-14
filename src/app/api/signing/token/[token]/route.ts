import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: { token: string } }) {
  try {
    const token = String(context.params.token || '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Mangler token' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: signRequest, error } = await admin
      .from('sign_requests')
      .select(
        'id, title, description, pdf_path, recipient_name, status, recipient_signed_at, sender_signed_at, recipient_signature_name, sender_signature_name'
      )
      .eq('token', token)
      .single();

    if (error || !signRequest) {
      return NextResponse.json({ error: 'Fant ikke signering' }, { status: 404 });
    }

    const { data: signedData, error: signedError } = await admin.storage
      .from('sign-documents')
      .createSignedUrl(signRequest.pdf_path, 60 * 60);

    if (signedError || !signedData?.signedUrl) {
      return NextResponse.json({ error: 'Kunne ikke hente PDF' }, { status: 500 });
    }

    return NextResponse.json({ request: signRequest, pdfUrl: signedData.signedUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Ukjent feil' }, { status: 500 });
  }
}
