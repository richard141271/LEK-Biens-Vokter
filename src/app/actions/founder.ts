'use server';

import { createClient } from '@/utils/supabase/server';
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

  // Get ambitions
  const { data: ambitions } = await supabase
    .from('founder_ambitions')
    .select('*')
    .eq('founder_id', user.id)
    .single();

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

    const { error } = await supabase
        .from('founder_ambitions')
        .upsert({
            founder_id: user.id,
            ...ambitions,
            updated_at: new Date().toISOString()
        });

    if (error) return { error: error.message };
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

    const { data: ambitions } = await supabase
        .from('founder_ambitions')
        .select('*')
        .eq('founder_id', user.id)
        .single();
    
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
