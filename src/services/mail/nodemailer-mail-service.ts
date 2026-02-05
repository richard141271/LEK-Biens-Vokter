
import { MailService, MailMessage, MailFolder, MailAttachment } from './types';
import nodemailer from 'nodemailer';

export class NodemailerMailService implements MailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    async getInbox(emailAlias: string, folder: string = 'inbox'): Promise<{ data?: MailMessage[]; error?: string }> {
        console.warn('NodemailerMailService.getInbox not implemented (SMTP only)');
        return { data: [] };
    }

    async sendMail(fromAlias: string, toAlias: string, subject: string, body: string, userId: string, attachments?: MailAttachment[]): Promise<{ success?: boolean; error?: string }> {
        try {
            const from = process.env.SMTP_FROM || fromAlias || process.env.SMTP_USER;
            
            await this.transporter.sendMail({
                from: `"${fromAlias || 'Biens Vokter'}" <${from}>`,
                to: toAlias,
                subject: subject,
                text: body, // Fallback
                html: body.replace(/\n/g, '<br>'), // Simple HTML conversion
                attachments: attachments?.map(att => ({
                    filename: att.name,
                    path: att.url
                }))
            });
            
            console.log(`[MailService] Sent email to ${toAlias}: ${subject}`);
            return { success: true };
        } catch (error: any) {
            console.error('[MailService] Error sending email:', error);
            return { error: error.message };
        }
    }

    async markAsRead(messageId: string): Promise<{ success?: boolean; error?: string }> {
        return { success: true };
    }

    async deleteMessage(messageId: string): Promise<{ success?: boolean; error?: string }> {
        return { success: true };
    }

    async getFolders(userId: string): Promise<{ data?: MailFolder[]; error?: string }> {
        return { data: [] };
    }

    async createFolder(userId: string, name: string): Promise<{ data?: MailFolder; error?: string }> {
        return { error: 'Not implemented' };
    }

    async deleteFolder(userId: string, folderId: string): Promise<{ success?: boolean; error?: string }> {
        return { success: false, error: 'Not implemented' };
    }

    async getSignature(userId: string): Promise<{ data?: string; error?: string }> {
        return { data: '' };
    }

    async updateSignature(userId: string, signature: string): Promise<{ success?: boolean; error?: string }> {
        return { success: false, error: 'Not implemented' };
    }
}
