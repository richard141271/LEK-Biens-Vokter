
import { createClient } from '@/utils/supabase/server';
import { MailService, MailMessage } from './types';

export class MockMailService implements MailService {
    async getInbox(emailAlias: string): Promise<{ data?: MailMessage[]; error?: string }> {
        const supabase = createClient();
        
        const { data: messages, error } = await supabase
            .from('mail_messages')
            .select('*')
            .eq('to_alias', emailAlias)
            .order('created_at', { ascending: false });

        if (error) return { error: error.message };

        return { data: messages as MailMessage[] };
    }

    async sendMail(fromAlias: string, toAlias: string, subject: string, body: string, userId: string): Promise<{ success?: boolean; error?: string }> {
        const supabase = createClient();

        const { error } = await supabase
            .from('mail_messages')
            .insert({
                to_alias: toAlias,
                from_alias: fromAlias,
                subject: subject,
                body: body,
                user_id: userId
            });

        if (error) return { error: error.message };
        return { success: true };
    }

    async markAsRead(messageId: string): Promise<{ success?: boolean; error?: string }> {
        const supabase = createClient();

        const { error } = await supabase
            .from('mail_messages')
            .update({ read: true })
            .eq('id', messageId);

        if (error) return { error: error.message };
        return { success: true };
    }
}
