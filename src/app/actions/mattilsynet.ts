'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getMailService } from '@/services/mail';

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
    let userId = alert.user_id;

    // Fallback: If no user_id in log, try to get it from the apiary
    if (!userId && alert.hives?.apiaries?.user_id) {
        userId = alert.hives.apiaries.user_id;
    }

    if (userId) {
            const { data: userProfile } = await adminClient
                .from('profiles')
                .select('id, full_name, email, phone_number, address')
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

export async function updateIncidentStatus(id: string, status: string) {
    const adminClient = createAdminClient();
    try {
        // 1. Update the main incident status
        const { data: incident, error } = await adminClient
            .from('hive_logs')
            .update({ admin_status: status })
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;

        // 2. If resolving, also resolve associated neighbor alerts
        if (status === 'resolved' && incident) {
            // Extract disease type from details string "Sykdom: X, ..."
            const diseaseMatch = incident.details.match(/Sykdom: (.*?)($|,)/);
            const disease = diseaseMatch ? diseaseMatch[1].trim() : null;

            if (disease) {
                const incidentTime = new Date(incident.created_at).getTime();
                // Look for alerts created within a short window (e.g., -10s to +1 hour) around the report
                // Neighbor alerts are created immediately after, so +1 hour is generous but safe
                const minTime = new Date(incidentTime - 10000).toISOString();
                const maxTime = new Date(incidentTime + 60 * 60 * 1000).toISOString();

                const { error: neighborError } = await adminClient
                    .from('hive_logs')
                    .update({ admin_status: 'resolved' })
                    .eq('action', 'SYKDOM')
                    .eq('shared_with_mattilsynet', false)
                    .ilike('details', `%NABOVARSEL: Smitte (${disease})%`)
                    .gte('created_at', minTime)
                    .lte('created_at', maxTime)
                    .is('admin_status', null); // Only update those not already handled

                if (neighborError) {
                    console.error("Failed to resolve neighbor alerts:", neighborError);
                    // We don't fail the main operation, just log the error
                } else {
                    console.log(`Resolved neighbor alerts for incident ${id} (Disease: ${disease})`);
                }
            }
        }

        return { success: true };
    } catch (e: any) {
        console.error('Error updating status:', e);
        return { error: e.message };
    }
}

export async function updateIncidentDisease(id: string, disease: string) {
    const adminClient = createAdminClient();
    try {
        // Fetch current details to preserve other info if needed, 
        // but typically we just want to update the disease part.
        // For simplicity, we'll assume we prepend/replace "Sykdom: X".
        // However, standardizing on a separate column would be better long term.
        // For now, let's update the details field string.
        
        const { data: current } = await adminClient
            .from('hive_logs')
            .select('details')
            .eq('id', id)
            .single();
            
        let newDetails = current?.details || '';
        if (newDetails.includes('Sykdom:')) {
            newDetails = newDetails.replace(/Sykdom: [^,]+/, `Sykdom: ${disease}`);
        } else {
            newDetails = `Sykdom: ${disease}, ${newDetails}`;
        }

        const { error } = await adminClient
            .from('hive_logs')
            .update({ details: newDetails })
            .eq('id', id);
            
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}

export async function dismissIncident(id: string) {
    // Mark as resolved (falsk alarm)
    return updateIncidentStatus(id, 'resolved');
}

export async function sendZoneAlert(incidentId: string, radius: number, emails: string[], message: string) {
    const adminClient = createAdminClient();
    const mailService = getMailService();
    
    console.log(`SENDING ALERT for ${incidentId} within ${radius}m`);
    console.log(`Recipients (${emails.length}):`, emails);

    try {
        // 1. Log to DB
        await adminClient.from('admin_logs').insert({
            action: 'ZONE_ALERT_SENT',
            details: `Sent to ${emails.length} recipients. Radius: ${radius}m.`,
            target_id: incidentId
        });

        // 2. Send Emails (Batch)
        if (emails.length > 0) {
            // Send individually to hide other recipients (BCC style) or just loop
            // For now, we'll loop to ensure delivery
            const emailPromises = emails.map(email => 
                mailService.sendMail(
                    'Mattilsynet', // fromAlias
                    email, // toAlias
                    'VIKTIG MELDING FRA MATTILSYNET - SMITTEVARSEL', // subject
                    message, // body
                    'system-alert' // userId (system)
                )
            );
            
            await Promise.allSettled(emailPromises);
        }

        return { success: true, count: emails.length };
    } catch (e: any) {
        console.error("Failed to send alerts:", e);
        return { error: e.message };
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
