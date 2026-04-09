import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    let isAdmin = false;
    
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const adminVerifier = createAdminClient();
      const { data: adminProfile } = await adminVerifier
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      isAdmin = adminProfile?.role === 'admin';
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Ingen tilgang' }, { status: 403 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server mangler service role' }, { status: 500 });
    }
    const client = createAdminClient();
    const mode = 'admin_client';

    // 1. Truncate survey_responses
    const { error: surveyError } = await client
      .from('survey_responses')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (surveyError) console.error('Error nuking survey_responses:', surveyError);

    // 2. Truncate pilot_interest
    const { error: pilotError } = await client
      .from('pilot_interest')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (pilotError) console.error('Error nuking pilot_interest:', pilotError);

    // Revalidate paths to ensure UI updates immediately
    revalidatePath('/dashboard/admin/survey-results-v2');
    revalidatePath('/dashboard/admin/pilot-interesser');
    revalidatePath('/dashboard/admin');

    return NextResponse.json({ 
      message: 'Survey data nuked successfully',
      mode,
      details: {
        survey: !surveyError ? 'OK' : surveyError.message,
        pilot: !pilotError ? 'OK' : pilotError.message,
      }
    });

  } catch (e: any) {
    console.error('Nuke failed:', e);
    return NextResponse.json({ error: 'Nuke failed', message: e.message, stack: e.stack }, { status: 500 });
  }
}
