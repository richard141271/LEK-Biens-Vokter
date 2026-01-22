import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { surveyId, surveyVersion, answers } = body;

    if (!surveyId || !answers) {
      return NextResponse.json(
        { error: 'Mangler surveyId eller svar' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // 1. Save the main submission
    const { error: submissionError } = await supabase
      .from('survey_submissions')
      .insert({
        survey_id: surveyId,
        survey_version: surveyVersion,
        answers: answers,
        // user_id will be handled by RLS if authenticated, or we can explicitly set it if we want
      });

    if (submissionError) {
      console.error('Feil ved lagring av survey_submissions:', submissionError);
      return NextResponse.json(
        { error: 'Kunne ikke lagre svarene' },
        { status: 500 }
      );
    }

    // 2. Handle Pilot Interest (Rule #5)
    // We look for known pilot question IDs. In a fully dynamic system, we'd use tags/metadata.
    // Supports Beekeeper (bk_), Non-Beekeeper (nb_) prefixes and generic (no prefix).
    const pilotInterest = answers['bk_pilot_interest'] || answers['nb_pilot_interest'] || answers['pilot_interest'];
    const pilotEmail = answers['bk_pilot_email'] || answers['nb_pilot_email'] || answers['pilot_email'];

    if (pilotEmail && (pilotInterest === 'yes' || pilotInterest === 'maybe' || pilotInterest === 'ja' || pilotInterest === 'kanskje')) {
      const { error: pilotError } = await supabase
        .from('pilot_interest')
        .insert({
          email: pilotEmail,
          interested: true,
          status: (pilotInterest === 'yes' || pilotInterest === 'ja') ? 'Interessert' : 'Kanskje',
          source: surveyId
        });

      if (pilotError) {
        // Ignore unique violation (already registered)
        if (pilotError.code !== '23505') {
          console.error('Feil ved lagring av pilot_interest:', pilotError);
        }
      }
    }

    return NextResponse.json({ success: true });

  } catch (e: any) {
    console.error('Uventet feil i submit-v2:', e);
    return NextResponse.json(
      { error: 'En uventet feil oppstod' },
      { status: 500 }
    );
  }
}
