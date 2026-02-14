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

  const adminVerifier = createAdminClient()
  const { data: adminProfile } = await adminVerifier
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isVip = [
    'richard141271@gmail.com', 
    'richard141271@gmail.no', 
    'lek@kias.no', 
    'jorn@kias.no'
  ].includes(user.email?.toLowerCase() || '');
  
  const isAdmin = adminProfile?.role === 'admin';

  if (!isAdmin && !isVip) {
    return { error: 'Ingen tilgang: Krever admin-rettigheter' }
  }

  // 2. Soft delete (deactivate) user instead of hard delete
  const adminClient = createAdminClient()

  // Update profile to be inactive
  const { error: profileError } = await adminClient
    .from('profiles')
    .update({ is_active: false })
    .eq('id', userId)

  if (profileError) {
    console.error('Error soft deleting user profile:', profileError)
    return { error: 'Kunne ikke deaktivere bruker: ' + profileError.message }
  }

  // 3. Block login in Auth (Ban user)
  try {
    const { error: banError } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: '876600h' // ~100 years
    })

    if (banError) {
      console.warn('Could not ban user in auth, but profile is deactivated:', banError)
    }
  } catch (e) {
    console.warn('Error attempting to ban user:', e)
  }

  // 4. Revalidate cache
  revalidatePath('/dashboard/admin/users')
  return { success: true }
}

