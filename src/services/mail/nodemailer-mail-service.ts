import { MailService, MailMessage, MailFolder, MailAttachment } from './types';
import { createClient } from '@/utils/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { MockMailService } from './mock-mail-service';

export class NodemailerMailService implements MailService {
    private transporter: nodemailer.Transporter;
    private readonly fallbackStore: MockMailService;

    constructor(client?: SupabaseClient) {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
        this.fallbackStore = new MockMailService(client || createClient());
    }

    async getInbox(emailAlias: string, folder: string = 'inbox'): Promise<{ data?: MailMessage[]; error?: string }> {
        return this.fallbackStore.getInbox(emailAlias, folder);
    }

    async sendMail(fromAlias: string, toAlias: string, subject: string, body: string, userId: string, attachments?: MailAttachment[]): Promise<{ success?: boolean; error?: string }> {
        try {
            const defaultFromAddress = 'post@leksystem.no';
            const fromAddress = process.env.SMTP_FROM || defaultFromAddress;

            if (!fromAddress) {
              return { error: 'E-post er ikke konfigurert (mangler SMTP_FROM/SMTP_USER)' };
            }
            
            await this.transporter.sendMail({
                from: `"${fromAlias || 'Biens Vokter'}" <${fromAddress}>`,
                to: toAlias,
                subject: subject,
                text: body, // Fallback
                html: body.replace(/\n/g, '<br>'), // Simple HTML conversion
                attachments: attachments?.map(att => ({
                    filename: att.name,
                    path: att.url
                }))
            });

            const stored = await this.fallbackStore.sendMail(fromAlias, toAlias, subject, body, userId, attachments);
            if (stored.error) {
                console.warn('[MailService][SMTP] E-posten ble sendt, men kunne ikke lagres internt', {
                    toAlias,
                    subject,
                    userId,
                    error: stored.error,
                });
            }

            console.log('[MailService][SMTP] E-post sendt', {
                toAlias,
                subject,
                userId,
            });
            return { success: true };
        } catch (error: any) {
            console.error('[MailService][SMTP] Utsending feilet', {
                toAlias,
                subject,
                userId,
                error: error?.message || error,
            });
            return { error: error.message };
        }
    }

    async markAsRead(messageId: string): Promise<{ success?: boolean; error?: string }> {
        return this.fallbackStore.markAsRead(messageId);
    }

    async deleteMessage(messageId: string): Promise<{ success?: boolean; error?: string }> {
        return this.fallbackStore.deleteMessage(messageId);
    }

    async getFolders(userId: string): Promise<{ data?: MailFolder[]; error?: string }> {
        return this.fallbackStore.getFolders(userId);
    }

    async createFolder(userId: string, name: string): Promise<{ data?: MailFolder; error?: string }> {
        return this.fallbackStore.createFolder(userId, name);
    }

    async deleteFolder(userId: string, folderId: string): Promise<{ success?: boolean; error?: string }> {
        return this.fallbackStore.deleteFolder(userId, folderId);
    }

    async getSignature(userId: string): Promise<{ data?: string; error?: string }> {
        return this.fallbackStore.getSignature(userId);
    }

    async updateSignature(userId: string, signature: string): Promise<{ success?: boolean; error?: string }> {
        return this.fallbackStore.updateSignature(userId, signature);
    }
}
