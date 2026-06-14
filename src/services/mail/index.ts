
import { MailService } from './types';
import { MockMailService } from './mock-mail-service';
import { DomeneshopMailService } from './domeneshop-mail-service';
import { NodemailerMailService } from './nodemailer-mail-service';
import { ResendMailService } from './resend-mail-service';
import { SupabaseClient } from '@supabase/supabase-js';

function pickProvider() {
  const provider = (process.env.MAIL_PROVIDER || '').trim().toLowerCase();
  if (provider) return provider;

  if (process.env.RESEND_API_KEY) return 'resend';

  const hasSmtpCreds = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
  if (hasSmtpCreds) return 'nodemailer';

  return 'mock';
}

export function getMailService(client?: SupabaseClient): MailService {
  const provider = pickProvider();
  if (provider === 'resend') {
    return new ResendMailService(client);
  }
  if (provider === 'domeneshop') {
    return new DomeneshopMailService();
  }
  if (provider === 'smtp' || provider === 'nodemailer') {
    return new NodemailerMailService();
  }
  return new MockMailService(client);
}
