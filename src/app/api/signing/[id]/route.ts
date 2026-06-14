import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { buildPublicCompletedSigningUrl, buildPublicSigningUrl, getBaseUrlFromHeaders, normalizeSignRequestRecord } from '@/lib/signing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: { id: string } }) {
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

    const { data: request, error } = await supabase
      .from('sign_requests')
      .select('*')
      .eq('id', id)
      .eq('created_by_user_id', user.id)
      .single();

    if (error || !request) {
      return NextResponse.json({ error: 'Fant ikke signering' }, { status: 404 });
    }

    const pdfPath = request.completed_pdf_path || request.pdf_path;

    const admin = createAdminClient();
    const [{ data: profile }, { data: signedData, error: signedError }, receiptSigned] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
      admin.storage.from('sign-documents').createSignedUrl(pdfPath, 60 * 60),
      request.receipt_pdf_path ? admin.storage.from('sign-documents').createSignedUrl(request.receipt_pdf_path, 60 * 60) : Promise.resolve(null),
    ]);

    if (signedError || !signedData?.signedUrl) {
      return NextResponse.json({ error: 'Kunne ikke hente PDF' }, { status: 500 });
    }

    return NextResponse.json({
      request: normalizeSignRequestRecord(request as any),
      pdfUrl: signedData.signedUrl,
      publicSignUrl: buildPublicSigningUrl(getBaseUrlFromHeaders(new Headers(_request.headers)), request.token),
      publicCompletedUrl: buildPublicCompletedSigningUrl(getBaseUrlFromHeaders(new Headers(_request.headers)), request.token),
      receiptPdfUrl: receiptSigned && (receiptSigned as any)?.data?.signedUrl ? (receiptSigned as any).data.signedUrl : null,
      senderName: String(profile?.full_name || user.user_metadata?.full_name || user.email || '').trim(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Ukjent feil' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: { id: string } }) {
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

    const admin = createAdminClient();
    const { data: profile, error: profileError } = await admin.from('profiles').select('role').eq('id', user.id).single();
    if (profileError) {
      return NextResponse.json({ error: 'Kunne ikke verifisere tilgang' }, { status: 500 });
    }

    if (String(profile?.role || '').trim().toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Kun superbruker kan slette signeringer' }, { status: 403 });
    }

    const { data: signRequest, error: requestError } = await admin
      .from('sign_requests')
      .select('id, pdf_path, completed_pdf_path, receipt_pdf_path')
      .eq('id', id)
      .single();

    if (requestError || !signRequest) {
      return NextResponse.json({ error: 'Fant ikke signering' }, { status: 404 });
    }

    const filePaths = Array.from(
      new Set(
        [signRequest.pdf_path, signRequest.completed_pdf_path, signRequest.receipt_pdf_path]
          .map((value) => String(value || '').trim())
          .filter(Boolean),
      ),
    );

    if (filePaths.length > 0) {
      const { error: storageError } = await admin.storage.from('sign-documents').remove(filePaths);
      if (storageError) {
        console.error('[Signing] Kunne ikke slette signeringsfiler', {
          signRequestId: id,
          filePaths,
          error: storageError.message,
        });
      }
    }

    const { error: deleteError } = await admin.from('sign_requests').delete().eq('id', id);
    if (deleteError) {
      return NextResponse.json({ error: 'Kunne ikke slette signering' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Ukjent feil' }, { status: 500 });
  }
}
