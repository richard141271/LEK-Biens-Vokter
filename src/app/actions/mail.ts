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

// Admin / Advanced Features

export async function getUserFolders(userId: string) {
    const supabase = createClient();
    // Check if admin or owner
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Ikke logget inn' };
    
    // Simple admin check (should be more robust in real app)
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';
    
    if (user.id !== userId && !isAdmin) {
        return { error: 'Ingen tilgang' };
    }

    const mailService = getMailService();
    return await mailService.getFolders(userId);
}

export async function createUserFolder(userId: string, name: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Ikke logget inn' };

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';

    if (user.id !== userId && !isAdmin) {
        return { error: 'Ingen tilgang' };
    }

    const mailService = getMailService();
    const result = await mailService.createFolder(userId, name);
    
    if (result.data) {
        revalidatePath('/dashboard/mail');
        revalidatePath(`/dashboard/admin/email/${userId}`);
    }
    return result;
}

export async function deleteUserFolder(userId: string, folderId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Ikke logget inn' };

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';

    if (user.id !== userId && !isAdmin) {
        return { error: 'Ingen tilgang' };
    }

    const mailService = getMailService();
    const result = await mailService.deleteFolder(userId, folderId);

    if (result.success) {
        revalidatePath('/dashboard/mail');
        revalidatePath(`/dashboard/admin/email/${userId}`);
    }
    return result;
}

export async function getUserSignature(userId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Ikke logget inn' };

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';

    if (user.id !== userId && !isAdmin) {
        return { error: 'Ingen tilgang' };
    }

    const mailService = getMailService();
    return await mailService.getSignature(userId);
}

export async function updateUserSignature(userId: string, signature: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Ikke logget inn' };

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';

    if (user.id !== userId && !isAdmin) {
        return { error: 'Ingen tilgang' };
    }

    const mailService = getMailService();
    const result = await mailService.updateSignature(userId, signature);
    
    if (result.success) {
        revalidatePath('/dashboard/mail');
        revalidatePath(`/dashboard/admin/email/${userId}`);
    }
    return result;
}

export async function getAdminUserInbox(userId: string, folder: string = 'inbox') {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Ikke logget inn' };

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';

    if (!isAdmin) {
        return { error: 'Ingen tilgang' };
    }

    // Get target user's alias
    const { data: targetProfile } = await supabase
        .from('profiles')
        .select('email_alias')
        .eq('id', userId)
        .single();
    
    if (!targetProfile?.email_alias) {
        return { error: 'Bruker har ingen e-postadresse' };
    }

    const mailService = getMailService();
    return await mailService.getInbox(targetProfile.email_alias, folder);
}
