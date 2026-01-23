'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';
import { getMailService } from '@/services/mail';

export async function getMyMessages(folder: string = 'inbox') {
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
  const mailService = getMailService(supabase);
  return await mailService.getInbox(profile.email_alias, folder);
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
  const mailService = getMailService(supabase);
  const result = await mailService.sendMail(profile.email_alias, to, subject, body, user.id);

  if (result.error) return { error: result.error };

  revalidatePath('/dashboard/mail');
  return { success: true };
}

export async function markAsRead(messageId: string) {
    const supabase = createClient();
    // Use MailService instead of direct DB access
    const mailService = getMailService(supabase);
    const result = await mailService.markAsRead(messageId);
    
    if (result.error) return { error: result.error };
    
    revalidatePath('/dashboard/mail');
    return { success: true };
}

// Admin / Advanced Features

// Helper to check admin role securely bypassing RLS
async function getRequesterRole(userId: string) {
    const adminClient = createAdminClient();
    const { data } = await adminClient.from('profiles').select('role').eq('id', userId).single();
    return data?.role;
}

function isAuthorizedAdmin(email: string | undefined, role: string | undefined) {
    const isVip = email === 'richard141271@gmail.com';
    return role === 'admin' || role === 'superadmin' || isVip;
}

export async function getAdminUserProfile(userId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Ikke logget inn' };

    const role = await getRequesterRole(user.id);
    if (!isAuthorizedAdmin(user.email, role)) {
        return { error: 'Ingen tilgang' };
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient.from('profiles').select('*').eq('id', userId).single();
    
    if (error) return { error: error.message };
    return { data };
}

export async function getUserFolders(userId: string) {
    const supabase = createClient();
    // Check if admin or owner
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Ikke logget inn' };
    
    const role = await getRequesterRole(user.id);
    const isAdmin = isAuthorizedAdmin(user.email, role);
    
    if (user.id !== userId && !isAdmin) {
        return { error: 'Ingen tilgang' };
    }

    const client = (isAdmin && user.id !== userId) ? createAdminClient() : supabase;
    const mailService = getMailService(client);
    return await mailService.getFolders(userId);
}

export async function createUserFolder(userId: string, name: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Ikke logget inn' };

    const role = await getRequesterRole(user.id);
    const isAdmin = isAuthorizedAdmin(user.email, role);

    if (user.id !== userId && !isAdmin) {
        return { error: 'Ingen tilgang' };
    }

    const client = (isAdmin && user.id !== userId) ? createAdminClient() : supabase;
    const mailService = getMailService(client);
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

    const role = await getRequesterRole(user.id);
    const isAdmin = isAuthorizedAdmin(user.email, role);

    if (user.id !== userId && !isAdmin) {
        return { error: 'Ingen tilgang' };
    }

    const client = (isAdmin && user.id !== userId) ? createAdminClient() : supabase;
    const mailService = getMailService(client);
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

    const role = await getRequesterRole(user.id);
    const isAdmin = isAuthorizedAdmin(user.email, role);

    if (user.id !== userId && !isAdmin) {
        return { error: 'Ingen tilgang' };
    }

    const client = (isAdmin && user.id !== userId) ? createAdminClient() : supabase;
    const mailService = getMailService(client);
    return await mailService.getSignature(userId);
}

export async function updateUserSignature(userId: string, signature: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Ikke logget inn' };

    const role = await getRequesterRole(user.id);
    const isAdmin = isAuthorizedAdmin(user.email, role);

    if (user.id !== userId && !isAdmin) {
        return { error: 'Ingen tilgang' };
    }

    const client = (isAdmin && user.id !== userId) ? createAdminClient() : supabase;
    const mailService = getMailService(client);
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

    const role = await getRequesterRole(user.id);
    const isAdmin = isAuthorizedAdmin(user.email, role);

    if (!isAdmin) {
        return { error: 'Ingen tilgang' };
    }

    // Use admin client to bypass RLS when fetching target profile and messages
    const adminClient = createAdminClient();

    // Get target user's alias
    const { data: targetProfile } = await adminClient
        .from('profiles')
        .select('email_alias')
        .eq('id', userId)
        .single();
    
    if (!targetProfile?.email_alias) {
        return { error: 'Bruker har ingen e-postadresse' };
    }

    const mailService = getMailService(adminClient);
    return await mailService.getInbox(targetProfile.email_alias, folder);
}
