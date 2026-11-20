export type EmailStatus = 'accepted' | 'failed' | 'draft';
export type MailAttachment = { filename: string; contentType: string; content: string; size: number };
export type EmailRecord = { id: string; to: string[]; cc: string[]; bcc: string[]; subject: string; text: string; html: string; sender: string; createdAt: string; status: EmailStatus; messageId?: string; error?: string; attachments: string[] };
