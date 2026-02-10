'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';

export async function getIncidentData(id: string) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Ikke logget inn' };
    }

    // Verify access
    const adminVerifier = createAdminClient();
    const { data: adminProfile } = await adminVerifier
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isVip = user.email === 'richard141271@gmail.com';
    const isInspector = adminProfile?.role === 'mattilsynet' || adminProfile?.role === 'admin';

    if (!isInspector && !isVip) {
      return { error: 'Ingen tilgang' };
    }

    const adminClient = createAdminClient();

    // 1. Fetch Alert Details
    const { data: alert, error: alertError } = await adminClient
      .from('hive_logs')
      .select(`
        *,
        reporter:user_id (
            id, full_name, email, phone_number
        ),
        hives (
            id, hive_number,
            apiaries (
                id, name, location
            )
        )
      `)
      .eq('id', id)
      .single();

    if (alertError) {
      console.error('Error fetching alert:', alertError);
      return { error: 'Fant ikke hendelsen' };
    }

    // 2. Fetch All Apiaries for Map (including owner info)
    const { data: apiaries, error: apiariesError } = await adminClient
      .from('apiaries')
      .select(`
        *,
        users (full_name, phone_number, email)
      `);

    if (apiariesError) {
      console.error('Error fetching apiaries:', apiariesError);
      return { error: 'Kunne ikke hente bigårder' };
    }

    return { alert, apiaries, success: true };

  } catch (e) {
    console.error('Unexpected error in getIncidentData:', e);
    return { error: 'Uventet feil' };
  }
}
