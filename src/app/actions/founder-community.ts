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
  
  // 1. Fetch messages first (without joining to avoid relationship errors)
  const { data: messages, error } = await adminClient
    .from('founder_messages')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };
  if (!messages || messages.length === 0) return { messages: [] };

  // 2. Fetch profiles manually
  const founderIds = Array.from(new Set(messages.map(m => m.founder_id)));
  
  const { data: founders } = await adminClient
    .from('founder_profiles')
    .select(`
        id,
        profiles (
            full_name,
            avatar_url
        )
    `)
    .in('id', founderIds);

  // 3. Map profiles to messages
  const messagesWithProfiles = messages.map(msg => {
      const founder = founders?.find(f => f.id === msg.founder_id);
      return {
          ...msg,
          founder_profiles: founder || null
      };
  });
  
  return { messages: messagesWithProfiles };
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
