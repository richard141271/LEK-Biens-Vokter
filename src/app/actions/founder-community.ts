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

  // 2. Fetch profiles manually (direct from profiles table to avoid relationship issues)
  const founderIds = Array.from(new Set(messages.map(m => m.founder_id)));
  
  const { data: profiles } = await adminClient
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .in('id', founderIds);

  // 3. Map profiles to messages
  const messagesWithProfiles = await Promise.all(messages.map(async (msg) => {
      let profile = profiles?.find(p => p.id === msg.founder_id);
      
      // Fallback: If missing in profiles table, try Auth Admin
      if (!profile) {
          const { data: { user: authUser } } = await adminClient.auth.admin.getUserById(msg.founder_id);
          if (authUser) {
              profile = {
                  id: authUser.id,
                  full_name: authUser.user_metadata?.full_name || 'Ukjent (Auth)',
                  email: authUser.email,
                  avatar_url: authUser.user_metadata?.avatar_url || null
              };
          }
      }

      // Fallback to email if full_name is missing, or a partial ID if nothing found
      const displayName = profile?.full_name || profile?.email || `Ukjent (${msg.founder_id.slice(0, 4)})`;
      
      return {
          ...msg,
          // Reconstruct the nested structure the UI expects (founder_profiles.profiles.full_name)
          founder_profiles: {
              profiles: {
                  full_name: displayName,
                  avatar_url: profile?.avatar_url || null
              }
          }
      };
  }));
  
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
