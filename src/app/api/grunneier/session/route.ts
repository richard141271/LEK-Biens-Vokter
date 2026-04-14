import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'grunneier_token';

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value || '';

    if (!token) {
      return NextResponse.json({ error: 'Ikke logget inn' }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: magicToken, error: tokenError } = await admin
      .from('magic_tokens')
      .select('email, expires_at, purpose, agreement_id, apiary_id, contact_id')
      .eq('token', token)
      .single();

    if (tokenError || !magicToken) {
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

    const { data: contacts } = await admin
      .from('contacts')
      .select('id, name, email, address, postal_code, city, phone')
      .ilike('email', email);

    const contactIds = (contacts || []).map((c: any) => c.id);
    if (contactIds.length === 0) {
      return NextResponse.json({ apiaries: [], contacts: [] });
    }

    const { data: agreements } = await admin
      .from('grunneier_agreements')
      .select(
        'id, status, base_text, final_text, contact_proposal, beekeeper_decision, apiary_id, contact_id, role, contact_signed_at, beekeeper_signed_at, created_at, updated_at'
      )
      .in('contact_id', contactIds)
      .limit(500);

    const activeAgreementApiaryIds = Array.from(
      new Set(
        (agreements || [])
          .filter((a: any) => a.status === 'active' && a.apiary_id)
          .map((a: any) => a.apiary_id)
      )
    );

    const { data: apiaryContacts } = activeAgreementApiaryIds.length
      ? await admin
          .from('apiary_contacts')
          .select('apiary_id, contact_id, role')
          .in('contact_id', contactIds)
          .in('apiary_id', activeAgreementApiaryIds)
          .limit(500)
      : { data: [] as any[] };

    const apiaryIds = Array.from(
      new Set((apiaryContacts || []).map((ac: any) => ac.apiary_id))
    );

    const agreementApiaryIds = Array.from(
      new Set((agreements || []).map((a: any) => a.apiary_id).filter(Boolean))
    );

    const apiaryIdsForFetch = Array.from(new Set([...apiaryIds, ...agreementApiaryIds]));

    const { data: apiaries } = apiaryIdsForFetch.length
      ? await admin
          .from('apiaries')
          .select('id, name, apiary_number, latitude, longitude, location, type')
          .in('id', apiaryIdsForFetch)
          .limit(500)
      : { data: [] as any[] };

    const apiaryMap = new Map((apiaries || []).map((a: any) => [a.id, a]));
    const contactMap = new Map((contacts || []).map((c: any) => [c.id, c]));

    const linkedApiaries =
      (apiaryContacts || [])
        .map((ac: any) => {
          const apiary = apiaryMap.get(ac.apiary_id);
          const contact = contactMap.get(ac.contact_id);
          if (!apiary || !contact) return null;
          return {
            apiary: {
              id: apiary.id,
              name: apiary.name,
              apiary_number: apiary.apiary_number,
              latitude: apiary.latitude,
              longitude: apiary.longitude,
              location: apiary.location,
              type: apiary.type,
            },
            contact: {
              id: contact.id,
              name: contact.name,
              email: contact.email,
              address: contact.address,
              postal_code: contact.postal_code,
              city: contact.city,
              phone: contact.phone,
            },
            role: ac.role,
          };
        })
        .filter(Boolean) || [];

    const agreementsWithApiary =
      (agreements || []).map((a: any) => {
        const contact = contactMap.get(a.contact_id);
        const apiary = a.apiary_id ? apiaryMap.get(a.apiary_id) : null;
        return {
          id: a.id,
          status: a.status,
          role: a.role,
          base_text: a.base_text,
          final_text: a.final_text,
          contact_proposal: a.contact_proposal,
          beekeeper_decision: a.beekeeper_decision,
          contact_signed_at: a.contact_signed_at,
          beekeeper_signed_at: a.beekeeper_signed_at,
          created_at: a.created_at,
          updated_at: a.updated_at,
          contact: contact
            ? {
                id: contact.id,
                name: contact.name,
                email: contact.email,
              }
            : null,
          apiary: apiary
            ? {
                id: apiary.id,
                name: apiary.name,
                apiary_number: apiary.apiary_number,
                location: apiary.location,
              }
            : null,
        };
      }) || [];

    return NextResponse.json({
      email,
      contacts: contacts || [],
      apiaries: linkedApiaries,
      agreements: agreementsWithApiary,
      tokenPurpose: magicToken.purpose || 'portal',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Ukjent feil' }, { status: 500 });
  }
}
