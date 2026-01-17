import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

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
    const adminClient = createAdminClient();
    const body = (await request.json()) as Body;

    const ipAddress = getClientIp(request);

    if (body.pilotEmail) {
      const { count: existingEmailCount, error: emailCountError } =
        await adminClient
          .from('survey_pilot_interest')
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

    if (ipAddress) {
      const { count: recentCount, error: ipError } = await adminClient
        .from('survey_responses')
        .select('*', { count: 'exact', head: true })
        .eq('ip_address', ipAddress)
        .gte(
          'submitted_at',
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        );

      if (ipError) {
        console.error('Feil ved IP-rate-limiting', ipError);
      } else if ((recentCount || 0) >= 3) {
        return NextResponse.json(
          {
            error:
              'Det er registrert flere svar fra denne tilkoblingen i dag. Prøv igjen i morgen.',
          },
          { status: 429 }
        );
      }
    }

    const experiencedDiseaseBool =
      body.experiencedDisease === ''
        ? null
        : body.experiencedDisease === 'ja';

    const { error: insertError } = await adminClient
      .from('survey_responses')
      .insert({
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
        is_test: false,
        is_invalid: false,
        submitted_at: new Date().toISOString(),
        ip_address: ipAddress,
      });

    if (insertError) {
      console.error('Feil ved lagring av survey-respons', insertError);
      return NextResponse.json(
        {
          error:
            'Noe gikk galt ved innsending av skjemaet. Vennligst prøv igjen om litt.',
        },
        { status: 500 }
      );
    }

    if (
      (body.pilotAnswer === 'ja' || body.pilotAnswer === 'kanskje') &&
      body.pilotEmail
    ) {
      const { error: pilotError } = await adminClient
        .from('survey_pilot_interest')
        .insert({
          email: body.pilotEmail,
          interested: true,
        });

      if (pilotError) {
        console.error('Feil ved lagring av pilot-interesse', pilotError);
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error('Uventet feil ved innsending av survey', e);
    return NextResponse.json(
      {
        error:
          'Noe gikk galt ved innsending av skjemaet. Vennligst prøv igjen om litt.',
      },
      { status: 500 }
    );
  }
}