export async function hardDeleteUser(userId: string) {
  const supabase = createClient()
  
  // 1. Check if current user is admin
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

  const isVip = [
    'richard141271@gmail.com', 
    'richard141271@gmail.no', 
    'lek@kias.no', 
    'jorn@kias.no'
  ].includes(user.email?.toLowerCase() || '');
  const isAdmin = adminProfile?.role === 'admin';

  if (!isAdmin && !isVip) {
    return { error: 'Ingen tilgang: Krever admin-rettigheter' }
  }

  // 2. Hard delete user from Auth (cascades to DB usually if configured, but we will ensure DB cleanup too)
  const adminClient = createAdminClient()

  try {
      // 2a. Manually delete related data to avoid Foreign Key constraints if CASCADE is missing
      // Order is important: Child -> Parent

      // 0. Get User's Apiaries (needed for Rental cleanup)
      const { data: userApiaries } = await adminClient
        .from('apiaries')
        .select('id')
        .eq('user_id', userId)
      
      const apiaryIds = userApiaries?.map(a => a.id) || []

      // 1. Unassign from Rentals (set assigned_beekeeper_id to null AND unlink apiaries)
      const { error: rentalError } = await adminClient
        .from('rentals')
        .update({ assigned_beekeeper_id: null })
        .eq('assigned_beekeeper_id', userId)
      
      if (rentalError) console.warn('Error unassigning rentals:', rentalError)

      if (apiaryIds.length > 0) {
        const { error: rentalApiaryError } = await adminClient
            .from('rentals')
            .update({ apiary_id: null })
            .in('apiary_id', apiaryIds)
        
        if (rentalApiaryError) console.warn('Error unlinking apiaries from rentals:', rentalApiaryError)
      }

      // 2. Delete Founder Related Data
      // founder_ambitions
      const { error: ambitionError } = await adminClient
        .from('founder_ambitions')
        .delete()
        .eq('founder_id', userId)
      if (ambitionError) console.warn('Error deleting founder ambitions:', ambitionError)

      // founder_agreement_checks
      const { error: checksError } = await adminClient
        .from('founder_agreement_checks')
        .delete()
        .eq('founder_id', userId)
      if (checksError) console.warn('Error deleting founder checks:', checksError)

      // founder_logs
      const { error: fLogsError } = await adminClient
        .from('founder_logs')
        .delete()
        .eq('founder_id', userId)
      if (fLogsError) console.warn('Error deleting founder logs:', fLogsError)

      // founder_followups
      const { error: followupsError } = await adminClient
        .from('founder_followups')
        .delete()
        .eq('user_id', userId)
      if (followupsError) console.warn('Error deleting founder followups:', followupsError)

      // warroom_posts
      const { error: warroomError } = await adminClient
        .from('warroom_posts')
        .delete()
        .eq('user_id', userId)
      if (warroomError) console.warn('Error deleting warroom posts:', warroomError)

      // admin_logs (where user is actor or target)
      const { error: adminLogsError } = await adminClient
        .from('admin_logs')
        .delete()
        .or(`user_id.eq.${userId},target_id.eq.${userId}`)
      if (adminLogsError) console.warn('Error deleting admin logs:', adminLogsError)

      // 3. Delete Hive Logs & Hives & Apiaries
      // Get user's hives to delete related logs
      const { data: userHives } = await adminClient
        .from('hives')
        .select('id')
        .eq('user_id', userId)
      
      const hiveIds = userHives?.map(h => h.id) || []

      // Delete Logs (both created by user AND attached to user's hives)
      if (hiveIds.length > 0) {
        const { error: logsError } = await adminClient
            .from('hive_logs')
            .delete()
            .or(`user_id.eq.${userId},hive_id.in.(${hiveIds.join(',')})`)
        
        if (logsError) console.warn('Error deleting user/hive logs:', logsError)
      } else {
        const { error: logsError } = await adminClient
            .from('hive_logs')
            .delete()
            .eq('user_id', userId)
        
        if (logsError) console.warn('Error deleting user logs:', logsError)
      }

      // Delete Hives
      const { error: hivesError } = await adminClient
        .from('hives')
        .delete()
        .eq('user_id', userId)

      if (hivesError) console.warn('Error deleting user hives:', hivesError)

      // Delete Apiaries
      const { error: apiariesError } = await adminClient
        .from('apiaries')
        .delete()
        .eq('user_id', userId)

      if (apiariesError) console.warn('Error deleting user apiaries:', apiariesError)

      // 5. Delete Honey Exchange & Wallet Data (New additions)
      // honey_transactions
      const { error: hTransError } = await adminClient
        .from('honey_transactions')
        .delete()
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      if (hTransError) console.warn('Error deleting honey transactions:', hTransError)

      // wallet_transactions
      const { error: walletError } = await adminClient
        .from('wallet_transactions')
        .delete()
        .eq('user_id', userId)
      if (walletError) console.warn('Error deleting wallet transactions:', walletError)

      // honey_listings
      // Note: Listings might reference themselves via original_listing_id, so we might need cascading delete or multiple passes if deep nesting.
      // But standard delete should work if no other user's listing references these.
      const { error: hListError } = await adminClient
        .from('honey_listings')
        .delete()
        .or(`seller_id.eq.${userId},keeper_id.eq.${userId}`)
      if (hListError) console.warn('Error deleting honey listings:', hListError)

      // rentals (as customer)
      const { error: rentalsCustomerError } = await adminClient
        .from('rentals')
        .delete()
        .eq('user_id', userId)
      if (rentalsCustomerError) console.warn('Error deleting rentals as customer:', rentalsCustomerError)

      // 6. Delete Franchise & Mail & Meeting & MLM & Honey Exchange & Survey Data
      // franchise_training_progress
      const { error: fTrainError } = await adminClient
        .from('franchise_training_progress')
        .delete()
        .eq('user_id', userId)
      if (fTrainError) console.warn('Error deleting franchise training:', fTrainError)

      // franchise_signatures
      const { error: fSignError } = await adminClient
        .from('franchise_signatures')
        .delete()
        .eq('user_id', userId)
      if (fSignError) console.warn('Error deleting franchise signatures:', fSignError)

      // franchise_weekly_reports (submitted_by)
      const { error: fRepError } = await adminClient
        .from('franchise_weekly_reports')
        .delete()
        .eq('submitted_by', userId)
      if (fRepError) console.warn('Error deleting franchise reports:', fRepError)

      // franchise_units (owned)
      const { error: fUnitError } = await adminClient
        .from('franchise_units')
        .delete()
        .eq('owner_id', userId)
      if (fUnitError) console.warn('Error deleting franchise units:', fUnitError)

      // mail_folders (should cascade to messages if configured, but explicit delete is safer)
      const { error: mailFolderError } = await adminClient
        .from('mail_folders')
        .delete()
        .eq('user_id', userId)
      if (mailFolderError) console.warn('Error deleting mail folders:', mailFolderError)

      // meeting_notes
      const { error: meetingError } = await adminClient
        .from('meeting_notes')
        .delete()
        .eq('user_id', userId)
      if (meetingError) console.warn('Error deleting meeting notes:', meetingError)

      // commissions
      const { error: commError } = await adminClient
        .from('commissions')
        .delete()
        .or(`beneficiary_id.eq.${userId},source_user_id.eq.${userId}`)
      if (commError) console.warn('Error deleting commissions:', commError)

      // Honey Exchange Transactions (Buyer or Seller)
      const { error: honeyTransError } = await adminClient
        .from('honey_transactions')
        .delete()
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      if (honeyTransError) console.warn('Error deleting honey transactions:', honeyTransError)

      // Honey Exchange Listings (Seller)
      const { error: honeyListError } = await adminClient
        .from('honey_listings')
        .delete()
        .eq('seller_id', userId)
      if (honeyListError) console.warn('Error deleting honey listings:', honeyListError)

      // Surveys & Pilot Interest - PRESERVE DATA (Anonymize if possible, otherwise ABORT)
      // Check for survey data first
      const { count: surveyCount } = await adminClient.from('survey_responses').select('*', { count: 'exact', head: true }).eq('user_id', userId);
      const { count: marketCount } = await adminClient.from('market_survey_responses').select('*', { count: 'exact', head: true }).eq('user_id', userId);
      const { count: pilotCount } = await adminClient.from('pilot_interest').select('*', { count: 'exact', head: true }).eq('user_id', userId);
      const { count: surveyPilotCount } = await adminClient.from('survey_pilot_interest').select('*', { count: 'exact', head: true }).eq('user_id', userId);

      const hasSurveyData = (surveyCount || 0) > 0 || (marketCount || 0) > 0 || (pilotCount || 0) > 0 || (surveyPilotCount || 0) > 0;

      if (hasSurveyData) {
          console.log(`User ${userId} has survey data. Attempting to anonymize...`);
          
          // Attempt to set user_id to NULL
          const { error: sErr } = await adminClient.from('survey_responses').update({ user_id: null }).eq('user_id', userId);
          const { error: mErr } = await adminClient.from('market_survey_responses').update({ user_id: null }).eq('user_id', userId);
          const { error: pErr } = await adminClient.from('pilot_interest').update({ user_id: null }).eq('user_id', userId);
          const { error: spErr } = await adminClient.from('survey_pilot_interest').update({ user_id: null }).eq('user_id', userId);

          // If any error occurs (likely NOT NULL constraint), we MUST ABORT to save the data
          if (sErr || mErr || pErr || spErr) {
              console.error('Failed to anonymize survey data:', sErr, mErr, pErr, spErr);
              return { error: 'Kan ikke slette bruker permanent: Brukeren har svart på spørreundersøkelser som er "hellige" og ikke kan slettes eller anonymiseres automatisk. Kontakt utvikler.' };
          }
      }

      // Unlink Rentals & Inspections & Apiaries
      const { error: rentalAssignError } = await adminClient
        .from('rentals')
        .update({ assigned_beekeeper_id: null })
        .eq('assigned_beekeeper_id', userId)
      if (rentalAssignError) console.warn('Error unlinking rental assignments:', rentalAssignError)

      const { error: rentalUserError } = await adminClient
        .from('rentals')
        .update({ user_id: null })
        .eq('user_id', userId)
      if (rentalUserError) console.warn('Error unlinking rental users:', rentalUserError)

      const { error: inspectionError } = await adminClient
        .from('inspections')
        .update({ beekeeper_id: null })
        .eq('beekeeper_id', userId)
      if (inspectionError) console.warn('Error unlinking inspections:', inspectionError)

      const { error: apiaryManagerError } = await adminClient
        .from('apiaries')
        .update({ managed_by: null })
        .eq('managed_by', userId)
      if (apiaryManagerError) console.warn('Error unlinking apiary managers:', apiaryManagerError)

      // Update profiles referrer_id (set to null)
      const { error: refError } = await adminClient
        .from('profiles')
        .update({ referrer_id: null })
        .eq('referrer_id', userId)
      if (refError) console.warn('Error updating referrers:', refError)

      // 4. Delete Storage Objects (Files)
      // Attempt to delete files owned by user in 'storage' schema
      try {
          // Try to delete using schema access if possible (requires service_role)
          const { error: storageError } = await adminClient
            .schema('storage')
            .from('objects')
            .delete()
            .eq('owner', userId)
          
          if (storageError) {
             console.warn('Error deleting storage objects (schema access):', storageError)
          } else {
             console.log('Successfully attempted storage cleanup for user:', userId)
          }
      } catch (e) {
          console.warn('Failed to cleanup storage:', e)
      }

      // Delete Founder Profile
      const { error: founderError } = await adminClient
        .from('founder_profiles')
        .delete()
        .eq('id', userId)

      if (founderError) console.warn('Error deleting founder profile:', founderError)

      // Delete Profile (if not cascaded by auth)
      const { error: profileError } = await adminClient
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (profileError) {
        console.error('Error deleting profile:', profileError)
        // If we can't delete the profile, we should stop and report it, 
        // because it likely means there's a constraint we missed.
        // Continuing to auth delete will likely fail or leave zombie data.
        return { error: 'Kunne ikke slette profil (database constraint): ' + profileError.message }
      }

      // 2b. Delete from Auth
      const { error: authError } = await adminClient.auth.admin.deleteUser(userId)
      if (authError) {
        console.error('Error deleting auth user:', authError)
        return { error: 'Kunne ikke slette bruker fra Auth: ' + authError.message }
      }

      // Note: If Postgres uses ON DELETE CASCADE on the foreign key to auth.users, 
      // the profile and related data will be gone. 
      // If not, we might need to delete from 'profiles' manually. 
      // Let's assume standard Supabase setup where profiles.id references auth.users.id with CASCADE.
      
      revalidatePath('/dashboard/admin/users')
      return { success: true }
  } catch (error: any) {
      console.error('Error hard deleting user:', error)
      return { error: 'Kunne ikke slette bruker permanent: ' + error.message }
  }
}

