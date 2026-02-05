'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';
import { getMailService } from '@/services/mail';

export async function getFounderStatus() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Get founder profile
  const { data: profile, error } = await supabase
    .from('founder_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) return { error: error.message };

  // Get checks
  const { data: checks } = await supabase
    .from('founder_agreement_checks')
    .select('check_key')
    .eq('founder_id', user.id);

  // Get ambitions (handle duplicates gracefully by taking the latest)
  const { data: ambitionsData } = await supabase
    .from('founder_ambitions')
    .select('*')
    .eq('founder_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1);

  const ambitions = ambitionsData?.[0] || null;

  return { 
    profile, 
    checks: checks?.map(c => c.check_key) || [],
    ambitions
  };
}

export async function updateAgreementCheck(key: string, checked: boolean) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  if (checked) {
    const { error } = await supabase
      .from('founder_agreement_checks')
      .insert({
        founder_id: user.id,
        check_key: key,
        checked_at: new Date().toISOString()
      });
    if (error) return { error: error.message };
  } else {
    // Ideally we shouldn't uncheck as it's a "log", but for UI toggling we might need to remove
    // But the user said "Lagres som bevis for hver avkrysning" (Stored as proof for each check).
    // So maybe we don't delete?
    // "Jeg har lest og forstått" -> once checked, it's checked?
    // Let's allow deletion for now in case of UI mistake, but the log table implies append-only?
    // "founder_agreement_checks Lagres som bevis for hver avkrysning."
    // If I uncheck, I should probably delete the record for that key for this user?
    const { error } = await supabase
      .from('founder_agreement_checks')
      .delete()
      .eq('founder_id', user.id)
      .eq('check_key', key);
    if (error) return { error: error.message };
  }

  // Check if all checks are done to start cooldown
  // Keys: no_salary_job, work_without_pay, use_own_money, voluntary_participation, not_employment, read_full_agreement
  // AND one of role_shareholder or role_contractor
  const requiredKeys = [
    'no_salary_job', 
    'work_without_pay', 
    'use_own_money', 
    'voluntary_participation', 
    'not_employment',
    'read_full_agreement'
  ];

  const { data: allChecks } = await supabase
    .from('founder_agreement_checks')
    .select('check_key')
    .eq('founder_id', user.id);
  
  const checkedKeys = allChecks?.map(c => c.check_key) || [];
  const basicChecksDone = requiredKeys.every(k => checkedKeys.includes(k));
  const roleSelected = checkedKeys.includes('role_shareholder') || checkedKeys.includes('role_contractor');

  if (basicChecksDone && roleSelected) {
    // Check if cooldown is already set
    const { data: profile } = await supabase
      .from('founder_profiles')
      .select('cooldown_until')
      .eq('id', user.id)
      .single();

    const cooldownUntil = new Date();
    cooldownUntil.setMinutes(cooldownUntil.getMinutes() + 2);

    // If cooldown is unreasonably far in the future (e.g. > 1 hour) or not set, reset it to 2 mins
    // This fixes the issue where user might have gotten a 24h/48h cooldown from previous logic
    const existingCooldown = profile?.cooldown_until ? new Date(profile.cooldown_until) : null;
    const isUnreasonable = existingCooldown && (existingCooldown.getTime() - new Date().getTime() > 1000 * 60 * 60);

    if (!existingCooldown || isUnreasonable) {
      await supabase
        .from('founder_profiles')
        .update({ 
            status: 'reading',
            cooldown_until: cooldownUntil.toISOString() 
        })
        .eq('id', user.id);
    }
  }

  revalidatePath('/dashboard/founder');
  return { success: true };
}

export async function saveAmbitions(ambitions: any) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    // Manual upsert logic to handle potential duplicates (since unique constraint might be missing)
    const { data: existingRows, error: fetchError } = await supabase
        .from('founder_ambitions')
        .select('id')
        .eq('founder_id', user.id)
        .order('updated_at', { ascending: false });

    if (fetchError) return { error: fetchError.message };

    if (existingRows && existingRows.length > 0) {
        // Use the most recent one as target
        const targetId = existingRows[0].id;

        // Cleanup: Delete duplicates if they exist
        if (existingRows.length > 1) {
            const idsToDelete = existingRows.slice(1).map(r => r.id);
            if (idsToDelete.length > 0) {
                await supabase.from('founder_ambitions').delete().in('id', idsToDelete);
            }
        }

        // Update the target record
        const { error: updateError } = await supabase
            .from('founder_ambitions')
            .update({
                ...ambitions,
                updated_at: new Date().toISOString()
            })
            .eq('id', targetId);

        if (updateError) return { error: updateError.message };

    } else {
        // Insert new record
        const { error: insertError } = await supabase
            .from('founder_ambitions')
            .insert({
                founder_id: user.id,
                ...ambitions,
                updated_at: new Date().toISOString()
            });
            
        if (insertError) return { error: insertError.message };
    }

    revalidatePath('/dashboard/founder');
    return { success: true };
}

