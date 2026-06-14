import { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import { MailAttachment, MailFolder, MailMessage, MailService } from './types';
import { MockMailService } from './mock-mail-service';

type ResendAttachment = {
  filename: string;
  content: string;
  content_type?: string;
};

export class ResendMailService implements MailService {
  private readonly fallbackStore: MockMailService;

  constructor(client?: SupabaseClient) {
    this.fallbackStore = new MockMailService(client || createClient());
  }

  private getApiKey() {
    return String(process.env.RESEND_API_KEY || '').trim();
  }

  private getFromAddress() {
    return String(process.env.RESEND_FROM || process.env.SMTP_FROM || 'post@leksystem.no').trim();
  }

  private buildHtml(body: string) {
    return body.includes('<a ') || body.includes('<br') ? body.replace(/\n/g, '<br>') : body.replace(/\n/g, '<br>');
  }

  private async buildAttachments(attachments?: MailAttachment[]): Promise<ResendAttachment[]> {
    if (!attachments?.length) return [];

    const resolved = await Promise.all(
      attachments.map(async (attachment) => {
        const response = await fetch(attachment.url);
        if (!response.ok) {
          throw new Error(`Kunne ikke hente vedlegg: ${attachment.name}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        return {
          filename: attachment.name,
          content: Buffer.from(arrayBuffer).toString('base64'),
          content_type: attachment.type || undefined,
        };
      }),
    );

    return resolved;
  }

  async getInbox(emailAlias: string, folder: string = 'inbox'): Promise<{ data?: MailMessage[]; error?: string }> {
    return this.fallbackStore.getInbox(emailAlias, folder);
  }

  async sendMail(fromAlias: string, toAlias: string, subject: string, body: string, userId: string, attachments?: MailAttachment[]): Promise<{ success?: boolean; error?: string }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { error: 'E-post er ikke konfigurert (mangler RESEND_API_KEY)' };
    }

    try {
      const fromAddress = this.getFromAddress();
      const displayName = String(fromAlias || 'LEK-System').trim() || 'LEK-System';
      const attachmentPayload = await this.buildAttachments(attachments);

      const payload: Record<string, unknown> = {
        from: `"${displayName}" <${fromAddress}>`,
        to: [toAlias],
        subject,
        text: body,
        html: this.buildHtml(body),
      };

      if (attachmentPayload.length > 0) {
        payload.attachments = attachmentPayload;
      }

      if (fromAlias.includes('@') && fromAlias !== fromAddress) {
        payload.reply_to = fromAlias;
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { error: String(data?.message || data?.error || 'Kunne ikke sende e-post via Resend') };
      }

      const stored = await this.fallbackStore.sendMail(fromAlias, toAlias, subject, body, userId, attachments);
      if (stored.error) {
        return { error: stored.error };
      }

      return { success: true };
    } catch (error: any) {
      return { error: error?.message || 'Kunne ikke sende e-post via Resend' };
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

