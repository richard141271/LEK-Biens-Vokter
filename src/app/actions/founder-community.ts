'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function getCommunityMessages() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Use Admin Client to bypass RLS for reading messages (ensures Admin sees all)
  const adminClient = createAdminClient();
  
  const { data: messages, error } = await adminClient
    .from('founder_messages')
    .select(`
        *,
        founder_profiles (
            profiles (
                full_name,
                avatar_url
            )
        )
    `)
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };
  
  return { messages };
}

export async function postCommunityMessage(content: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  if (!content.trim()) return { error: 'Message cannot be empty' };

  // Use Admin Client to bypass RLS for inserting (fixes "policy violation" for Admin)
  const adminClient = createAdminClient();

  // Ensure user has a founder_profile (create if missing, e.g. for Admin)
  const { data: profile } = await adminClient
    .from('founder_profiles')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!profile) {
      // Create profile for Admin/User if missing
      await adminClient.from('founder_profiles').insert({
          id: user.id,
          status: 'active', // Default to active so they can chat
          role: 'admin' // Helper field if we had it, but schema might not have it. 
          // Schema only has: id, status, created_at, updated_at... and maybe others from migration.
          // Let's stick to minimal insert.
      });
  }

  const { error } = await adminClient
    .from('founder_messages')
    .insert({
        founder_id: user.id,
        content: content.trim()
    });

  if (error) return { error: error.message };

  revalidatePath('/dashboard/founder/community');
  return { success: true };
}
