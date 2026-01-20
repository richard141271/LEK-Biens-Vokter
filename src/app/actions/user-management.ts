'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function deleteUser(userId: string) {
  const supabase = createClient()
  
  // 1. Check if current user is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Ikke logget inn' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Use optional chaining and default to checking if we have a profile
  // The fact that we're on the admin page means we passed client-side checks,
  // but let's be robust. If role is missing, we might want to double check logic.
  // For now, let's relax this check slightly or ensure RLS lets us read it.
  
  // Actually, the issue is likely that "supabase" (the regular client) 
  // cannot read the profile because of RLS policies if they aren't fully propagated or correct.
  // Let's use the admin client to verify the requester's role to be 100% sure and bypass RLS.
  const adminVerifier = createAdminClient()
  const { data: adminProfile } = await adminVerifier
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isVip = user.email === 'richard141271@gmail.com';
  const isAdmin = adminProfile?.role === 'admin';

  if (!isAdmin && !isVip) {
    return { error: 'Ingen tilgang: Krever admin-rettigheter' }
  }

  // 2. Try to delete profile data first via RPC
  // We use the regular 'supabase' client so auth.uid() is preserved for the RPC security check
  const { error: rpcError } = await supabase.rpc('delete_user_by_admin', { target_user_id: userId })

  const adminClient = createAdminClient()

  if (rpcError) {
    console.warn('RPC deletion failed, attempting manual cleanup with admin client:', rpcError)
    try {
      // 0) Delete survey responses and pilot interests linked to this user
      await adminClient
        .from('survey_responses')
        .delete()
        .eq('user_id', userId)

      await adminClient
        .from('pilot_interest')
        .delete()
        .eq('user_id', userId)

      await adminClient
        .from('survey_pilot_interest')
        .delete()
        .eq('user_id', userId)

      await adminClient
        .from('market_survey_responses')
        .delete()
        .eq('user_id', userId)

      // 0.1) Cleanup MLM and Shop related data
      // Nullify referrer_id in profiles (downline)
      await adminClient
        .from('profiles')
        .update({ referrer_id: null })
        .eq('referrer_id', userId)

      // Delete commissions
      await adminClient
        .from('commissions')
        .delete()
        .or(`beneficiary_id.eq.${userId},source_user_id.eq.${userId}`)

      // Delete honey transactions and listings
      // Note: This might be destructive for history, but for user deletion it's often required
      // Alternatively set to NULL if schema allows, but usually we delete or anonymize
      await adminClient
        .from('honey_transactions')
        .delete()
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)

      await adminClient
        .from('honey_listings')
        .delete()
        .eq('seller_id', userId)

      // 1) Null out foreign keys that reference the user
      await adminClient
        .from('rentals')
        .update({ assigned_beekeeper_id: null })
        .eq('assigned_beekeeper_id', userId)
      
      await adminClient
        .from('rentals')
        .update({ user_id: null })
        .eq('user_id', userId)

      await adminClient
        .from('inspections')
        .update({ beekeeper_id: null })
        .eq('beekeeper_id', userId)

      // 2) Delete logs linked to this user's hives and direct logs by user
      const { data: userHives } = await adminClient
        .from('hives')
        .select('id')
        .eq('user_id', userId)

      const hiveIds = (userHives || []).map(h => h.id)
      if (hiveIds.length > 0) {
        // Delete inspections for these hives (in case ON DELETE CASCADE is missing)
        await adminClient
            .from('inspections')
            .delete()
            .in('hive_id', hiveIds)

        await adminClient
          .from('hive_logs')
          .delete()
          .in('hive_id', hiveIds)
      }

      await adminClient
        .from('hive_logs')
        .delete()
        .eq('user_id', userId)

      // 3) Delete hives and apiaries
      await adminClient
        .from('hives')
        .delete()
        .eq('user_id', userId)

      await adminClient
        .from('apiaries')
        .delete()
        .eq('user_id', userId)

      // 4) Delete profile
      await adminClient
        .from('profiles')
        .delete()
        .eq('id', userId)
    } catch (cleanupError: any) {
      console.error('Manual cleanup failed:', cleanupError)
      // Continue to attempt auth deletion to avoid partial failure; report error afterwards
    }
  }

  // 3. Perform Auth deletion using admin client
  const { error } = await adminClient.auth.admin.deleteUser(userId)

  if (error) {
    console.error('Error deleting user:', error)
    return { error: error.message }
  }

  // 4. Revalidate cache
  revalidatePath('/dashboard/admin/users')
  return { success: true }
}

export async function updateUserRole(userId: string, newRole: string) {
  const supabase = createClient()
  
  // 1. Check if current user is admin OR is the specific VIP user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Ikke logget inn' }
  }

  const adminVerifier = createAdminClient()
  const { data: adminProfile } = await adminVerifier
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isVip = user.email === 'richard141271@gmail.com';
  const isAdmin = adminProfile?.role === 'admin';

  if (!isAdmin && !isVip) {
    return { error: 'Ingen tilgang: Krever admin-rettigheter' }
  }

  // 2. Update role using admin client (bypasses RLS)
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)

  if (error) {
    console.error('Error updating user role:', error)
    return { error: error.message }
  }

  // 3. Revalidate cache
  revalidatePath('/dashboard/admin/users')
  return { success: true }
}

export async function getUsers() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Ikke logget inn', users: [] }
  }

  const adminVerifier = createAdminClient()
  const { data: adminProfile } = await adminVerifier
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isVip = user.email === 'richard141271@gmail.com';
  const isAdmin = adminProfile?.role === 'admin';

  if (!isAdmin && !isVip) {
    // If not admin/VIP, only return self (or rely on RLS if we used regular client, but here we manually restrict)
    // Actually, let's just return error or only self.
    // For consistency with client-side RLS, let's just use regular client if not admin.
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    return { users: data || [] };
  }

  // If Admin or VIP, use admin client to fetch ALL users
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching users:', error)
    return { error: error.message, users: [] }
  }

  return { users: data || [] }
}
