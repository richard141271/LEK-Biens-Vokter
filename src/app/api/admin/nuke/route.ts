import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    // Allow if secret matches OR if authenticated admin
    let isAdmin = false;
    
    if (secret === 'nuke-it-all-please') {
      isAdmin = true;
    } else {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const adminVerifier = createAdminClient();
        const { data: adminProfile } = await adminVerifier
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        const isVip = user.email === 'richard141271@gmail.com';
        isAdmin = adminProfile?.role === 'admin' || isVip;
      }
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Ingen tilgang' }, { status: 403 });
    }

    let client;
    let mode = 'admin_client';
    
    // Check if Service Role Key is available
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.log('Service Role Key found, using admin client');
        client = createAdminClient();
    } else {
        console.log('Service Role Key MISSING, using user session client');
        client = createClient();
        mode = 'user_client';
    }

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
