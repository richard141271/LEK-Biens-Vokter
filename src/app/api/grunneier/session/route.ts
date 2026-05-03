import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'grunneier_token';

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value || '';

    const admin = createAdminClient();

    let email = '';
    let tokenPurpose: string | null = null;
    let tokenExpired = false;

    if (token) {
      const { data: magicToken, error: tokenError } = await admin
        .from('magic_tokens')
        .select('email, expires_at, purpose')
        .eq('token', token)
        .single();

      if (!tokenError && magicToken) {
        const expiresAtMs = new Date(magicToken.expires_at).getTime();
        tokenExpired = !Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now();
        if (!tokenExpired) {
          email = String(magicToken.email || '').trim();
          tokenPurpose = String(magicToken.purpose || 'portal');
        }
      }
    }

    if (!email) {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const userEmail = String(user?.email || '').trim();
      const isLandowner = Boolean((user as any)?.user_metadata?.is_landowner);
      if (!user || !userEmail || !isLandowner) {
        return NextResponse.json({ error: 'Ikke logget inn', expired: tokenExpired }, { status: 401 });
      }

      email = userEmail;
      tokenPurpose = 'account';
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
          .select('apiary_id, contact_id, role, special_terms')
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

    const { data: hives } = apiaryIdsForFetch.length
      ? await admin.from('hives').select('apiary_id, status, active').in('apiary_id', apiaryIdsForFetch).limit(5000)
      : { data: [] as any[] };

    const activeByApiaryId = new Map<string, boolean>();
    for (const row of hives || []) {
      const apiaryId = String((row as any)?.apiary_id || '');
      if (!apiaryId) continue;
      if (activeByApiaryId.get(apiaryId) === true) continue;

      const status = String((row as any)?.status || '').trim().toUpperCase();
      const isActiveFlag = (row as any)?.active !== false;
      const isInactiveStatus = ['SOLGT', 'AVSLUTTET', 'DØD', 'DESTRUERT'].includes(status);
      const isActive = isActiveFlag && !isInactiveStatus;
      if (isActive) activeByApiaryId.set(apiaryId, true);
      else if (!activeByApiaryId.has(apiaryId)) activeByApiaryId.set(apiaryId, false);
    }

    const apiaryMap = new Map((apiaries || []).map((a: any) => [a.id, a]));
    const contactMap = new Map((contacts || []).map((c: any) => [c.id, c]));

    const linkedApiaries =
      (apiaryContacts || [])
        .map((ac: any) => {
          const apiary = apiaryMap.get(ac.apiary_id);
          const contact = contactMap.get(ac.contact_id);
          if (!apiary || !contact) return null;
          const isActive = activeByApiaryId.get(String(apiary.id)) === true;
          return {
            apiary: {
              id: apiary.id,
              name: apiary.name,
              apiary_number: apiary.apiary_number,
              latitude: apiary.latitude,
              longitude: apiary.longitude,
              location: apiary.location,
              type: apiary.type,
              status: isActive ? 'aktiv' : 'inaktiv',
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
            special_terms: ac.special_terms ?? null,
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
      tokenPurpose,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Ukjent feil' }, { status: 500 });
  }
}
