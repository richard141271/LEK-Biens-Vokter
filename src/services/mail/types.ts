
export interface MailMessage {
    id: string;
    to_alias: string;
    from_alias: string;
    subject: string;
    body: string;
    created_at: string;
    read: boolean;
    folder: string; // slug
    user_id?: string;
}

export interface MailFolder {
    id: string;
    user_id: string;
    name: string;
    slug: string;
    type: 'system' | 'custom';
    count?: number; // Optional count of messages
}

export interface MailService {
    getInbox(emailAlias: string, folder?: string): Promise<{ data?: MailMessage[]; error?: string }>;
    sendMail(fromAlias: string, toAlias: string, subject: string, body: string, userId: string): Promise<{ success?: boolean; error?: string }>;
    markAsRead(messageId: string): Promise<{ success?: boolean; error?: string }>;
    
    // Folder Management
    getFolders(userId: string): Promise<{ data?: MailFolder[]; error?: string }>;
    createFolder(userId: string, name: string): Promise<{ data?: MailFolder; error?: string }>;
    deleteFolder(userId: string, folderId: string): Promise<{ success?: boolean; error?: string }>;
    
    // Signature
    getSignature(userId: string): Promise<{ data?: string; error?: string }>;
    updateSignature(userId: string, signature: string): Promise<{ success?: boolean; error?: string }>;
}
