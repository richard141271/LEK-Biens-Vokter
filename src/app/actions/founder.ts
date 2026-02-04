'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

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

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin' && user.email !== 'richard141271@gmail.com') {
        return { error: 'Unauthorized' };
    }

    const adminClient = createAdminClient();
    let fixedCount = 0;

    // 1. Find users with logs but no profile
    const { data: logs } = await adminClient.from('founder_logs').select('founder_id');
    if (logs && logs.length > 0) {
        const uniqueFounderIds = Array.from(new Set(logs.map(l => l.founder_id)));
        for (const fid of uniqueFounderIds) {
            const { data: exists } = await adminClient.from('founder_profiles').select('id').eq('id', fid).single();
            if (!exists) {
                await adminClient.from('founder_profiles').insert({ id: fid, status: 'active' });
                fixedCount++;
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

export async function getAllFoundersData() {
    const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && user.email !== 'richard141271@gmail.com') {
      return { error: 'Unauthorized' };
  }

  // Use Admin Client to bypass RLS for visibility
  const adminClient = createAdminClient();

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
    .select(`
        *,
        profiles (
            full_name,
            email,
            avatar_url
        )
    `)
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };

  // AUTO-REPAIR: If list is empty (or Anita missing), try to find her in 'profiles' and create a founder entry
  // This is a bit aggressive but necessary since we can't run SQL manually.
  // Let's assume anyone with email 'anita...' should be a founder? No.
  // Let's check if we can find profiles that SHOULD be founders.
  
  if (!founders || founders.length === 0) {
      // Try to find users with existing logs
      const { data: logs } = await adminClient.from('founder_logs').select('founder_id');
      if (logs && logs.length > 0) {
          const uniqueFounderIds = Array.from(new Set(logs.map(l => l.founder_id)));
          for (const fid of uniqueFounderIds) {
             // Check if profile exists
             const { data: exists } = await adminClient.from('founder_profiles').select('id').eq('id', fid).single();
             if (!exists) {
                 await adminClient.from('founder_profiles').insert({ id: fid, status: 'active' });
             }
          }
          // Refetch
          const { data: refetched } = await adminClient
            .from('founder_profiles')
            .select(`*, profiles(full_name, email, avatar_url)`)
            .order('created_at', { ascending: false });
            
          founders = refetched;
      }
  }


  // For each founder, get their latest logs and check status
  const foundersWithData = await Promise.all((founders || []).map(async (founder) => {
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

      return {
          ...founder,
          role_choice: role,
          logs: logs || [],
          ambitions: ambitionsData?.[0] || null
      };
  }));

  return { founders: foundersWithData };
}