export async function removeEmail(userId: string) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget inn' }

  const adminVerifier = createAdminClient()
  const { data: adminProfile } = await adminVerifier
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isVip = [
    'richard141271@gmail.com', 
    'richard141271@gmail.no', 
    'lek@kias.no', 
    'jorn@kias.no'
  ].includes(user.email?.toLowerCase() || '');
  const isAdmin = adminProfile?.role === 'admin';

  if (!isAdmin && !isVip) {
    return { error: 'Ingen tilgang' }
  }

  const { error } = await adminVerifier
    .from('profiles')
    .update({ 
      email_alias: null,
      has_email_access: false
    })
    .eq('id', userId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/admin/users')
  return { success: true }
}

export async function toggleFounderStatus(userId: string, isFounder: boolean) {
  const supabase = createClient()
  
  // 1. Check permissions
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget inn' }

  const adminVerifier = createAdminClient()
  const { data: adminProfile } = await adminVerifier
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isVip = [
    'richard141271@gmail.com', 
    'richard141271@gmail.no', 
    'lek@kias.no', 
    'jorn@kias.no'
  ].includes(user.email?.toLowerCase() || '');
  const isAdmin = adminProfile?.role === 'admin';

  if (!isAdmin && !isVip) {
    return { error: 'Ingen tilgang' }
  }

  // 2. Update profile
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('profiles')
    .update({ is_founder: isFounder })
    .eq('id', userId)

  if (error) return { error: error.message }

  // 3. Initialize founder profile if setting to true and it doesn't exist
  if (isFounder) {
    const { data: existingFounder } = await adminClient
      .from('founder_profiles')
      .select('id')
      .eq('id', userId)
      .single()
      
    if (!existingFounder) {
      const { error: createError } = await adminClient
        .from('founder_profiles')
        .insert({
          id: userId,
          status: 'invited'
        })
      
      if (createError) console.error('Error creating founder profile:', createError)
    }
  }

  revalidatePath('/dashboard/admin/users')
  return { success: true }
}

