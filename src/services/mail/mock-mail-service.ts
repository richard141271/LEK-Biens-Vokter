
import { createClient } from '@/utils/supabase/server';
import { MailService, MailMessage, MailFolder, MailAttachment } from './types';
import { SupabaseClient } from '@supabase/supabase-js';

export class MockMailService implements MailService {
    private supabase: SupabaseClient;

    constructor(client?: SupabaseClient) {
        this.supabase = client || createClient();
    }

    async getInbox(emailAlias: string, folder: string = 'inbox'): Promise<{ data?: MailMessage[]; error?: string }> {
        let query = this.supabase
            .from('mail_messages')
            .select('*')
            .order('created_at', { ascending: false });

        if (folder === 'sent') {
            query = query.eq('from_alias', emailAlias);
        } else {
            query = query.eq('to_alias', emailAlias);
            // Only filter by folder if column exists (it should now)
            // But for backward compatibility with existing data that might be null:
            if (folder !== 'inbox') {
                 // For custom folders, we assume we update the 'folder' column
                 query = query.eq('folder', folder);
            } else {
                // For inbox, we accept 'inbox' or null (legacy)
                // Actually, let's just not filter by folder for inbox yet to show everything received
                // UNLESS we explicitly moved it.
                // Simplified: Show all received in Inbox for now unless we implement "move".
                // TODO: Implement folder filtering once 'folder' column is populated
            }
        }

        const { data: messages, error } = await query;

        if (error) return { error: error.message };

        return { data: messages as MailMessage[] };
    }

    async sendMail(fromAlias: string, toAlias: string, subject: string, body: string, userId: string, attachments?: MailAttachment[]): Promise<{ success?: boolean; error?: string }> {
        const { error } = await this.supabase
            .from('mail_messages')
            .insert({
                to_alias: toAlias,
                from_alias: fromAlias,
                subject: subject,
                body: body,
                user_id: userId,
                folder: 'inbox', // Default for recipient
                attachments: attachments || []
            });

        if (error) return { error: error.message };
        return { success: true };
    }

    async markAsRead(messageId: string): Promise<{ success?: boolean; error?: string }> {
        const { error } = await this.supabase
            .from('mail_messages')
            .update({ read: true })
            .eq('id', messageId);

        if (error) return { error: error.message };
        return { success: true };
    }

    async deleteMessage(messageId: string): Promise<{ success?: boolean; error?: string }> {
        const { error } = await this.supabase
            .from('mail_messages')
            .delete()
            .eq('id', messageId);

        if (error) return { error: error.message };
        return { success: true };
    }

    // Folder Management
    async getFolders(userId: string): Promise<{ data?: MailFolder[]; error?: string }> {
        const { data, error } = await this.supabase
            .from('mail_folders')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error) return { error: error.message };
        return { data: data as MailFolder[] };
    }

    async createFolder(userId: string, name: string): Promise<{ data?: MailFolder; error?: string }> {
        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        
        const { data, error } = await this.supabase
            .from('mail_folders')
            .insert({
                user_id: userId,
                name,
                slug,
                type: 'custom'
            })
            .select()
            .single();

        if (error) return { error: error.message };
        return { data: data as MailFolder };
    }

    async deleteFolder(userId: string, folderId: string): Promise<{ success?: boolean; error?: string }> {
        const { error } = await this.supabase
            .from('mail_folders')
            .delete()
            .eq('id', folderId)
            .eq('user_id', userId); // Extra safety

        if (error) return { error: error.message };
        return { success: true };
    }

    // Signature
    async getSignature(userId: string): Promise<{ data?: string; error?: string }> {
        const { data, error } = await this.supabase
            .from('profiles')
            .select('email_signature')
            .eq('id', userId)
            .single();

        if (error) return { error: error.message };
        return { data: data.email_signature };
    }

    async updateSignature(userId: string, signature: string): Promise<{ success?: boolean; error?: string }> {
        const { error } = await this.supabase
            .from('profiles')
            .update({ email_signature: signature })
            .eq('id', userId);

        if (error) return { error: error.message };
        return { success: true };
    }
}