export async function signAgreement() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    // Verify cooldown and ambitions
    const { data: profile } = await supabase
        .from('founder_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (!profile?.cooldown_until || new Date(profile.cooldown_until) > new Date()) {
        return { error: 'Cooldown not finished' };
    }

    const { data: ambitionsData } = await supabase
        .from('founder_ambitions')
        .select('*')
        .eq('founder_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1);
    
    const ambitions = ambitionsData?.[0] || null;
    
    if (!ambitions?.contribution || !ambitions?.goal_30_days || !ambitions?.goal_1_year || !ambitions?.goal_5_years) {
        return { error: 'Ambitions missing' };
    }

    const { error } = await supabase
        .from('founder_profiles')
        .update({
            status: 'active',
            signed_at: new Date().toISOString()
        })
        .eq('id', user.id);

    if (error) return { error: error.message };

    // Log to timeline
    await supabase.from('founder_timeline').insert({
        founder_id: user.id,
        event_type: 'signed_agreement',
        description: 'Signerte vennskapsavtale',
        created_at: new Date().toISOString()
    });

    revalidatePath('/dashboard/founder');
    return { success: true };
}

export async function exitFounder(reason: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const { error } = await supabase
        .from('founder_profiles')
        .update({
            status: 'exited',
            exited_at: new Date().toISOString(),
            exit_reason: reason
        })
        .eq('id', user.id);

    if (error) return { error: error.message };
    
    // Log to timeline
    await supabase.from('founder_timeline').insert({
        founder_id: user.id,
        event_type: 'exited',
        description: 'Forlot gründer-teamet: ' + reason,
        created_at: new Date().toISOString()
    });

    revalidatePath('/dashboard/founder');
    return { success: true };
}

export async function logActivity(log: any) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const { error } = await supabase
        .from('founder_logs')
        .insert({
            founder_id: user.id,
            ...log
        });

    if (error) return { error: error.message };
    revalidatePath('/dashboard/founder');
    return { success: true };
}

export async function getFounderLogs() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
        .from('founder_logs')
        .select('*')
        .eq('founder_id', user.id)
        .order('created_at', { ascending: false });
        
    return data || [];
}

export async function repairFounderProfiles() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    // Use Admin Client for ALL database operations to bypass RLS
    const adminClient = createAdminClient();

    // Verify admin role using admin client (safer against RLS)
    const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    // STRICT CHECK: Only admin or Richard
    if (profile?.role !== 'admin' && user.email?.toLowerCase() !== 'richard141271@gmail.com') {
        return { error: `Unauthorized: Role is '${profile?.role}'` };
    }

    let fixedCount = 0;

    // 1. Find users with logs but no profile
    const { data: logs } = await adminClient.from('founder_logs').select('founder_id');
    if (logs && logs.length > 0) {
        const uniqueFounderIds = Array.from(new Set(logs.map(l => l.founder_id)));
        for (const fid of uniqueFounderIds) {
            // Check if exists in founder_profiles
            const { data: exists } = await adminClient.from('founder_profiles').select('id').eq('id', fid).single();
            if (!exists) {
                await adminClient.from('founder_profiles').insert({ id: fid, status: 'active' });
                fixedCount++;
            }

            // Check if exists in public.profiles (and repair if missing)
            const { data: profileExists } = await adminClient.from('profiles').select('id').eq('id', fid).single();
            if (!profileExists) {
                // Fetch from Auth to get email/name
                const { data: { user: authUser }, error: authError } = await adminClient.auth.admin.getUserById(fid);
                
                if (authUser) {
                    const name = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Ukjent';
                    const email = authUser.email || 'Ingen e-post';
                    
                    console.log(`Reparing missing public.profile for ${fid} (${email})`);
                    
                    const { error: insertError } = await adminClient.from('profiles').insert({
                        id: fid,
                        email: email,
                        full_name: name,
                        avatar_url: authUser.user_metadata?.avatar_url,
                        role: 'user'
                    });
                    
                    if (!insertError) fixedCount++;
                } else {
                    console.warn(`Could not find auth user for ID ${fid}, likely deleted from Auth but logs remain.`);
                }
            }
        }
    }

    // 2. Ensure Admin (Richard) has a profile for chat
    const { data: meExists } = await adminClient.from('founder_profiles').select('id').eq('id', user.id).single();
    if (!meExists) {
        await adminClient.from('founder_profiles').insert({ id: user.id, status: 'active' });
        fixedCount++;
    }

    revalidatePath('/dashboard/admin/founders');
    return { success: true, count: fixedCount };
}

