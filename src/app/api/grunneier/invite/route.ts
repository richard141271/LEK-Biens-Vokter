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

function standardAgreementText(params: {
  apiaryNumber?: string | null;
  apiaryName?: string | null;
  apiaryLocation?: string | null;
  contactName?: string | null;
  beekeeperName?: string | null;
  role: Role;
}) {
  const apiaryTitle =
    params.apiaryNumber || params.apiaryName
      ? `${params.apiaryNumber || 'Bigård'}${params.apiaryName ? ` – ${params.apiaryName}` : ''}`
      : 'Bigård';

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
  ]
    .join('\n');
}

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
    const sendInvite = Boolean(body?.sendInvite);

    if (!['grunneier', 'kontaktperson', 'samarbeidspartner'].includes(role)) {
      return NextResponse.json({ error: 'Ugyldig rolle' }, { status: 400 });
    }

    if (sendInvite && !apiaryId) {
      return NextResponse.json({ error: 'Mangler apiaryId' }, { status: 400 });
    }

    const { data: apiary } = apiaryId
      ? await supabase
          .from('apiaries')
          .select('id, name, apiary_number, location')
          .eq('id', apiaryId)
          .single()
      : { data: null as any };

    if (apiaryId && !apiary) {
      return NextResponse.json({ error: 'Fant ikke bigård' }, { status: 404 });
    }

    let finalContactId = contactId;
    let finalEmail = '';
    let finalName = '';

    if (finalContactId) {
      const { data: existingContact, error: contactError } = await supabase
        .from('contacts')
        .select('id, name, email, is_active')
        .eq('id', finalContactId)
        .single();

      if (contactError || !existingContact) {
        return NextResponse.json({ error: 'Ingen tilgang til kontakt' }, { status: 403 });
      }
      if (existingContact.is_active === false) {
        return NextResponse.json({ error: 'Kontakt er deaktivert' }, { status: 400 });
      }

      finalEmail = existingContact.email || '';
      finalName = existingContact.name || '';
    } else {
      const name = String(contactInput?.name || '').trim();
      const email = String(contactInput?.email || '').trim();

      if (!name) {
        return NextResponse.json({ error: 'Mangler navn' }, { status: 400 });
      }
      if (!email && sendInvite) {
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
          email: email || null,
        })
        .select('id, name, email')
        .single();

      if (createError || !created) {
        const msg = String(createError?.message || '');
        const hint =
          msg.includes('contacts') && msg.includes('does not exist')
            ? 'Mangler database-tabell for kontakter. Kjør DB-migrasjoner.'
            : msg.includes('contacts_created_by_fkey')
              ? 'Profil-tilknytning feilet. Oppdater DB-migrasjoner og prøv igjen.'
              : '';
        return NextResponse.json(
          { error: 'Kunne ikke opprette kontakt', detail: hint || msg || undefined },
          { status: 500 }
        );
      }

      finalContactId = created.id;
      finalEmail = created.email || '';
      finalName = created.name || '';
    }

    if (!finalContactId) {
      return NextResponse.json({ error: 'Kunne ikke bestemme kontakt' }, { status: 500 });
    }
    if (sendInvite && !finalEmail) {
      return NextResponse.json({ error: 'Kontakt mangler e-post' }, { status: 400 });
    }

    if (apiaryId) {
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
        return NextResponse.json(
          { error: 'Kunne ikke knytte kontakt til bigård', detail: linkError.message },
          { status: 500 }
        );
      }
    }

    let agreementId: string | null = null;
    let agreementAlreadyActive = false;

    if (apiaryId) {
      const { data: beekeeperProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      const beekeeperName = String(beekeeperProfile?.full_name || user.email || '').trim() || null;

      const baseText = standardAgreementText({
        apiaryNumber: apiary?.apiary_number,
        apiaryName: apiary?.name,
        apiaryLocation: apiary?.location,
        contactName: finalName,
        beekeeperName,
        role,
      });

      const { data: existingAgreement } = await supabase
        .from('grunneier_agreements')
        .select('id, status')
        .eq('apiary_id', apiaryId)
        .eq('contact_id', finalContactId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const existingStatus = String(existingAgreement?.status || '').toLowerCase();
      const canReuseExisting = Boolean(existingAgreement?.id);

      if (canReuseExisting && existingAgreement?.id) {
        agreementId = existingAgreement.id;
        if (existingStatus === 'active') {
          agreementAlreadyActive = true;
        } else {
          const nextStatus = sendInvite ? 'awaiting_contact' : 'draft';
          await supabase
            .from('grunneier_agreements')
            .update({
              status: nextStatus,
              base_text: baseText,
              contact_proposal: null,
              beekeeper_decision: 'pending',
              final_text: null,
              contact_signature_name: null,
              contact_signed_at: null,
              beekeeper_signature_name: null,
              beekeeper_signed_at: null,
              terminated_at: null,
              terminated_by: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', agreementId);
        }
      } else {
        agreementId =
          (
            await supabase
              .from('grunneier_agreements')
              .insert({
                created_by: user.id,
                apiary_id: apiaryId,
                contact_id: finalContactId,
                role,
                status: sendInvite ? 'awaiting_contact' : 'draft',
                base_text: baseText,
                beekeeper_decision: 'pending',
                updated_at: new Date().toISOString(),
              })
              .select('id')
              .single()
          ).data?.id || null;
      }

      if (!agreementId) {
        return NextResponse.json({ error: 'Kunne ikke opprette avtale' }, { status: 500 });
      }

      await admin
        .from('grunneier_agreements')
        .delete()
        .eq('apiary_id', apiaryId)
        .eq('contact_id', finalContactId)
        .neq('id', agreementId);
    }

    if (!sendInvite) {
      return NextResponse.json({
        success: true,
        contact: { id: finalContactId, name: finalName, email: finalEmail || null },
        agreementId,
        agreementAlreadyActive,
      });
    }

    if (!agreementId) {
      return NextResponse.json({ error: 'Mangler avtale' }, { status: 500 });
    }

    if (agreementAlreadyActive) {
      return NextResponse.json({
        success: true,
        agreementId,
        contact: { id: finalContactId, name: finalName, email: finalEmail || null },
        agreementAlreadyActive: true,
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const { error: tokenError } = await admin.from('magic_tokens').insert({
      email: finalEmail,
      token,
      expires_at: expiresAt,
      used: false,
      purpose: 'agreement',
      agreement_id: agreementId,
      contact_id: finalContactId,
      apiary_id: apiaryId,
    });

    if (tokenError) {
      return NextResponse.json(
        { error: 'Kunne ikke opprette invitasjon', detail: tokenError.message },
        { status: 500 }
      );
    }

    const url = `${getBaseUrl(request)}/grunneier?token=${encodeURIComponent(token)}`;

    const mail = getMailService(admin);
    const mailProvider = String((mail as any)?.constructor?.name || '');
    const mailResult = await mail.sendMail(
      'Biens Vokter',
      finalEmail,
      'Signer avtale for tilgang til bigård',
      [
        `Hei${finalName ? ` ${finalName}` : ''}!`,
        '',
        'Du er invitert til å signere avtale for tilgang til bigård-oversikt.',
        'Etterpå kan du (valgfritt) opprette konto for enklere tilgang: Åpne lenken og trykk "Opprett konto".',
        '',
        `Signer avtalen her: ${url}`,
        '',
        `<a href="${url}" style="display:inline-block;background:#111827;color:#ffffff;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:600">Åpne og signer</a>`,
      ].join('\n'),
      user.id
    );

    if (mailResult?.error) {
      return NextResponse.json(
        { error: 'Kunne ikke sende e-post', detail: mailResult.error, inviteUrl: url, mailProvider },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      agreementId,
      contact: { id: finalContactId, name: finalName, email: finalEmail || null },
      inviteUrl: url,
      mailProvider,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Ukjent feil' }, { status: 500 });
  }
}
