
import { MailService } from './types';
import { MockMailService } from './mock-mail-service';
import { NodemailerMailService } from './nodemailer-mail-service';
import { ResendMailService } from './resend-mail-service';
import { SupabaseClient } from '@supabase/supabase-js';

function pickProvider() {
  const hasResendApiKey = Boolean(String(process.env.RESEND_API_KEY || '').trim());
  if (hasResendApiKey) return 'resend';

  const provider = (process.env.MAIL_PROVIDER || '').trim().toLowerCase();
  if (provider === 'mock') return 'mock';
  if (provider === 'smtp' || provider === 'nodemailer' || provider === 'domeneshop') {
    return 'nodemailer';
  }

  const hasSmtpCreds = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
  if (hasSmtpCreds) return 'nodemailer';

  return 'mock';
}

export function getMailService(client?: SupabaseClient): MailService {
  const provider = pickProvider();
  if (provider === 'resend') {
    return new ResendMailService(client);
  }
  if (provider === 'nodemailer') {
    return new NodemailerMailService(client);
  }
  return new MockMailService(client);
}

export function getMailProviderName() {
  return pickProvider();
}