export async function toggleCourseFriendStatus(userId: string, isCourseFriend: boolean) {
  const supabase = createClient()
  
  // 1. Check permissions
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget inn' }

  const adminVerifier = createAdminClient()
  const { data: adminProfile } = await adminVerifier
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isVip = [
    'richard141271@gmail.com', 
    'richard141271@gmail.no', 
    'lek@kias.no', 
    'jorn@kias.no'
  ].includes(user.email?.toLowerCase() || '');
  const isAdmin = adminProfile?.role === 'admin';

  if (!isAdmin && !isVip) {
    return { error: 'Ingen tilgang' }
  }

  // 2. Update profile
  const adminClient = createAdminClient()
  
  // Update User Metadata (Primary storage for this flag now)
  const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
    user_metadata: { is_course_friend: isCourseFriend }
  })

  if (authError) return { error: authError.message }

  // Try to update profile too (for future schema support), but ignore error if column missing
  try {
    await adminClient
      .from('profiles')
      .update({ is_course_friend: isCourseFriend })
      .eq('id', userId)
  } catch (e) {
    // Ignore error
  }

  revalidatePath('/dashboard/admin/users')
  return { success: true }
}

export async function reactivateUser(userId: string) {
  const supabase = createClient()
  
  // 1. Check permissions
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget inn' }

  const adminVerifier = createAdminClient()
  const { data: adminProfile } = await adminVerifier
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isVip = [
    'richard141271@gmail.com', 
    'richard141271@gmail.no', 
    'lek@kias.no', 
    'jorn@kias.no'
  ].includes(user.email?.toLowerCase() || '');
  const isAdmin = adminProfile?.role === 'admin';

  if (!isAdmin && !isVip) {
    return { error: 'Ingen tilgang' }
  }

  // 2. Reactivate profile
  const { error: profileError } = await adminVerifier
    .from('profiles')
    .update({ is_active: true })
    .eq('id', userId)

  if (profileError) {
    console.error('Error reactivating user profile:', profileError)
    return { error: profileError.message }
  }

  // 3. Unban user in Auth
  try {
    const { error: unbanError } = await adminVerifier.auth.admin.updateUserById(userId, {
      ban_duration: 'none'
    })

    if (unbanError) {
      console.warn('Could not unban user in auth:', unbanError)
      return { error: 'Kunne ikke oppheve utestengelse: ' + unbanError.message }
    }
  } catch (e) {
    console.warn('Error attempting to unban user:', e)
  }

  revalidatePath('/dashboard/admin/users')
  return { success: true }
}

