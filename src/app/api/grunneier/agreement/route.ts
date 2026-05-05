import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'grunneier_token';

function asString(v: any) {
  return typeof v === 'string' ? v : '';
}

type Role = 'grunneier' | 'kontaktperson' | 'samarbeidspartner';

function standardAgreementText(params: {
  apiaryNumber?: string | null;
  apiaryLocation?: string | null;
  contactName?: string | null;
  beekeeperName?: string | null;
  role: Role;
}) {
  const apiaryNumber = String(params.apiaryNumber || '').trim();
  const apiaryLocation = String(params.apiaryLocation || '').trim();
  const contactName = String(params.contactName || '').trim();
  const beekeeperName = String(params.beekeeperName || '').trim();

  const apiaryNumberLine = `Avtalenummer: ${apiaryNumber || '________'}`;
  const apiaryLocationLine = `Lokasjon: ${apiaryLocation || '________'}`;
  const contactLine = `Grunneier/kontaktperson: ${contactName || '________'}`;
  const beekeeperLine = `Birøkter: ${beekeeperName || '________'}`;
  const landownerLine = `Grunneier: ${contactName || '________'}`;

  return [
    'AVTALE OM TILGANG TIL BIGÅRD-INFO (GRUNNEIERPORTAL)',
    apiaryNumberLine,
    apiaryLocationLine,
    contactLine,
    '',
    '1. Parter',
    'Denne avtalen inngås mellom:',
    beekeeperLine,
    landownerLine,
    'Partene benevnes samlet som “Partene”.',
    '',
    '2. Formål',
    'Formålet med avtalen er å gi grunneier tilgang til begrenset og relevant informasjon om bigården via digital portal, for å sikre transparens, trygghet og effektiv kommunikasjon mellom Partene.',
    '',
    '3. Tilgang til grunneierportal',
    '3.1 Grunneier gis tilgang til utvalgt informasjon om bigården, herunder:',
    '* geografisk plassering',
    '* enkel statusinformasjon',
    '3.2 Tilgang gis via personlig engangslenke sendt til registrert e-postadresse.',
    '3.3 Tilgangen er personlig og kan ikke overdras eller deles uten skriftlig samtykke fra birøkter.',
    '3.4 Birøkter forbeholder seg retten til å endre, begrense eller stenge tilgang ved misbruk eller sikkerhetsmessige hensyn.',
    '3.5 Grunneier kan registrere seg med egen konto for enklere tilgang.',
    '',
    '4. Behandling av informasjon og personvern',
    '4.1 Det deles ikke sensitive personopplysninger utover det som er nødvendig for gjennomføring av avtalen.',
    '4.2 All behandling av personopplysninger skal skje i henhold til gjeldende personvernlovgivning, herunder Personopplysningsloven og GDPR.',
    '4.3 Grunneier forplikter seg til ikke å lagre, dele eller videreformidle informasjon fra portalen uten samtykke.',
    '',
    '5. Ansvar og rollefordeling',
    '5.1 Birøkter har det fulle og hele ansvaret for:',
    '* drift av bigården',
    '* tilsyn og vedlikehold',
    '* dyrevelferd',
    '5.2 Grunneier har ikke ansvar for forhold knyttet til biene eller driften av bigården.',
    '5.3 Informasjon i portalen er veiledende og kan inneholde forsinkelser eller avvik.',
    '',
    '6. Plassering og flytting av bigård',
    '6.1 Bigården er plassert etter avtale med grunneier (Påvist geolokasjon +- 100meter)',
    '6.2 Grunneier kan kreve flytting av bigården med rimelig varsel.',
    '6.3 Flytting skal gjennomføres innen rimelig tid, og tilpasses sesongmessige og praktiske forhold.',
    '',
    '7. Varighet og oppsigelse',
    '7.1 Avtalen gjelder fra signeringsdato og løper inntil den sies opp av en av Partene.',
    '7.2 Ved oppsigelse skal:',
    '* tilgang til portalen opphøre uten ugrunnet opphold',
    '* eventuell flytting av bigård skje i henhold til punkt 6.3',
    '',
    '8. Ansvarsbegrensning',
    '8.1 Birøkter er ikke ansvarlig for indirekte tap, herunder tap som følge av:',
    '* bruk av informasjon fra portalen',
    '* tekniske feil eller nedetid',
    '8.2 Portalen er et informasjonsverktøy og erstatter ikke direkte dialog mellom Partene.',
    '',
    '9. Endringer i avtalen',
    'Endringer eller tillegg til denne avtalen skal være skriftlige og godkjennes av begge Parter før de trer i kraft.',
    '',
    '10. Lovvalg og verneting',
    'Avtalen reguleres av norsk rett.',
    'Eventuelle tvister skal søkes løst i minnelighet. Dersom dette ikke lykkes, kan saken bringes inn for ordinære domstoler.',
    '',
    '11. Signatur',
    'Avtalen trer i kraft når begge Parter har signert digitalt.',
  ].join('\n');
}

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value || '';
    const body = await request.json().catch(() => ({}));
    const action = asString(body?.action).trim();
    const agreementId = asString(body?.agreementId).trim();
    const apiaryId = asString(body?.apiaryId).trim();
    const contactId = asString(body?.contactId).trim();

    if (!action) {
      return NextResponse.json({ error: 'Mangler data' }, { status: 400 });
    }
    if (action !== 'update_special_terms' && !agreementId) {
      return NextResponse.json({ error: 'Mangler data' }, { status: 400 });
    }

    const admin = createAdminClient();

    const normalizeEmail = (v: unknown) => String(v || '').trim().toLowerCase();

    let email = '';
    let tokenContactId = '';
    let tokenPurpose: string | null = null;
    let tokenAgreementId = '';
    let tokenApiaryId = '';
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
    } else if (token) {
      const { data: magicToken } = await admin
        .from('magic_tokens')
        .select('email, expires_at, contact_id, purpose, agreement_id, apiary_id')
        .eq('token', token)
        .single();

      if (magicToken) {
        const expiresAtMs = new Date(magicToken.expires_at).getTime();
        tokenExpired = !Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now();
        if (!tokenExpired) {
          email = String(magicToken.email || '').trim();
          tokenContactId = String((magicToken as any)?.contact_id || '').trim();
          tokenPurpose = String((magicToken as any)?.purpose || 'portal');
          tokenAgreementId = String((magicToken as any)?.agreement_id || '').trim();
          tokenApiaryId = String((magicToken as any)?.apiary_id || '').trim();
        }
      }
    }

    if (!email) {
      return NextResponse.json({ error: 'Ikke logget inn', expired: tokenExpired }, { status: 401 });
    }

    const isScopedAgreementToken =
      tokenPurpose === 'agreement' && Boolean(tokenAgreementId || tokenApiaryId || tokenContactId);

    if (action === 'update_special_terms') {
      if (!apiaryId || !contactId) {
        return NextResponse.json({ error: 'Mangler data' }, { status: 400 });
      }
      if (isScopedAgreementToken && tokenApiaryId && apiaryId !== tokenApiaryId) {
        return NextResponse.json({ error: 'Ingen tilgang' }, { status: 403 });
      }

      const { data: contact } = await admin
        .from('contacts')
        .select('id, email')
        .eq('id', contactId)
        .single();

      const contactEmail = String(contact?.email || '').trim().toLowerCase();
      const expectedContactId = tokenContactId || accountContactId;
      if (
        !contact ||
        (expectedContactId ? String(contact.id) !== expectedContactId : contactEmail !== email.toLowerCase())
      ) {
        return NextResponse.json({ error: 'Ingen tilgang' }, { status: 403 });
      }

      let agreementRes;
      if (isScopedAgreementToken && tokenAgreementId) {
        agreementRes = await admin
          .from('grunneier_agreements')
          .select('id, status, apiary_id, contact_id, contact_signed_at, beekeeper_signed_at')
          .eq('id', tokenAgreementId)
          .maybeSingle();
      } else {
        agreementRes = await admin
          .from('grunneier_agreements')
          .select('id, status, apiary_id, contact_id, contact_signed_at, beekeeper_signed_at')
          .eq('apiary_id', apiaryId)
          .eq('contact_id', contactId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
      }

      const agreementForTerms = (agreementRes as any)?.data || null;
      const statusValue = String(agreementForTerms?.status || '').toLowerCase();
      const bothSigned = Boolean(agreementForTerms?.contact_signed_at && agreementForTerms?.beekeeper_signed_at);
      const hasActiveAgreement = statusValue === 'active' || (bothSigned && statusValue !== 'rejected' && statusValue !== 'terminated');

      if (
        !agreementForTerms ||
        String(agreementForTerms.apiary_id || '') !== apiaryId ||
        String(agreementForTerms.contact_id || '') !== contactId ||
        !hasActiveAgreement
      ) {
        return NextResponse.json({ error: 'Ingen tilgang' }, { status: 403 });
      }

      const specialTerms = asString(body?.specialTerms);

      const { data: link } = await admin
        .from('apiary_contacts')
        .select('id')
        .eq('apiary_id', apiaryId)
        .eq('contact_id', contactId)
        .maybeSingle();

      if (!link?.id) {
        return NextResponse.json({ error: 'Fant ikke kobling til bigård' }, { status: 404 });
      }

      const { error } = await admin
        .from('apiary_contacts')
        .update({ special_terms: specialTerms })
        .eq('id', link.id);

      if (error) {
        return NextResponse.json({ error: 'Kunne ikke lagre vilkår', detail: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    const { data: agreement } = await admin
      .from('grunneier_agreements')
      .select(
        'id, status, base_text, final_text, contact_proposal, beekeeper_decision, contact_signed_at, beekeeper_signed_at, contact_id, created_by, apiary_id, role'
      )
      .eq('id', agreementId)
      .single();

    if (!agreement) {
      return NextResponse.json({ error: 'Fant ikke avtale' }, { status: 404 });
    }

    if (isScopedAgreementToken) {
      if (tokenAgreementId && String(agreement.id) !== tokenAgreementId) {
        return NextResponse.json({ error: 'Ingen tilgang til avtale' }, { status: 403 });
      }
      if (tokenApiaryId && String(agreement.apiary_id || '') !== tokenApiaryId) {
        return NextResponse.json({ error: 'Ingen tilgang til avtale' }, { status: 403 });
      }
    }

    const { data: contact } = await admin
      .from('contacts')
      .select('id, email')
      .eq('id', agreement.contact_id)
      .single();

    const contactEmail = String(contact?.email || '').trim().toLowerCase();
    const expectedContactId = tokenContactId || accountContactId;
    if (
      !contact ||
      (expectedContactId ? String(contact.id) !== expectedContactId : contactEmail !== email.toLowerCase())
    ) {
      return NextResponse.json({ error: 'Ingen tilgang til avtale' }, { status: 403 });
    }

    if (action === 'new_original') {
      const createdBy = agreement.created_by;
      if (!createdBy) {
        return NextResponse.json({ error: 'Mangler birøkter for avtalen' }, { status: 500 });
      }

      const { data: fullContact } = await admin
        .from('contacts')
        .select('id, name')
        .eq('id', agreement.contact_id)
        .maybeSingle();

      const { data: apiary } = agreement.apiary_id
        ? await admin
            .from('apiaries')
            .select('apiary_number, location')
            .eq('id', agreement.apiary_id)
            .maybeSingle()
        : { data: null as any };

      const { data: profile } = await admin
        .from('profiles')
        .select('full_name, email')
        .eq('id', createdBy)
        .maybeSingle();

      const baseText = standardAgreementText({
        apiaryNumber: apiary?.apiary_number || null,
        apiaryLocation: apiary?.location || null,
        contactName: fullContact?.name || null,
        beekeeperName: profile?.full_name || profile?.email || null,
        role: (agreement.role || 'grunneier') as Role,
      });

      const { data: inserted, error: insertError } = await admin
        .from('grunneier_agreements')
        .insert({
          created_by: createdBy,
          contact_id: agreement.contact_id,
          apiary_id: agreement.apiary_id,
          role: agreement.role,
          status: 'awaiting_contact_signature',
          base_text: baseText,
          contact_proposal: null,
          beekeeper_decision: 'pending',
          final_text: null,
          contact_signature_name: null,
          contact_signed_at: null,
          beekeeper_signature_name: null,
          beekeeper_signed_at: null,
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (insertError || !inserted?.id) {
        return NextResponse.json(
          { error: 'Kunne ikke opprette ny avtale', detail: insertError?.message || '' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, agreementId: inserted.id });
    }

    if (action === 'propose') {
      const proposal = asString(body?.proposal).trim();
      if (!proposal) {
        return NextResponse.json({ error: 'Mangler forslag' }, { status: 400 });
      }

      if (agreement.status === 'active') {
        return NextResponse.json({ error: 'Avtalen er allerede aktiv' }, { status: 400 });
      }
      if (agreement.status === 'terminated') {
        return NextResponse.json({ error: 'Avtalen er avsluttet' }, { status: 400 });
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
      if (agreement.status === 'terminated') {
        return NextResponse.json({ error: 'Avtalen er avsluttet' }, { status: 400 });
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
