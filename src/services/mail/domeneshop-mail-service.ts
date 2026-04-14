
import { MailService, MailMessage, MailFolder, MailAttachment } from './types';
import nodemailer from 'nodemailer';

export class DomeneshopMailService implements MailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        const host = process.env.DOMENESHOP_SMTP_HOST || process.env.SMTP_HOST || '';
        const portRaw = process.env.DOMENESHOP_SMTP_PORT || process.env.SMTP_PORT || '';
        const user = process.env.DOMENESHOP_SMTP_USER || process.env.SMTP_USER || '';
        const pass = process.env.DOMENESHOP_SMTP_PASS || process.env.SMTP_PASS || '';
        const secureExplicit = process.env.DOMENESHOP_SMTP_SECURE ?? process.env.SMTP_SECURE;

        const port = Number(portRaw || 587);
        const secure = typeof secureExplicit === 'string' ? secureExplicit === 'true' : port === 465;

        this.transporter = nodemailer.createTransport({
            host: host || undefined,
            port,
            secure,
            auth: user && pass ? { user, pass } : undefined,
        });
    }

    async getInbox(emailAlias: string, folder: string = 'inbox'): Promise<{ data?: MailMessage[]; error?: string }> {
        return { data: [] };
    }

    async sendMail(fromAlias: string, toAlias: string, subject: string, body: string, userId: string, attachments?: MailAttachment[]): Promise<{ success?: boolean; error?: string }> {
        const host = process.env.DOMENESHOP_SMTP_HOST || process.env.SMTP_HOST;
        const user = process.env.DOMENESHOP_SMTP_USER || process.env.SMTP_USER;
        const pass = process.env.DOMENESHOP_SMTP_PASS || process.env.SMTP_PASS;
        if (!host || !user || !pass) {
            return { success: false, error: 'E-post er ikke konfigurert (mangler SMTP-variabler)' };
        }

        try {
            const from = process.env.SMTP_FROM || fromAlias || user;
            await this.transporter.sendMail({
                from: `"${fromAlias || 'Biens Vokter'}" <${from}>`,
                to: toAlias,
                subject,
                text: body,
                html: body.replace(/\n/g, '<br>'),
                attachments: attachments?.map((att) => ({
                    filename: att.name,
                    path: att.url,
                })),
            });
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error?.message || 'Kunne ikke sende e-post' };
        }
    }

    async markAsRead(messageId: string): Promise<{ success?: boolean; error?: string }> {
        return { success: true };
    }

    async deleteMessage(messageId: string): Promise<{ success?: boolean; error?: string }> {
        return { success: true };
    }

    // Folder Management
    async getFolders(userId: string): Promise<{ data?: MailFolder[]; error?: string }> {
        return { data: [] };
    }

    async createFolder(userId: string, name: string): Promise<{ data?: MailFolder; error?: string }> {
        return { error: 'Not implemented' };
    }

    async deleteFolder(userId: string, folderId: string): Promise<{ success?: boolean; error?: string }> {
        return { success: false, error: 'Not implemented' };
    }

    // Signature
    async getSignature(userId: string): Promise<{ data?: string; error?: string }> {
        return { data: '' };
    }

    async updateSignature(userId: string, signature: string): Promise<{ success?: boolean; error?: string }> {
        return { success: false, error: 'Not implemented' };
    }
}
