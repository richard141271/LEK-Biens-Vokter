import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { buildPublicSigningUrl, getBaseUrlFromHeaders } from '@/lib/signing';

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

    const [{ data: profile }, { data: signedData, error: signedError }] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
      createAdminClient().storage.from('sign-documents').createSignedUrl(pdfPath, 60 * 60),
    ]);

    if (signedError || !signedData?.signedUrl) {
      return NextResponse.json({ error: 'Kunne ikke hente PDF' }, { status: 500 });
    }

    return NextResponse.json({
      request,
      pdfUrl: signedData.signedUrl,
      publicSignUrl: buildPublicSigningUrl(getBaseUrlFromHeaders(new Headers(_request.headers)), request.token),
      senderName: String(profile?.full_name || user.user_metadata?.full_name || user.email || '').trim(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Ukjent feil' }, { status: 500 });
  }
}
