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
  county: string | null;
  numberOfHivesCategory: string | null;
  yearsExperienceCategory: string | null;
  isMember: '' | 'ja' | 'nei';
  experiencedDisease: '' | 'ja' | 'nei' | 'usikker';
  diseaseTypes: string[];
  currentRecordMethod: string | null;
  timeSpentPerWeek: string | null;
  valueWarningSystem: number;
  valueNearbyAlert: number;
  valueReporting: number;
  valueBetterOverview: number;
  wouldUseSystemChoice: string | null;
  pricePerYear: string | null;
  biggestChallenge: string | null;
  featureWishes: string | null;
  pilotAnswer: 'ja' | 'kanskje' | 'nei' | '';
  pilotEmail: string | null;
};

export async function POST(request: Request) {
  try {
    const hasServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const client = hasServiceRoleKey ? createAdminClient() : createClient();
    const body = (await request.json()) as Body;

    if (hasServiceRoleKey && body.pilotEmail) {
      const { count: existingEmailCount, error: emailCountError } =
        await client
          .from('pilot_interest')
          .select('*', { count: 'exact', head: true })
          .eq('email', body.pilotEmail);

      if (emailCountError) {
        console.error('Feil ved sjekk av pilot-e-post', emailCountError);
        return NextResponse.json(
          {
            error:
              'Kunne ikke validere e-postadressen. Vennligst prøv igjen senere.',
          },
          { status: 500 }
        );
      }

      if ((existingEmailCount || 0) > 0) {
        return NextResponse.json(
          {
            error:
              'Denne e-postadressen har allerede svart på undersøkelsen.',
          },
          { status: 400 }
        );
      }
    }

    const experiencedDiseaseBool =
      body.experiencedDisease === ''
        ? null
        : body.experiencedDisease === 'ja';

    const basePayload: any = {
      county: body.county || null,
      number_of_hives_category: body.numberOfHivesCategory || null,
      years_experience_category: body.yearsExperienceCategory || null,
      is_member_norwegian_beekeepers:
        body.isMember === '' ? null : body.isMember === 'ja',
      experienced_disease: experiencedDiseaseBool,
      disease_types:
        body.diseaseTypes && body.diseaseTypes.length > 0
          ? body.diseaseTypes.join(',')
          : null,
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
      ip_address: getClientIp(request),
    };

    const { data: insertData, error } = await client
      .from('survey_responses')
      .insert(basePayload)
      .select('id');

    if (error) {
      console.error('Feil ved lagring av survey-respons', error);
      const details =
        typeof error.message === 'string'
          ? error.message
          : JSON.stringify(error);
      return NextResponse.json(
        {
          error:
            'Noe gikk galt ved innsending av skjemaet. Vennligst prøv igjen om litt.',
          details,
        },
        { status: 500 }
      );
    }

    const rows: any = insertData as any;
    const responseId = Array.isArray(rows) ? rows[0]?.id : rows?.id;

    const pilotPositive =
      body.pilotAnswer === 'ja' || body.pilotAnswer === 'kanskje';

    if (pilotPositive && responseId) {
      try {
        const { error: pilotColumnsError } = await client
          .from('survey_responses')
          .update({
            pilot_answer: body.pilotAnswer || null,
            pilot_interest: true,
          })
          .eq('id', responseId);

        if (pilotColumnsError) {
          console.error(
            'Feil ved oppdatering av pilot-kolonner i survey_responses',
            pilotColumnsError
          );
        }
      } catch (e) {
        console.error(
          'Uventet feil ved oppdatering av pilot-kolonner i survey_responses',
          e
        );
      }
    }

    if (
      pilotPositive &&
      body.pilotEmail
    ) {
      const { error: pilotError } = await client
        .from('pilot_interest')
        .insert({
          email: body.pilotEmail,
          interested: true,
          status: body.pilotAnswer === 'ja' ? 'Interessert' : 'Kanskje',
          source: 'survey'
        });

      if (pilotError) {
        // If columns don't exist yet (migration pending), try fallback without them
        const message = pilotError.message || '';

        if (
          message.includes(
            'column "status" of relation "pilot_interest" does not exist'
          ) ||
          message.includes(
            'column \"status\" of relation \"pilot_interest\" does not exist'
          )
        ) {
          const { error: fallbackError } = await client
            .from('pilot_interest')
            .insert({
              email: body.pilotEmail,
              interested: true,
            });
          if (fallbackError) {
            console.error(
              'Feil ved lagring av pilot-interesse (fallback pilot_interest)',
              fallbackError
            );
          }
        } else if (
          message.includes('relation "pilot_interest" does not exist') ||
          message.includes('relation \"pilot_interest\" does not exist')
        ) {
          const { error: legacyError } = await client
            .from('survey_pilot_interest')
            .insert({
              email: body.pilotEmail,
              interested: true,
            });
          if (legacyError) {
            console.error(
              'Feil ved lagring av pilot-interesse (fallback survey_pilot_interest)',
              legacyError
            );
          }
        } else {
          console.error('Feil ved lagring av pilot-interesse', pilotError);
        }
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error('Uventet feil ved innsending av survey', e);
    const details =
      e instanceof Error ? e.message : typeof e === 'string' ? e : JSON.stringify(e);
    return NextResponse.json(
      {
        error:
          'Noe gikk galt ved innsending av skjemaet. Vennligst prøv igjen om litt.',
        details,
      },
      { status: 500 }
    );
  }
}
