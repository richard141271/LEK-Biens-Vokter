import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';

function getClientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (!forwarded) return null;
  const parts = forwarded.split(',');
  return parts[0]?.trim() || null;
}

type Body = {
  // Common
  isBeekeeper: boolean;
  county: string | null;
  pilotAnswer: 'ja' | 'kanskje' | 'nei' | '';
  pilotEmail: string | null;

  // Beekeeper specific
  numberOfHivesCategory?: string | null;
  yearsExperienceCategory?: string | null;
  isMember?: '' | 'ja' | 'nei';
  experiencedDisease?: '' | 'ja' | 'nei' | 'usikker';
  diseaseTypes?: string[];
  currentRecordMethod?: string | null;
  timeSpentPerWeek?: string | null;
  valueWarningSystem?: number;
  valueNearbyAlert?: number;
  valueReporting?: number;
  valueBetterOverview?: number;
  wouldUseSystemChoice?: string | null;
  pricePerYear?: string | null;
  biggestChallenge?: string | null;
  featureWishes?: string | null;

  // Non-beekeeper specific
  eatsHoney?: 'ja' | 'nei' | 'vet_ikke' | '';
  rentalInterest?: 'ja' | 'nei' | 'vet_ikke' | '';
  rentalPrice?: string | null;
  pollinatorImportance?: 'ja' | 'nei' | 'vet_ikke' | '';
  digitalToolInterest?: 'ja' | 'nei' | 'vet_ikke' | '';
  diseaseAwareness?: 'ja' | 'nei' | 'usikker' | '';
  knowledgeAboutBeekeeping?: string | null;
  consideredStartingBeekeeping?: string | null;
};

export async function POST(request: Request) {
  try {
    const hasServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const client = hasServiceRoleKey ? createAdminClient() : createClient();
    const body = (await request.json()) as Body;

    const pilotPositive =
      body.pilotAnswer === 'ja' || body.pilotAnswer === 'kanskje';

    // Check for existing email if pilot interest
    if (hasServiceRoleKey && body.pilotEmail) {
      const { count: existingEmailCount, error: emailCountError } =
        await client
          .from('pilot_interest')
          .select('*', { count: 'exact', head: true })
          .eq('email', body.pilotEmail);

      if (emailCountError) {
        console.error('Feil ved sjekk av pilot-e-post', emailCountError);
        // Continue anyway to save survey response, but log error
      } else if ((existingEmailCount || 0) > 0) {
        return NextResponse.json(
          {
            error:
              'Denne e-postadressen har allerede svart på undersøkelsen.',
          },
          { status: 400 }
        );
      }
    }

    // Prepare payload for survey_responses
    const basePayload: any = {
      is_beekeeper: body.isBeekeeper,
      county: body.county || null,
      pilot_answer: body.pilotAnswer || null,
      pilot_interest: pilotPositive ? true : null,
      ip_address: getClientIp(request),
    };

    if (body.isBeekeeper) {
      // Beekeeper specific fields
      Object.assign(basePayload, {
        number_of_hives_category: body.numberOfHivesCategory || null,
        years_experience_category: body.yearsExperienceCategory || null,
        is_member_norwegian_beekeepers: body.isMember === '' ? null : body.isMember === 'ja',
        experienced_disease: body.experiencedDisease === '' ? null : body.experiencedDisease === 'ja',
        disease_types: body.diseaseTypes && body.diseaseTypes.length > 0 ? body.diseaseTypes.join(',') : null,
        current_record_method: body.currentRecordMethod || null,
        time_spent_documentation: body.timeSpentPerWeek || null,
        value_warning_system: body.valueWarningSystem,
        value_nearby_alert: body.valueNearbyAlert,
        value_reporting: body.valueReporting,
        value_better_overview: body.valueBetterOverview,
        would_use_system_choice: body.wouldUseSystemChoice || null,
        willingness_to_pay: body.pricePerYear || null,
        biggest_challenge: body.biggestChallenge || null,
        feature_wishes: body.featureWishes || null,
      });
    } else {
      // Non-beekeeper specific fields
      Object.assign(basePayload, {
        eats_honey: body.eatsHoney || null,
        rental_interest: body.rentalInterest || null,
        rental_price: body.rentalPrice || null,
        pollinator_importance: body.pollinatorImportance || null,
        digital_tool_interest: body.digitalToolInterest || null,
        disease_awareness: body.diseaseAwareness || null,
        disease_types: body.diseaseTypes && body.diseaseTypes.length > 0 ? body.diseaseTypes.join(',') : null,
        knowledge_about_beekeeping: body.knowledgeAboutBeekeeping || null,
        considered_starting_beekeeping: body.consideredStartingBeekeeping || null,
      });
    }

    const { error: insertError } = await client
      .from('survey_responses')
      .insert(basePayload);

    if (insertError) {
      console.error('Feil ved lagring av survey-respons', insertError);
      return NextResponse.json(
        {
          error: 'Noe gikk galt ved innsending av skjemaet. Vennligst prøv igjen om litt.',
          details: insertError.message,
        },
        { status: 500 }
      );
    }

    // Save to pilot_interest if applicable
    if (pilotPositive && body.pilotEmail) {
      const { error: pilotError } = await client
        .from('pilot_interest')
        .insert({
          email: body.pilotEmail,
          interested: true,
          status: body.pilotAnswer === 'ja' ? 'Interessert' : 'Kanskje',
          source: body.isBeekeeper ? 'survey_beekeeper' : 'survey_non_beekeeper',
        });

      if (pilotError) {
        console.error('Feil ved lagring av pilot-interesse', pilotError);
        // We don't fail the request if this part fails, as the main survey is saved
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error('Uventet feil ved innsending av survey', e);
    return NextResponse.json(
      {
        error: 'Noe gikk galt ved innsending av skjemaet. Vennligst prøv igjen om litt.',
        details: e instanceof Error ? e.message : 'Ukjent feil',
      },
      { status: 500 }
    );
  }
}