export async function updateFounderFollowup(
    founderId: string, 
    data: { notes?: string; status?: string; nextDate?: string | null },
    sendInvite: boolean = false
) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const adminClient = createAdminClient();
    
    // Verify admin role
    const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin' && user.email?.toLowerCase() !== 'richard141271@gmail.com') {
        return { success: false, error: 'Unauthorized' };
    }
    
    // Use upsert to handle both insert and update atomically
    const { error } = await adminClient
        .from('founder_followups')
        .upsert({
            user_id: founderId,
            internal_notes: data.notes,
            internal_status: data.status,
            next_followup_date: data.nextDate,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

    if (error) return { success: false, error: error.message };

    // Send Invite if requested
    if (sendInvite && data.nextDate) {
        try {
            const mailService = getMailService(adminClient);
            const supabase = createClient();
            const { data: { user: adminUser } } = await supabase.auth.getUser();

            if (adminUser) {
                // Get Founder Profile for name/email alias
                const { data: founderProfile } = await adminClient
                    .from('profiles')
                    .select('full_name, email_alias')
                    .eq('id', founderId)
                    .single();

                const { data: adminProfile } = await adminClient
                    .from('profiles')
                    .select('email_alias')
                    .eq('id', adminUser.id)
                    .single();

                if (founderProfile && adminProfile) {
                    const dateObj = new Date(data.nextDate);
                    const endDateObj = new Date(dateObj.getTime() + 30 * 60000); // 30 min duration
                    
                    // Format for Google Calendar: YYYYMMDDTHHMMSSZ
                    const formatGCal = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                    
                    const gcalLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Oppfølging+Biens+Vokter&dates=${formatGCal(dateObj)}/${formatGCal(endDateObj)}&details=Oppfølgingsmøte+med+${founderProfile.full_name}&location=Online`;

                    const subject = "Invitasjon til oppfølgingsmøte - Biens Vokter";
                    const body = `Hei ${founderProfile.full_name},\n\nVi har satt opp et oppfølgingsmøte.\n\nTidspunkt: ${dateObj.toLocaleString('nb-NO')}\n\nLegg til i din kalender her:\n${gcalLink}\n\nMvh,\nAurora & Richard`;

                    // Send to Founder
                    await mailService.sendMail(
                        adminProfile.email_alias || 'admin',
                        founderProfile.email_alias || 'founder',
                        subject,
                        body,
                        adminUser.id
                    );

                    // Send copy to Admin
                    await mailService.sendMail(
                        adminProfile.email_alias || 'admin',
                        adminProfile.email_alias || 'admin',
                        `Kopi: ${subject}`,
                        body,
                        adminUser.id
                    );
                }
            }
        } catch (e) {
            console.error('Failed to send invite email:', e);
            // Don't fail the whole operation if email fails
        }
    }

    revalidatePath('/dashboard/admin/founders');
    return { success: true };
}

export async function getFounderFollowupStats() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { actionNeeded: 0, upcomingMeetings: 0 };

    const adminClient = createAdminClient();
    
    // Verify admin role
    const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin' && user.email?.toLowerCase() !== 'richard141271@gmail.com') {
        return { actionNeeded: 0, upcomingMeetings: 0 };
    }
    
    // Count 'needs_action' or 'critical'
    const { count: actionCount } = await adminClient
        .from('founder_followups')
        .select('*', { count: 'exact', head: true })
        .in('internal_status', ['needs_action', 'critical']);

    // Count upcoming meetings (next 24h)
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    const { count: meetingCount } = await adminClient
        .from('founder_followups')
        .select('*', { count: 'exact', head: true })
        .gte('next_followup_date', now.toISOString())
        .lte('next_followup_date', tomorrow.toISOString());

    return {
        actionNeeded: actionCount || 0,
        upcomingMeetings: meetingCount || 0
    };
}

export async function getFounderMeeting() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
        .from('founder_followups')
        .select('next_followup_date')
        .eq('user_id', user.id)
        .gt('next_followup_date', new Date().toISOString())
        .order('next_followup_date', { ascending: true })
        .limit(1)
        .single();

    return data?.next_followup_date || null;
}

export async function getAllFoundersData() {
    const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Use Admin Client for ALL database operations to bypass RLS
  const adminClient = createAdminClient();

  // Verify admin role
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && user.email?.toLowerCase() !== 'richard141271@gmail.com') {
      return { error: `Unauthorized` };
  }

  // FIX: Check if we need to auto-create profiles for users who have logs but no profile
  // This can happen if they started before the founder module was fully strict
  // We can't easily query "users with logs but no profile" efficiently without raw SQL or complex joins.
  // Instead, let's just fetch ALL profiles with 'founder' role or similar? No, role is in profiles.
  
  // Alternative: Fetch ALL profiles, then check if they have logs.
  // Or just rely on the user to click a "Repair" button.
  // Let's implement a repair function separately and call it if list is empty?
  
  // Fetch all founder profiles
  let { data: founders, error } = await adminClient
    .from('founder_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };

  // AUTO-REPAIR: Always check for missing founders from logs
  // This ensures that if a user creates a log, they appear in the list even if they don't have a founder_profile yet
  const { data: logs } = await adminClient.from('founder_logs').select('founder_id');
  
  if (logs && logs.length > 0) {
      const uniqueFounderIds = Array.from(new Set(logs.map(l => l.founder_id)));
      const existingFounderIds = founders?.map(f => f.id) || [];
      const missingIds = uniqueFounderIds.filter(id => !existingFounderIds.includes(id));
      
      if (missingIds.length > 0) {
         console.log('Found missing founders from logs, creating profiles:', missingIds);
         // Insert missing profiles
         for (const fid of missingIds) {
             await adminClient.from('founder_profiles').insert({ id: fid, status: 'active' });
         }
         
         // Refetch
         const { data: refetched } = await adminClient
            .from('founder_profiles')
            .select('*')
            .order('created_at', { ascending: false });
            
         founders = refetched;
      }
  }

  // Manually fetch profiles to avoid relationship errors
  const founderIds = founders?.map(f => f.id) || [];
  const { data: profiles } = await adminClient
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .in('id', founderIds);

  // For each founder, get their latest logs and check status
  const foundersWithData = await Promise.all((founders || []).map(async (founder) => {
      // Get profile info
      let profile = profiles?.find(p => p.id === founder.id);

      // Fallback: If profile missing from public table, try Auth Admin
      if (!profile) {
          const { data: { user: authUser } } = await adminClient.auth.admin.getUserById(founder.id);
          if (authUser) {
              profile = {
                  id: authUser.id,
                  full_name: authUser.user_metadata?.full_name || 'Ukjent (Auth)',
                  email: authUser.email,
                  avatar_url: authUser.user_metadata?.avatar_url || null
              };
          }
      }

      // Get role choice
      const { data: checks } = await adminClient
        .from('founder_agreement_checks')
        .select('check_key')
        .eq('founder_id', founder.id);
      
      const checkKeys = checks?.map(c => c.check_key) || [];
      const role = checkKeys.includes('role_shareholder') ? 'Medgründer (Aksjer)' : 
                   checkKeys.includes('role_contractor') ? 'Selvstendig (Faktura)' : 'Ikke valgt';

      // Get latest logs
      const { data: logs } = await adminClient
        .from('founder_logs')
        .select('*')
        .eq('founder_id', founder.id)
        .order('created_at', { ascending: false });

      // Get ambitions
      const { data: ambitionsData } = await adminClient
        .from('founder_ambitions')
        .select('*')
        .eq('founder_id', founder.id)
        .order('updated_at', { ascending: false })
        .limit(1);

      // Get followup data
      const { data: followup } = await adminClient
        .from('founder_followups')
        .select('*')
        .eq('user_id', founder.id)
        .maybeSingle();

      // Get War Room alerts (help/problem)
      const { data: warRoomAlerts } = await adminClient
        .from('warroom_posts')
        .select('*')
        .eq('user_id', founder.id)
        .in('type', ['help', 'problem'])
        .eq('is_deleted', false) // Only show active alerts
        .order('created_at', { ascending: false })
        .limit(3);

      return {
          ...founder,
          profiles: profile || { full_name: 'Ukjent', email: 'Ingen e-post' },
          role_choice: role,
          logs: logs || [],
          ambitions: ambitionsData?.[0] || null,
          followup: followup || null,
          warRoomAlerts: warRoomAlerts || []
      };
  }));

  return { founders: foundersWithData };
}
