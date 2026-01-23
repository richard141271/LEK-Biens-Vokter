
export interface MailMessage {
    id: string;
    to_alias: string;
    from_alias: string;
    subject: string;
    body: string;
    created_at: string;
    read: boolean;
    folder: string;
    user_id?: string;
}

export interface MailService {
    getInbox(emailAlias: string): Promise<{ data?: MailMessage[]; error?: string }>;
    sendMail(fromAlias: string, toAlias: string, subject: string, body: string, userId: string): Promise<{ success?: boolean; error?: string }>;
    markAsRead(messageId: string): Promise<{ success?: boolean; error?: string }>;
}
