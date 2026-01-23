
import { MailService } from './types';
import { MockMailService } from './mock-mail-service';
import { DomeneshopMailService } from './domeneshop-mail-service';

// Configuration - can be moved to env vars later
const MAIL_PROVIDER = process.env.MAIL_PROVIDER || 'mock';

export function getMailService(): MailService {
    if (MAIL_PROVIDER === 'domeneshop') {
        return new DomeneshopMailService();
    }
    return new MockMailService();
}
