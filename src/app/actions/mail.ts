'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { getMailService } from '@/services/mail';

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

  // Use MailService instead of direct DB access
  const mailService = getMailService();
  return await mailService.getInbox(profile.email_alias);
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

  // Use MailService instead of direct DB access
  const mailService = getMailService();
  const result = await mailService.sendMail(profile.email_alias, to, subject, body, user.id);

  if (result.error) return { error: result.error };

  revalidatePath('/dashboard/mail');
  return { success: true };
}

export async function markAsRead(messageId: string) {
    // Use MailService instead of direct DB access
    const mailService = getMailService();
    const result = await mailService.markAsRead(messageId);
    
    if (result.error) return { error: result.error };
    
    revalidatePath('/dashboard/mail');
    return { success: true };
}
