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
        'id, title, description, token, pdf_path, completed_pdf_path, receipt_pdf_path, recipient_name, recipient_email, status, recipient_signed_at, sender_signed_at, recipient_signature_name, sender_signature_name'
      )
      .eq('token', token)
      .single();

    if (error || !signRequest) {
      return NextResponse.json({ error: 'Fant ikke signering' }, { status: 404 });
    }

    if (signRequest.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Dokumentet er ikke ferdig signert enda' }, { status: 400 });
    }

    const completedPath = signRequest.completed_pdf_path || signRequest.pdf_path;
    const [completedSigned, receiptSigned] = await Promise.all([
      admin.storage.from('sign-documents').createSignedUrl(completedPath, 60 * 60),
      signRequest.receipt_pdf_path
        ? admin.storage.from('sign-documents').createSignedUrl(signRequest.receipt_pdf_path, 60 * 60)
        : Promise.resolve({ data: null as any, error: null as any }),
    ]);

    if (completedSigned.error || !completedSigned.data?.signedUrl) {
      return NextResponse.json({ error: 'Kunne ikke hente ferdig dokument' }, { status: 500 });
    }

    return NextResponse.json({
      request: signRequest,
      completedPdfUrl: completedSigned.data.signedUrl,
      receiptPdfUrl: receiptSigned.data?.signedUrl || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Ukjent feil' }, { status: 500 });
  }
}

