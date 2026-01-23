'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getMyMessages() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Ikke logget inn' };

  // Get user profile to find email alias
  const { data: profile } = await supabase
    .from('profiles')
    .select('email_alias, email_enabled')
    .eq('id', user.id)
    .single();

  if (!profile?.email_enabled || !profile?.email_alias) {
    return { error: 'E-post er ikke aktivert' };
  }

  const { data: messages, error } = await supabase
    .from('mail_messages')
    .select('*')
    .eq('to_alias', profile.email_alias)
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };

  return { data: messages };
}

export async function sendMessage(to: string, subject: string, body: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Ikke logget inn' };

  // Get user profile to find email alias
  const { data: profile } = await supabase
    .from('profiles')
    .select('email_alias, email_enabled')
    .eq('id', user.id)
    .single();

  if (!profile?.email_enabled || !profile?.email_alias) {
    return { error: 'E-post er ikke aktivert' };
  }

  const { error } = await supabase
    .from('mail_messages')
    .insert({
      to_alias: to,
      from_alias: profile.email_alias,
      subject: subject,
      body: body,
      user_id: user.id
    });

  if (error) return { error: error.message };

  revalidatePath('/dashboard/mail');
  return { success: true };
}

export async function markAsRead(messageId: string) {
    const supabase = createClient();
    
    const { error } = await supabase
        .from('mail_messages')
        .update({ read: true })
        .eq('id', messageId);

    if (error) return { error: error.message };
    
    revalidatePath('/dashboard/mail');
    return { success: true };
}