export async function updateUserPassword(userId: string, newPassword: string) {
  const supabase = createClient()
  
  // 1. Check permissions
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget inn' }

  const adminVerifier = createAdminClient()
  const { data: adminProfile } = await adminVerifier
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isVip = [
    'richard141271@gmail.com', 
    'richard141271@gmail.no', 
    'lek@kias.no', 
    'jorn@kias.no'
  ].includes(user.email?.toLowerCase() || '');
  const isAdmin = adminProfile?.role === 'admin';

  if (!isAdmin && !isVip) {
    return { error: 'Ingen tilgang' }
  }

  // 2. Update password in Auth
  try {
    const { error } = await adminVerifier.auth.admin.updateUserById(userId, {
      password: newPassword
    })

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error updating password:', error)
    return { error: error.message }
  }
}

export async function getUsers() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget inn' }

  const adminVerifier = createAdminClient()
  const { data: adminProfile } = await adminVerifier
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isVip = [
    'richard141271@gmail.com', 
    'richard141271@gmail.no', 
    'lek@kias.no', 
    'jorn@kias.no'
  ].includes(user.email?.toLowerCase() || '');
  const isAdmin = adminProfile?.role === 'admin';

  if (!isAdmin && !isVip) {
    return { error: 'Ingen tilgang' }
  }

  const { data: profiles, error } = await adminVerifier
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }

  // Fetch auth users to get metadata (for K/V status)
  const { data: { users: authUsers }, error: authError } = await adminVerifier.auth.admin.listUsers({ perPage: 1000 })
  
  let mergedUsers = profiles;
  
  if (!authError && authUsers) {
    mergedUsers = profiles.map(p => {
      const authUser = authUsers.find(u => u.id === p.id);
      const isCourseFriendMetadata = authUser?.user_metadata?.is_course_friend;
      
      // Use metadata if present, otherwise fallback to profile (if column exists)
      // Default to false if neither exists
      const isCourseFriend = isCourseFriendMetadata !== undefined 
          ? isCourseFriendMetadata 
          : (p.is_course_friend || false);

      return {
          ...p,
          email: authUser?.email || p.email, // Ensure email is populated from Auth
          is_course_friend: isCourseFriend,
          email_enabled: p.has_email_access // Map DB column to frontend property
      };
    });
  }

  return { users: mergedUsers }
}

