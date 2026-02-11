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

    // 1. Fetch Alerts with safe error handling
    let activeAlerts: any[] = [];
    
    try {
      // First fetch the logs without the user join to avoid relationship errors
      const { data: rawAlerts, error: alertError } = await adminClient
        .from('hive_logs')
        .select(`
          *,
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
        console.error('Alerts fetch error:', alertError);
        debug.errors.push(`Alerts error: ${alertError.message}`);
      } else if (rawAlerts) {
        debug.counts.rawAlerts = rawAlerts.length;
        
        // Fetch reporters (users) manually to be safe
        const userIds = Array.from(new Set(rawAlerts.map(a => a.user_id).filter(Boolean)));
        
        let reportersMap: Record<string, any> = {};
        
        if (userIds.length > 0) {
            const { data: reporters } = await adminClient
                .from('profiles')
                .select('id, full_name, email, phone_number')
                .in('id', userIds);
                
            if (reporters) {
                reporters.forEach(r => {
                    reportersMap[r.id] = r;
                });
            }
        }

        // Combine data
        const combinedAlerts = rawAlerts.map(alert => ({
            ...alert,
            reporter: reportersMap[alert.user_id] || { full_name: 'Ukjent', email: '', phone_number: '' }
        }));

        // Filter in memory to handle potential null statuses safely
        activeAlerts = combinedAlerts.filter(a => !a.admin_status || a.admin_status !== 'resolved');
      }
    } catch (e: any) {
      console.error('Alerts fetch exception:', e);
      debug.errors.push(`Alerts exception: ${e.message}`);
    }
    
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
        hives (
            id, hive_number,
            apiaries (
                id, name, location, coordinates, user_id
            )
        )
      `)
      .eq('id', incidentId)
      .single();

    if (alertError) {
        debug.errors.push(`Alert fetch error: ${alertError.message}`);
        return { error: 'Fant ikke hendelsen', debug, success: false };
    }

    // Fetch reporter manually
    let reporter = null;
    const userId = alert.user_id || alert.hives?.apiaries?.user_id;

    if (userId) {
        const { data: userProfile } = await adminClient
            .from('profiles')
            .select('id, full_name, email, phone_number')
            .eq('id', userId)
            .single();
        reporter = userProfile;
    }

    const alertWithReporter = {
        ...alert,
        reporter: reporter || { full_name: 'Ukjent', email: '', phone_number: '' }
    };

    // 2. Fetch All Apiaries for Map
    const { data: rawApiaries, error: apiariesError } = await adminClient
      .from('apiaries')
      .select('*');

    let apiaries: any[] = [];
    
    if (apiariesError) {
        debug.errors.push(`Apiaries fetch error: ${apiariesError.message}`);
    } else if (rawApiaries) {
        // Fetch owners manually
        const userIds = Array.from(new Set(rawApiaries.map((a: any) => a.user_id).filter(Boolean)));
        let usersMap: Record<string, any> = {};
        
        if (userIds.length > 0) {
            const { data: users } = await adminClient
                .from('profiles')
                .select('id, full_name, email, phone_number')
                .in('id', userIds);
                
            if (users) {
                users.forEach((u: any) => usersMap[u.id] = u);
            }
        }

        apiaries = rawApiaries.map((a: any) => ({
            ...a,
            users: usersMap[a.user_id] || { full_name: 'Ukjent' }
        }));
    }

    debug.success = true;
    debug.apiaryCount = apiaries?.length || 0;

    return { alert: alertWithReporter, apiaries, debug, success: true };
  } catch (e: any) {
    debug.errors.push(`Catch: ${e.message}`);
    return { error: 'Server error', debug, success: false };
  }
}

export async function getAllAlerts() {
    const adminClient = createAdminClient();
    try {
        const { data: alerts, error } = await adminClient
            .from('hive_logs')
            .select(`
                *,
                hives (
                    hive_number,
                    apiaries (name, location)
                )
            `)
            .eq('action', 'SYKDOM')
            .order('created_at', { ascending: false });

        if (error) return { error: error.message };

        // Fetch reporters
        const userIds = Array.from(new Set(alerts.map(a => a.user_id).filter(Boolean)));
        let reportersMap: Record<string, any> = {};
        
        if (userIds.length > 0) {
            const { data: reporters } = await adminClient
                .from('profiles')
                .select('id, full_name, email')
                .in('id', userIds);
                
            if (reporters) {
                reporters.forEach(r => reportersMap[r.id] = r);
            }
        }

        const enrichedAlerts = alerts.map(alert => ({
            ...alert,
            reporter: reportersMap[alert.user_id] || { full_name: 'Ukjent' }
        }));

        return { alerts: enrichedAlerts };
    } catch (e: any) {
        return { error: e.message };
    }
}
