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

  const isVip = user.email === 'richard141271@gmail.com';
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

  const isVip = user.email === 'richard141271@gmail.com';
  const isAdmin = adminProfile?.role === 'admin';

  if (!isAdmin && !isVip) {
    return { error: 'Ingen tilgang: Krever admin-rettigheter' }
  }

  // 2. Hard delete user from Auth (cascades to DB usually if configured, but we will ensure DB cleanup too)
  const adminClient = createAdminClient()

  try {
      // Delete from Auth
      const { error: authError } = await adminClient.auth.admin.deleteUser(userId)
      if (authError) throw authError

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

  const isVip = user.email === 'richard141271@gmail.com';
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

  const isVip = user.email === 'richard141271@gmail.com';
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

  const isVip = user.email === 'richard141271@gmail.com';
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

  const isVip = user.email === 'richard141271@gmail.com';
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

  const isVip = user.email === 'richard141271@gmail.com';
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

  const isVip = user.email === 'richard141271@gmail.com';
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
          is_course_friend: isCourseFriend
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

  const isVip = user.email === 'richard141271@gmail.com';
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

export async function assignEmail(userId: string, alias: string) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget inn' }

  const adminVerifier = createAdminClient()
  const { data: adminProfile } = await adminVerifier
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isVip = user.email === 'richard141271@gmail.com';
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
      has_email_access: true // Auto-enable access when assigning
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

  const isVip = user.email === 'richard141271@gmail.com';
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
