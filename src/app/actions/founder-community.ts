'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getCommunityMessages() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: messages, error } = await supabase
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

  const { error } = await supabase
    .from('founder_messages')
    .insert({
        founder_id: user.id,
        content: content.trim()
    });

  if (error) return { error: error.message };

  revalidatePath('/dashboard/founder/community');
  return { success: true };
}
