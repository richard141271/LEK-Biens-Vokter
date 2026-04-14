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
  role: Role;
}) {
  const apiaryTitle =
    params.apiaryNumber || params.apiaryName
      ? `${params.apiaryNumber || 'Bigård'}${params.apiaryName ? ` – ${params.apiaryName}` : ''}`
      : 'Bigård';

  const locationLine = params.apiaryLocation ? `Sted: ${params.apiaryLocation}` : '';
  const contactLine = params.contactName ? `Grunneier/kontakt: ${params.contactName}` : 'Grunneier/kontakt: ________';
  const roleLine = `Rolle: ${params.role}`;

  return [
    'AVTALE OM TILGANG TIL BIGÅRD-INFO (GRUNNEIERPORTAL)',
    '',
    `Gjelder: ${apiaryTitle}`,
    locationLine,
    contactLine,
    roleLine,
    '',
    '1. Formål',
    'Denne avtalen gjør det mulig for grunneier/kontakt å få innsyn i enkel informasjon om bigården (lokasjon og grunnleggende status), for å skape trygghet, transparens og god dialog.',
    '',
    '2. Tilgang og innhold',
    '- Tilgangen er begrenset til bigårder som er knyttet til avtalen.',
    '- Ingen passord: tilgang gis via engangslenker på e-post.',
    '- Det deles ikke sensitive personopplysninger utover det som er nødvendig for drift og samtykke.',
    '',
    '3. Ansvar og hensyn',
    '- Birøkter har ansvar for drift, dyrevelferd og oppfølging av bigården.',
    '- Grunneier kan når som helst be om at bigården flyttes, innen rimelig tid og praktisk mulighet.',
    '- Begge parter forplikter seg til saklig og god kommunikasjon ved uenighet.',
    '',
    '4. Varighet og opphør',
    'Avtalen gjelder til den sies opp av en av partene. Ved opphør skal tilgangen fjernes.',
    '',
    '5. Unntak/tillegg',
    'Grunneier kan foreslå unntak/tillegg før avtalen aktiveres. Birøkter kan godta eller avvise forslag. Ved avvisning må partene bli enige om ny tekst før avtalen kan signeres.',
    '',
    '6. Signatur',
    'Avtalen blir aktiv først når begge parter har signert digitalt.',
  ]
    .filter((l) => l !== '')
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
      const baseText = standardAgreementText({
        apiaryNumber: apiary?.apiary_number,
        apiaryName: apiary?.name,
        apiaryLocation: apiary?.location,
        contactName: finalName,
        role,
      });

      const { data: existingAgreement } = await supabase
        .from('grunneier_agreements')
        .select('id, status')
        .eq('apiary_id', apiaryId)
        .eq('contact_id', finalContactId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingAgreement?.id) {
        agreementId = existingAgreement.id;
        if (existingAgreement.status === 'active') {
          agreementAlreadyActive = true;
        } else if (sendInvite) {
          await supabase
            .from('grunneier_agreements')
            .update({
              status: 'awaiting_contact',
              base_text: baseText,
              updated_at: new Date().toISOString(),
            })
            .eq('id', agreementId);
        }
      } else {
        const { data: activeAgreement } = await supabase
          .from('grunneier_agreements')
          .select(
            'id, contact_signature_name, contact_signed_at, beekeeper_signature_name, beekeeper_signed_at, final_text'
          )
          .eq('contact_id', finalContactId)
          .eq('created_by', user.id)
          .eq('status', 'active')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activeAgreement?.id) {
          const { data: inserted, error: insertError } = await supabase
            .from('grunneier_agreements')
            .insert({
              created_by: user.id,
              apiary_id: apiaryId,
              contact_id: finalContactId,
              role,
              status: 'active',
              base_text: baseText,
              contact_proposal: null,
              beekeeper_decision: 'accepted',
              final_text: activeAgreement.final_text || null,
              contact_signature_name: activeAgreement.contact_signature_name || null,
              contact_signed_at: activeAgreement.contact_signed_at || null,
              beekeeper_signature_name: activeAgreement.beekeeper_signature_name || null,
              beekeeper_signed_at: activeAgreement.beekeeper_signed_at || null,
              updated_at: new Date().toISOString(),
            })
            .select('id')
            .single();

          if (insertError || !inserted?.id) {
            return NextResponse.json(
              { error: 'Kunne ikke opprette avtale', detail: insertError?.message || '' },
              { status: 500 }
            );
          }

          agreementId = inserted.id;
          agreementAlreadyActive = true;
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
                })
                .select('id')
                .single()
            ).data?.id || null;
        }
      }

      if (!agreementId) {
        return NextResponse.json({ error: 'Kunne ikke opprette avtale' }, { status: 500 });
      }
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
