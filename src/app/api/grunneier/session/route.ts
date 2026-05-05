import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'grunneier_token';

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value || '';

    const admin = createAdminClient();

    const normalizeEmail = (v: unknown) => String(v || '').trim().toLowerCase();

    let email = '';
    let tokenPurpose: string | null = null;
    let tokenContactId = '';
    let tokenApiaryId = '';
    let tokenAgreementId = '';
    let tokenExpired = false;
    let accountContactId = '';
    let accountUserId = '';
    let accountAppMetadata: any = null;

    const authHeader = request.headers.get('authorization') || '';
    const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice('bearer '.length).trim()
      : '';

    if (bearerToken) {
      const { data: tokenUserData, error: tokenUserError } = await admin.auth.getUser(bearerToken);
      const tokenUser = !tokenUserError ? (tokenUserData as any)?.user : null;
      const tokenEmail = String(tokenUser?.email || '').trim();
      if (tokenUser && tokenEmail) {
        email = tokenEmail;
        tokenPurpose = 'account';
        accountUserId = String(tokenUser.id);
        accountContactId = String((tokenUser as any)?.app_metadata?.landowner_contact_id || '').trim();
        accountAppMetadata = (tokenUser as any)?.app_metadata || null;
      }
    }

    if (!email) {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const userEmail = String(user?.email || '').trim();
      if (user && userEmail) {
        email = userEmail;
        tokenPurpose = 'account';
        accountUserId = String(user.id);
        accountContactId = String((user as any)?.app_metadata?.landowner_contact_id || '').trim();
        accountAppMetadata = (user as any)?.app_metadata || null;
      }
    }

    if (email && tokenPurpose === 'account') {
      tokenPurpose = 'account';

      if (!accountContactId) {
        const emailLower = normalizeEmail(email);
        const { data: tokenMatchExact } = await admin
          .from('magic_tokens')
          .select('contact_id, email')
          .ilike('email', emailLower)
          .not('contact_id', 'is', null)
          .order('expires_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        let fallbackContactId = String((tokenMatchExact as any)?.contact_id || '').trim();
        if (!fallbackContactId) {
          const { data: tokenMatchPrefix } = await admin
            .from('magic_tokens')
            .select('contact_id, email')
            .ilike('email', `${emailLower}%`)
            .not('contact_id', 'is', null)
            .order('expires_at', { ascending: false })
            .limit(10);

          const list = Array.isArray(tokenMatchPrefix) ? tokenMatchPrefix : [];
          const matched = list.find((t: any) => normalizeEmail(t?.email) === emailLower);
          fallbackContactId = String((matched as any)?.contact_id || '').trim();
        }

        if (fallbackContactId) {
          accountContactId = fallbackContactId;
          if (accountUserId) {
            await admin.auth.admin.updateUserById(accountUserId, {
              app_metadata: { ...(accountAppMetadata || {}), landowner_contact_id: fallbackContactId },
            });
          }
        }
      }
    }

    if (token) {
      const { data: magicToken, error: tokenError } = await admin
        .from('magic_tokens')
        .select('email, expires_at, purpose, contact_id, apiary_id, agreement_id')
        .eq('token', token)
        .single();

      if (!tokenError && magicToken) {
        const expiresAtMs = new Date(magicToken.expires_at).getTime();
        tokenExpired = !Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now();
        if (!tokenExpired) {
          const magicEmail = String(magicToken.email || '').trim();
          const magicPurpose = String(magicToken.purpose || 'portal');
          const magicContactId = String((magicToken as any)?.contact_id || '').trim();
          const magicApiaryId = String((magicToken as any)?.apiary_id || '').trim();
          const magicAgreementId = String((magicToken as any)?.agreement_id || '').trim();

          if (!email && magicEmail) {
            email = magicEmail;
            tokenPurpose = magicPurpose;
            tokenContactId = magicContactId;
            tokenApiaryId = magicApiaryId;
            tokenAgreementId = magicAgreementId;
          } else if (email && magicEmail && normalizeEmail(magicEmail) === normalizeEmail(email)) {
            if (!tokenContactId && magicContactId) tokenContactId = magicContactId;
            if (!tokenApiaryId && magicApiaryId) tokenApiaryId = magicApiaryId;
            if (!tokenAgreementId && magicAgreementId) tokenAgreementId = magicAgreementId;
          }
        }
      }
    }

    if (!email) {
      return NextResponse.json({ error: 'Ikke logget inn', expired: tokenExpired }, { status: 401 });
    }

    const isScopedAgreementToken = tokenPurpose === 'agreement' && (tokenContactId || tokenAgreementId || tokenApiaryId);

    let contacts: any[] = [];
    if (isScopedAgreementToken && tokenContactId) {
      const { data: tokenContact } = await admin
        .from('contacts')
        .select('id, name, email, address, postal_code, city, phone')
        .eq('id', tokenContactId)
        .maybeSingle();
      contacts = tokenContact ? [tokenContact as any] : [];
    } else {
      const emailLower = normalizeEmail(email);
      const { data: contactsByEmailExact } = await admin
        .from('contacts')
        .select('id, name, email, address, postal_code, city, phone')
        .ilike('email', emailLower);

      const baseList = Array.isArray(contactsByEmailExact) ? contactsByEmailExact.slice() : [];
      if (baseList.length > 0) {
        contacts = baseList;
      } else {
        const { data: contactsByEmailPrefix } = await admin
          .from('contacts')
          .select('id, name, email, address, postal_code, city, phone')
          .ilike('email', `${emailLower}%`);

        const prefixList = Array.isArray(contactsByEmailPrefix) ? contactsByEmailPrefix.slice() : [];
        contacts = prefixList.filter((c: any) => normalizeEmail(c?.email) === emailLower);
      }

      if (contacts.length === 0) {
        const { data: contactsByEmailContains } = await admin
          .from('contacts')
          .select('id, name, email, address, postal_code, city, phone')
          .ilike('email', `%${emailLower}%`)
          .limit(50);

        const containsList = Array.isArray(contactsByEmailContains) ? contactsByEmailContains.slice() : [];
        contacts = containsList.filter((c: any) => normalizeEmail(c?.email) === emailLower);
      }

      const extraContactId = tokenContactId || accountContactId;
      if (extraContactId && !contacts.some((c) => String(c?.id || '') === extraContactId)) {
        const { data: extraContact } = await admin
          .from('contacts')
          .select('id, name, email, address, postal_code, city, phone')
          .eq('id', extraContactId)
          .maybeSingle();
        if (extraContact) contacts.push(extraContact as any);
      }
    }

    const contactIds = (contacts || []).map((c: any) => c.id);
    if (contactIds.length === 0) {
      return NextResponse.json({
        email,
        contacts: [],
        apiaries: [],
        agreements: [],
        tokenPurpose,
      });
    }

    let agreementsQuery = admin
      .from('grunneier_agreements')
      .select(
        'id, status, base_text, final_text, contact_proposal, beekeeper_decision, apiary_id, contact_id, role, contact_signed_at, beekeeper_signed_at, created_at, updated_at'
      )
      .in('contact_id', contactIds)
      .limit(500);

    if (isScopedAgreementToken) {
      if (tokenAgreementId) {
        agreementsQuery = agreementsQuery.eq('id', tokenAgreementId);
      } else if (tokenApiaryId) {
        agreementsQuery = agreementsQuery.eq('apiary_id', tokenApiaryId);
      }
    }

    const { data: agreementsRaw } = await agreementsQuery;

    const agreementsList = Array.isArray(agreementsRaw) ? agreementsRaw : [];
    const agreementKey = (a: any) => {
      const apiaryId = String(a?.apiary_id || '').trim();
      const contactId = String(a?.contact_id || '').trim();
      if (apiaryId && contactId) return `${apiaryId}:${contactId}`;
      const id = String(a?.id || '').trim();
      return id ? `id:${id}` : 'id:unknown';
    };

    const agreementTime = (a: any) =>
      new Date(a?.updated_at || a?.created_at || 0).getTime() || 0;

    const byPair = new Map<string, any>();
    const idsToDelete: string[] = [];

    for (const a of agreementsList.slice().sort((a: any, b: any) => agreementTime(b) - agreementTime(a))) {
      const id = String(a?.id || '').trim();
      if (!id) continue;
      const key = agreementKey(a);
      if (!byPair.has(key)) {
        byPair.set(key, a);
      } else {
        idsToDelete.push(id);
      }
    }

    const agreements = Array.from(byPair.values());

    if (idsToDelete.length > 0) {
      await admin.from('grunneier_agreements').delete().in('id', idsToDelete);
    }

    const accessPairs = new Set<string>();
    const activeAgreementApiaryIds = Array.from(
      new Set(
        (agreements || [])
          .filter((a: any) => {
            const status = String(a?.status || '').toLowerCase();
            const hasAccess = status === 'active';
            const apiaryId = String(a?.apiary_id || '').trim();
            const contactId = String(a?.contact_id || '').trim();
            if (hasAccess && apiaryId && contactId) {
              accessPairs.add(`${apiaryId}:${contactId}`);
              return true;
            }
            return false;
          })
          .map((a: any) => String(a?.apiary_id || '').trim())
          .filter(Boolean)
      )
    );

    const { data: apiaryContactsRaw } = activeAgreementApiaryIds.length
      ? await admin
          .from('apiary_contacts')
          .select('apiary_id, contact_id, role, special_terms')
          .in('contact_id', contactIds)
          .in('apiary_id', activeAgreementApiaryIds)
          .limit(500)
      : { data: [] as any[] };

    const apiaryContacts = (apiaryContactsRaw || []).filter((ac: any) => {
      const apiaryId = String(ac?.apiary_id || '').trim();
      const contactId = String(ac?.contact_id || '').trim();
      if (!apiaryId || !contactId) return false;
      return accessPairs.has(`${apiaryId}:${contactId}`);
    });

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
