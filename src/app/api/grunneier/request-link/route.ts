import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/utils/supabase/admin';
import { getMailService } from '@/services/mail';

export const dynamic = 'force-dynamic';

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host =
    request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  return `${proto}://${host}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || '').trim();

    if (!email) {
      return NextResponse.json({ error: 'Mangler e-post' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: contacts } = await admin
      .from('contacts')
      .select('id, email')
      .ilike('email', email);

    if (!contacts || contacts.length === 0) {
      return NextResponse.json({ success: true });
    }

    const contactIds = contacts.map((c: any) => c.id);

    const { data: links } = await admin
      .from('apiary_contacts')
      .select('apiary_id, contact_id')
      .in('contact_id', contactIds)
      .limit(50);

    const apiaryIds = Array.from(new Set((links || []).map((l: any) => l.apiary_id)));

    const { data: apiaries } = apiaryIds.length
      ? await admin.from('apiaries').select('id, user_id').in('id', apiaryIds).limit(50)
      : { data: [] as any[] };

    const { data: agreements } = await admin
      .from('grunneier_agreements')
      .select('id, created_by')
      .in('contact_id', contactIds)
      .limit(50);

    const ownerUserId = (agreements || [])[0]?.created_by || (apiaries || [])[0]?.user_id || null;

    if (!ownerUserId) {
      return NextResponse.json({ success: true });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const { error: insertError } = await admin.from('magic_tokens').insert({
      email,
      token,
      expires_at: expiresAt,
      used: false,
      purpose: 'portal',
    });

    if (insertError) {
      return NextResponse.json({ error: 'Kunne ikke opprette lenke' }, { status: 500 });
    }

    const url = `${getBaseUrl(request)}/grunneier?token=${encodeURIComponent(token)}`;

    const mail = getMailService(admin);
    const mailResult = await mail.sendMail(
      'Biens Vokter',
      email,
      'Invitasjon til Grunneierportal',
      [
        'Du er invitert til å se din bigård.',
        '',
        `Åpne portal: ${url}`,
        '',
        `<a href="${url}" style="display:inline-block;background:#111827;color:#ffffff;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:600">Åpne portal</a>`,
      ].join('\n'),
      ownerUserId
    );

    if (mailResult?.error) {
      return NextResponse.json(
        { error: 'Kunne ikke sende e-post', detail: mailResult.error, inviteUrl: url },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, inviteUrl: url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Ukjent feil' }, { status: 500 });
  }
}