export async function updateUserRole(userId: string, role: string) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget inn' }

  const adminVerifier = createAdminClient()
  const { data: adminProfile } = await adminVerifier
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isVip = [
    'richard141271@gmail.com', 
    'richard141271@gmail.no', 
    'lek@kias.no', 
    'jorn@kias.no'
  ].includes(user.email?.toLowerCase() || '');
  const isAdmin = adminProfile?.role === 'admin';

  if (!isAdmin && !isVip) {
    return { error: 'Ingen tilgang' }
  }

  const { error } = await adminVerifier
    .from('profiles')
    .update({ role })
    .eq('id', userId)

  if (error) return { error: error.message }
  
  revalidatePath('/dashboard/admin/users')
  return { success: true }
}

export async function assignEmail(userId: string, alias: string, enableAccess: boolean = true) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget inn' }

  const adminVerifier = createAdminClient()
  const { data: adminProfile } = await adminVerifier
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isVip = [
    'richard141271@gmail.com', 
    'richard141271@gmail.no', 
    'lek@kias.no', 
    'jorn@kias.no'
  ].includes(user.email?.toLowerCase() || '');
  const isAdmin = adminProfile?.role === 'admin';

  if (!isAdmin && !isVip) {
    return { error: 'Ingen tilgang' }
  }

  // Check availability
  const { data: existing } = await adminVerifier
    .from('profiles')
    .select('id')
    .eq('email_alias', alias)
    .neq('id', userId) // Allow self-update if same
    .single()

  if (existing) {
    return { error: 'E-postalias allerede i bruk' }
  }

  const { error } = await adminVerifier
    .from('profiles')
    .update({ 
      email_alias: alias,
      has_email_access: enableAccess 
    })
    .eq('id', userId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/admin/users')
  return { success: true }
}

export async function toggleEmailAccess(userId: string, hasAccess: boolean) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget inn' }

  const adminVerifier = createAdminClient()
  const { data: adminProfile } = await adminVerifier
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isVip = [
    'richard141271@gmail.com', 
    'richard141271@gmail.no', 
    'lek@kias.no', 
    'jorn@kias.no'
  ].includes(user.email?.toLowerCase() || '');
  const isAdmin = adminProfile?.role === 'admin';

  if (!isAdmin && !isVip) {
    return { error: 'Ingen tilgang' }
  }

  const { error } = await adminVerifier
    .from('profiles')
    .update({ has_email_access: hasAccess })
    .eq('id', userId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/admin/users')
  return { success: true }
}
