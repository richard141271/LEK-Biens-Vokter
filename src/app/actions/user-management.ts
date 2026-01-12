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

  if (!adminProfile || adminProfile.role !== 'admin') {
    return { error: 'Ingen tilgang: Krever admin-rettigheter' }
  }

  // 2. Perform deletion using admin client
  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.deleteUser(userId)

  if (error) {
    console.error('Error deleting user:', error)
    return { error: error.message }
  }

  // 3. Revalidate cache
  revalidatePath('/dashboard/admin/users')
  return { success: true }
}
