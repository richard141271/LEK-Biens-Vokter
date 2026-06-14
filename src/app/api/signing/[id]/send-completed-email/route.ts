import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { buildPublicCompletedSigningUrl, getBaseUrlFromHeaders, normalizeSignRequestStatus } from '@/lib/signing';
import { getMailService } from '@/services/mail';

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

    if (normalizeSignRequestStatus(signRequest as any) !== 'COMPLETED') {
      return NextResponse.json({ error: 'Dokumentet er ikke ferdig signert enda' }, { status: 400 });
    }

    const publicCompletedUrl = buildPublicCompletedSigningUrl(getBaseUrlFromHeaders(new Headers(request.headers)), signRequest.token);
    const mail = getMailService(admin);
    const result = await mail.sendMail(
      'LEK-Signering',
      String(signRequest.recipient_email || ''),
      `Ferdig signert: ${signRequest.title}`,
      [
        `Hei ${signRequest.recipient_name},`,
        '',
        'Dokumentet er nå ferdig signert av begge parter.',
        '',
        `Åpne ferdig signert dokument og signeringskvittering: ${publicCompletedUrl}`,
        '',
        `<a href="${publicCompletedUrl}" style="display:inline-block;background:#111827;color:#ffffff;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:600">Åpne ferdig signert dokument</a>`,
      ].join('\n'),
      user.id,
    );

    if ((result as any)?.error) {
      return NextResponse.json({ error: (result as any).error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, publicCompletedUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Ukjent feil' }, { status: 500 });
  }
}
