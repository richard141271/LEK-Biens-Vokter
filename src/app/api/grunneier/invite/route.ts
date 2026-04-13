import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getMailService } from '@/services/mail';

export const dynamic = 'force-dynamic';

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host =
    request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  return `${proto}://${host}`;
}

type Role = 'grunneier' | 'kontaktperson' | 'samarbeidspartner';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const admin = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Ikke logget inn' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const apiaryId = String(body?.apiaryId || '').trim();
    const role = String(body?.role || 'grunneier').trim() as Role;
    const contactId = body?.contactId ? String(body.contactId).trim() : '';
    const contactInput = body?.contact || null;

    if (!apiaryId) {
      return NextResponse.json({ error: 'Mangler apiaryId' }, { status: 400 });
    }

    if (!['grunneier', 'kontaktperson', 'samarbeidspartner'].includes(role)) {
      return NextResponse.json({ error: 'Ugyldig rolle' }, { status: 400 });
    }

    const { data: apiary } = await supabase
      .from('apiaries')
      .select('id, name, apiary_number')
      .eq('id', apiaryId)
      .single();

    if (!apiary) {
      return NextResponse.json({ error: 'Fant ikke bigård' }, { status: 404 });
    }

    let finalContactId = contactId;
    let finalEmail = '';
    let finalName = '';

    if (finalContactId) {
      const { data: existingContact, error: contactError } = await supabase
        .from('contacts')
        .select('id, name, email')
        .eq('id', finalContactId)
        .single();

      if (contactError || !existingContact) {
        return NextResponse.json({ error: 'Ingen tilgang til kontakt' }, { status: 403 });
      }

      finalEmail = existingContact.email || '';
      finalName = existingContact.name || '';
    } else {
      const name = String(contactInput?.name || '').trim();
      const email = String(contactInput?.email || '').trim();

      if (!name) {
        return NextResponse.json({ error: 'Mangler navn' }, { status: 400 });
      }
      if (!email) {
        return NextResponse.json({ error: 'Mangler e-post' }, { status: 400 });
      }

      const { data: created, error: createError } = await supabase
        .from('contacts')
        .insert({
          created_by: user.id,
          name,
          address: String(contactInput?.address || '').trim() || null,
          postal_code: String(contactInput?.postal_code || '').trim() || null,
          city: String(contactInput?.city || '').trim() || null,
          phone: String(contactInput?.phone || '').trim() || null,
          email,
        })
        .select('id, name, email')
        .single();

      if (createError || !created) {
        return NextResponse.json({ error: 'Kunne ikke opprette kontakt' }, { status: 500 });
      }

      finalContactId = created.id;
      finalEmail = created.email || '';
      finalName = created.name || '';
    }

    if (!finalContactId) {
      return NextResponse.json({ error: 'Kunne ikke bestemme kontakt' }, { status: 500 });
    }
    if (!finalEmail) {
      return NextResponse.json({ error: 'Kontakt mangler e-post' }, { status: 400 });
    }

    const { error: linkError } = await supabase
      .from('apiary_contacts')
      .upsert(
        {
          apiary_id: apiaryId,
          contact_id: finalContactId,
          role,
        },
        { onConflict: 'apiary_id,contact_id' }
      );

    if (linkError) {
      return NextResponse.json({ error: 'Kunne ikke knytte kontakt til bigård' }, { status: 500 });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const { error: tokenError } = await admin.from('magic_tokens').insert({
      email: finalEmail,
      token,
      expires_at: expiresAt,
      used: false,
    });

    if (tokenError) {
      return NextResponse.json({ error: 'Kunne ikke opprette invitasjon' }, { status: 500 });
    }

    const url = `${getBaseUrl(request)}/grunneier?token=${encodeURIComponent(token)}`;

    const mail = getMailService(admin);
    await mail.sendMail(
      'Biens Vokter',
      finalEmail,
      'Du er invitert til å se din bigård',
      [
        `Hei${finalName ? ` ${finalName}` : ''}!`,
        '',
        'Du er invitert til å se din bigård.',
        '',
        `Åpne portal: ${url}`,
        '',
        `<a href="${url}" style="display:inline-block;background:#111827;color:#ffffff;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:600">Åpne portal</a>`,
      ].join('\n'),
      user.id
    );

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Ukjent feil' }, { status: 500 });
  }
}
