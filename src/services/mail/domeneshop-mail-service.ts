
import { MailService, MailMessage } from './types';

export class DomeneshopMailService implements MailService {
    async getInbox(emailAlias: string): Promise<{ data?: MailMessage[]; error?: string }> {
        // TODO: Implement IMAP fetching from Domeneshop
        console.warn('DomeneshopMailService.getInbox not implemented yet');
        return { data: [] };
    }

    async sendMail(fromAlias: string, toAlias: string, subject: string, body: string, userId: string): Promise<{ success?: boolean; error?: string }> {
        // TODO: Implement SMTP sending via Domeneshop
        console.warn('DomeneshopMailService.sendMail not implemented yet');
        return { success: true };
    }

    async markAsRead(messageId: string): Promise<{ success?: boolean; error?: string }> {
        // TODO: Implement IMAP mark as read
        console.warn('DomeneshopMailService.markAsRead not implemented yet');
        return { success: true };
    }
}
