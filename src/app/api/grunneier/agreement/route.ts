import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'grunneier_token';

function asString(v: any) {
  return typeof v === 'string' ? v : '';
}

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value || '';
    if (!token) {
      return NextResponse.json({ error: 'Ikke logget inn' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const action = asString(body?.action).trim();
    const agreementId = asString(body?.agreementId).trim();

    if (!action || !agreementId) {
      return NextResponse.json({ error: 'Mangler data' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: magicToken } = await admin
      .from('magic_tokens')
      .select('email, expires_at')
      .eq('token', token)
      .single();

    if (!magicToken) {
      return NextResponse.json({ error: 'Ikke logget inn' }, { status: 401 });
    }

    const expiresAtMs = new Date(magicToken.expires_at).getTime();
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
      return NextResponse.json({ error: 'Utløpt', expired: true }, { status: 401 });
    }

    const email = String(magicToken.email || '').trim();
    if (!email) {
      return NextResponse.json({ error: 'Ikke logget inn' }, { status: 401 });
    }

    const { data: agreement } = await admin
      .from('grunneier_agreements')
      .select(
        'id, status, base_text, final_text, contact_proposal, beekeeper_decision, contact_signed_at, beekeeper_signed_at, contact_id'
      )
      .eq('id', agreementId)
      .single();

    if (!agreement) {
      return NextResponse.json({ error: 'Fant ikke avtale' }, { status: 404 });
    }

    const { data: contact } = await admin
      .from('contacts')
      .select('id, email')
      .eq('id', agreement.contact_id)
      .single();

    const contactEmail = String(contact?.email || '').trim().toLowerCase();
    if (!contact || contactEmail !== email.toLowerCase()) {
      return NextResponse.json({ error: 'Ingen tilgang til avtale' }, { status: 403 });
    }

    if (action === 'propose') {
      const proposal = asString(body?.proposal).trim();
      if (!proposal) {
        return NextResponse.json({ error: 'Mangler forslag' }, { status: 400 });
      }

      if (agreement.status === 'active') {
        return NextResponse.json({ error: 'Avtalen er allerede aktiv' }, { status: 400 });
      }

      const { error } = await admin
        .from('grunneier_agreements')
        .update({
          contact_proposal: proposal,
          beekeeper_decision: 'pending',
          final_text: null,
          contact_signature_name: null,
          contact_signed_at: null,
          status: 'contact_proposed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', agreementId);

      if (error) {
        return NextResponse.json(
          { error: 'Kunne ikke lagre forslag', detail: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'sign') {
      const signatureName = asString(body?.signatureName).trim();
      if (!signatureName) {
        return NextResponse.json({ error: 'Mangler signatur' }, { status: 400 });
      }

      if (agreement.status === 'rejected') {
        return NextResponse.json({ error: 'Avtalen er avvist' }, { status: 400 });
      }

      if (agreement.contact_signed_at) {
        return NextResponse.json({ error: 'Avtalen er allerede signert av grunneier' }, { status: 400 });
      }

      if (agreement.beekeeper_decision === 'pending' && agreement.contact_proposal) {
        return NextResponse.json(
          { error: 'Forslaget venter på godkjenning fra birøkter' },
          { status: 400 }
        );
      }

      const textToSign = agreement.final_text || agreement.base_text;
      if (!textToSign) {
        return NextResponse.json({ error: 'Avtale-tekst mangler' }, { status: 500 });
      }

      const nextStatus = agreement.beekeeper_signed_at ? 'active' : 'awaiting_beekeeper_signature';

      const { error } = await admin
        .from('grunneier_agreements')
        .update({
          contact_signature_name: signatureName,
          contact_signed_at: new Date().toISOString(),
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', agreementId);

      if (error) {
        return NextResponse.json({ error: 'Kunne ikke signere', detail: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Ugyldig handling' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Ukjent feil' }, { status: 500 });
  }
}

