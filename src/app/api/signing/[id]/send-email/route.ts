import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getMailService } from '@/services/mail';
import { buildPublicSigningUrl, getBaseUrlFromHeaders } from '@/lib/signing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: { id: string } }) {
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
    const { data: signRequest, error } = await admin
      .from('sign_requests')
      .select('*')
      .eq('id', id)
      .eq('created_by_user_id', user.id)
      .single();

    if (error || !signRequest) {
      return NextResponse.json({ error: 'Fant ikke signering' }, { status: 404 });
    }

    const publicSignUrl = buildPublicSigningUrl(getBaseUrlFromHeaders(new Headers(request.headers)), signRequest.token);
    const mail = getMailService(admin);
    const result = await mail.sendMail(
      'LEK-Signering',
      signRequest.recipient_email,
      `Signering: ${signRequest.title}`,
      [
        `Hei ${signRequest.recipient_name},`,
        '',
        'Du har mottatt et dokument til signering i LEK-Signering.',
        '',
        `Tittel: ${signRequest.title}`,
        signRequest.description ? `Beskrivelse: ${signRequest.description}` : '',
        '',
        `Aapne og signer: ${publicSignUrl}`,
        '',
        `<a href="${publicSignUrl}" style="display:inline-block;background:#111827;color:#ffffff;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:600">Aapne signering</a>`,
      ]
        .filter(Boolean)
        .join('\n'),
      user.id,
    );

    if (result?.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    await admin
      .from('sign_requests')
      .update({ status: 'SENT', updated_at: new Date().toISOString() })
      .eq('id', signRequest.id);

    return NextResponse.json({ ok: true, publicSignUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Ukjent feil' }, { status: 500 });
  }
}
