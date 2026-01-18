import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Ikke logget inn' }, { status: 401 });
    }

    const adminVerifier = createAdminClient();
    const { data: adminProfile, error: profileError } = await adminVerifier
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Feil ved henting av admin-profil:', profileError);
      return NextResponse.json(
        { error: 'Kunne ikke verifisere tilgang' },
        { status: 500 }
      );
    }

    const isVip = user.email === 'richard141271@gmail.com';
    const isAdmin = adminProfile?.role === 'admin';

    if (!isAdmin && !isVip) {
      return NextResponse.json(
        { error: 'Ingen tilgang: Krever admin-rettigheter' },
        { status: 403 }
      );
    }

    const adminClient = createAdminClient();

    const { data: responses, error } = await adminClient
      .from('survey_responses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Feil ved henting av survey-responser:', error);
      return NextResponse.json(
        { error: 'Kunne ikke hente survey-responser' },
        { status: 500 }
      );
    }

    const safeResponses = responses || [];

    const pilotCount = safeResponses.filter((response: any) => {
      const answerRaw = response.pilot_answer as string | null;
      const answer = (answerRaw || '').toLowerCase();
      const interest = response.pilot_interest as boolean | null;
      const positiveAnswer = answer === 'ja' || answer === 'kanskje';
      return interest === true || positiveAnswer;
    }).length;

    return NextResponse.json(
      {
        responses: safeResponses,
        pilotCount,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error('Uventet feil i survey-results API:', e);
    return NextResponse.json(
      { error: 'Uventet feil ved henting av survey-data' },
      { status: 500 }
    );
  }
}
