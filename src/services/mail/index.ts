
import { MailService } from './types';
import { MockMailService } from './mock-mail-service';
import { DomeneshopMailService } from './domeneshop-mail-service';
import { SupabaseClient } from '@supabase/supabase-js';

// Configuration - can be moved to env vars later
const MAIL_PROVIDER = process.env.MAIL_PROVIDER || 'mock';

export function getMailService(client?: SupabaseClient): MailService {
    if (MAIL_PROVIDER === 'domeneshop') {
        return new DomeneshopMailService();
    }
    return new MockMailService(client);
}
