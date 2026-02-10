'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function getMattilsynetDashboardData() {
  const debug: any = {
    step: 'start',
    errors: [],
    counts: {}
  };

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Ikke logget inn', debug };
    }

    debug.user = user.email;

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
      return { error: 'Ingen tilgang', debug };
    }

    debug.access = 'granted';

    const adminClient = createAdminClient();

    // 1. Fetch Alerts
    const { data: alerts, error: alertError } = await adminClient
      .from('hive_logs')
      .select(`
        *,
        reporter:user_id (
          full_name,
          phone_number,
          email
        ),
        hives (
          hive_number,
          apiary_id,
          apiaries (
            name,
            location
          )
        )
      `)
      .eq('action', 'SYKDOM')
      .order('created_at', { ascending: false });

    if (alertError) {
      debug.errors.push(`Alerts error: ${alertError.message}`);
    } else {
      debug.counts.rawAlerts = alerts?.length || 0;
    }

    const activeAlerts = alerts?.filter(a => !a.admin_status || a.admin_status !== 'resolved') || [];
    debug.counts.activeAlerts = activeAlerts.length;

    // 2. Fetch Stats
    const { count: apiaryCount, error: apiaryError } = await adminClient
        .from('apiaries')
        .select('*', { count: 'exact', head: true });
    
    if (apiaryError) debug.errors.push(`Apiary error: ${apiaryError.message}`);
    debug.counts.apiaries = apiaryCount;

    const { count: inspectionCount, error: inspectionError } = await adminClient
        .from('hive_logs')
        .select('*', { count: 'exact', head: true })
        .eq('action', 'INSPEKSJON');

    if (inspectionError) debug.errors.push(`Inspection error: ${inspectionError.message}`);
    debug.counts.inspections = inspectionCount;

    return {
      alerts: activeAlerts,
      stats: {
        alerts: activeAlerts.length,
        inspections: inspectionCount || 0,
        apiaries: apiaryCount || 0
      },
      debug
    };

  } catch (e: any) {
    debug.errors.push(`Catch: ${e.message}`);
    return { error: 'Server error', debug };
  }
}

export async function getIncidentData(incidentId: string) {
  const debug: any = {
    step: 'start_incident',
    errors: [],
    id: incidentId
  };

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'Ikke logget inn', debug, success: false };

    const adminVerifier = createAdminClient();
    const { data: adminProfile } = await adminVerifier
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isVip = user.email === 'richard141271@gmail.com';
    const isInspector = adminProfile?.role === 'mattilsynet' || adminProfile?.role === 'admin';

    if (!isInspector && !isVip) return { error: 'Ingen tilgang', debug, success: false };

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
      .eq('id', incidentId)
      .single();

    if (alertError) {
        debug.errors.push(`Alert fetch error: ${alertError.message}`);
        return { error: 'Fant ikke hendelsen', debug, success: false };
    }

    // 2. Fetch All Apiaries for Map
    const { data: apiaries, error: apiariesError } = await adminClient
      .from('apiaries')
      .select(`
        *,
        users (full_name, phone_number, email)
      `);

    if (apiariesError) {
        debug.errors.push(`Apiaries fetch error: ${apiariesError.message}`);
    }

    debug.success = true;
    debug.apiaryCount = apiaries?.length || 0;

    return { alert, apiaries, debug, success: true };

  } catch (e: any) {
    debug.errors.push(`Catch: ${e.message}`);
    return { error: 'Server error', debug, success: false };
  }
}
