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

    if (token) {
      const { data: magicToken, error: tokenError } = await admin
        .from('magic_tokens')
        .select('email, expires_at, purpose, contact_id, apiary_id, agreement_id')
        .eq('token', token)
        .maybeSingle();

      if (!tokenError && magicToken) {
        const expiresAtMs = new Date((magicToken as any).expires_at).getTime();
        tokenExpired = !Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now();
        if (!tokenExpired) {
          email = String((magicToken as any).email || '').trim();
          tokenPurpose = String((magicToken as any).purpose || 'portal');
          tokenContactId = String((magicToken as any).contact_id || '').trim();
          tokenApiaryId = String((magicToken as any).apiary_id || '').trim();
          tokenAgreementId = String((magicToken as any).agreement_id || '').trim();
        }
      }
    }

    const authHeader = request.headers.get('authorization') || '';
    const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice('bearer '.length).trim()
      : '';

    if (!email && bearerToken) {
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
        'id, status, base_text, final_text, contact_proposal, beekeeper_decision, apiary_id, contact_id, role, contact_signed_at, beekeeper_signed_at, created_by, created_at, updated_at'
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
    const activeOwnerPairs = new Set<string>();
    for (const a of agreements || []) {
      const status = String(a?.status || '').toLowerCase();
      const bothSigned = Boolean(a?.contact_signed_at && a?.beekeeper_signed_at);
      const isActive =
        status === 'active' || (bothSigned && status !== 'rejected' && status !== 'terminated');
      if (!isActive) continue;
      const contactId = String(a?.contact_id || '').trim();
      const apiaryId = String(a?.apiary_id || '').trim();
      const createdBy = String(a?.created_by || '').trim();
      if (createdBy && contactId) activeOwnerPairs.add(`${createdBy}:${contactId}`);
      if (apiaryId && contactId) accessPairs.add(`${apiaryId}:${contactId}`);
    }

    const { data: apiaryContactsRaw } = contactIds.length
      ? await admin
          .from('apiary_contacts')
          .select(
            'apiary_id, contact_id, role, special_terms, special_terms_contact_signature_name, special_terms_contact_signed_at, special_terms_beekeeper_signature_name, special_terms_beekeeper_signed_at'
          )
          .in('contact_id', contactIds)
          .limit(5000)
      : { data: [] as any[] };

    const allApiaryContacts = Array.isArray(apiaryContactsRaw) ? apiaryContactsRaw : [];

    const apiaryIds = Array.from(new Set(allApiaryContacts.map((ac: any) => ac.apiary_id).filter(Boolean)));
    const agreementApiaryIds = Array.from(new Set((agreements || []).map((a: any) => a.apiary_id).filter(Boolean)));
    const apiaryIdsForFetch = Array.from(new Set([...apiaryIds, ...agreementApiaryIds]));

    const { data: apiaries } = apiaryIdsForFetch.length
      ? await admin
          .from('apiaries')
          .select('id, name, apiary_number, latitude, longitude, location, type, user_id')
          .in('id', apiaryIdsForFetch)
          .limit(500)
      : { data: [] as any[] };

    const { data: hives } = apiaryIdsForFetch.length
      ? await admin.from('hives').select('apiary_id, status, active, type').in('apiary_id', apiaryIdsForFetch).limit(5000)
      : { data: [] as any[] };

    const countByApiaryId = new Map<string, number>();
    const excludedStatuses = new Set(['SVAK', 'DØD', 'SYKDOM', 'SVERMING', 'SOLGT', 'AVSLUTTET', 'DESTRUERT']);

    for (const row of hives || []) {
      const apiaryId = String((row as any)?.apiary_id || '').trim();
      if (!apiaryId) continue;

      const isActiveFlag = (row as any)?.active !== false;
      if (!isActiveFlag) continue;

      const status = String((row as any)?.status || '').trim().toUpperCase();
      if (excludedStatuses.has(status)) continue;

      const type = String((row as any)?.type || '').trim().toUpperCase();
      if (type === 'AVLEGGER') continue;

      countByApiaryId.set(apiaryId, (countByApiaryId.get(apiaryId) || 0) + 1);
    }

    const apiaryMap = new Map((apiaries || []).map((a: any) => [a.id, a]));
    const contactMap = new Map((contacts || []).map((c: any) => [c.id, c]));

    const linkedApiaries =
      (allApiaryContacts || [])
        .map((ac: any) => {
          const apiary = apiaryMap.get(ac.apiary_id);
          const contact = contactMap.get(ac.contact_id);
          if (!apiary || !contact) return null;

          const apiaryOwnerId = String((apiary as any)?.user_id || '').trim();
          const canSee =
            accessPairs.has(`${String(apiary.id)}:${String(contact.id)}`) ||
            (apiaryOwnerId && activeOwnerPairs.has(`${apiaryOwnerId}:${String(contact.id)}`));
          if (!canSee) return null;

          const activeProductionHiveCount = countByApiaryId.get(String(apiary.id)) || 0;
          const isActive = activeProductionHiveCount > 0;
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
              active_production_hive_count: activeProductionHiveCount,
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
            special_terms_contact_signature_name: ac.special_terms_contact_signature_name ?? null,
            special_terms_contact_signed_at: ac.special_terms_contact_signed_at ?? null,
            special_terms_beekeeper_signature_name: ac.special_terms_beekeeper_signature_name ?? null,
            special_terms_beekeeper_signed_at: ac.special_terms_beekeeper_signed_at ?? null,
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
