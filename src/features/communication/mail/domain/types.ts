// ============================================================================
// Mail — Types du domaine
// ============================================================================

/** Statut d'un mail (aligné sur le schéma SQL) */
export type MailStatus = 'draft' | 'sent' | 'received';

/** Types de dossiers système */
export type SystemFolderType = 'inbox' | 'sent' | 'drafts' | 'archive' | 'trash' | 'spam';

/** Participant d'un mail (expéditeur ou destinataire) */
export interface IMailParticipant {
  name: string;
  email: string;
}

/** Pièce jointe d'un mail */
export interface IMailAttachment {
  id: string;
  name: string;
  size: string;
  type: 'pdf' | 'image' | 'document' | 'spreadsheet';
  url?: string;
}

/** Mail complet */
export interface IMail {
  id: string;
  coproprieteId: string;
  folderId: string;
  from: IMailParticipant;
  to: IMailParticipant[];
  cc?: IMailParticipant[];
  subject: string;
  body: string;
  bodyPreview: string;
  status: MailStatus;
  isRead: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  deletedAt: string | null;
  isStarred: boolean;
  hasAttachments: boolean;
  attachments: IMailAttachment[];
  labelIds: string[];
  replyToId?: string;
  threadId?: string;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Label de mail (tag coloré) */
export interface IMailLabel {
  id: string;
  coproprieteId: string;
  name: string;
  color: string;
  sortOrder: number;
}

/** Dossier de mail */
export interface IMailFolder {
  id: string;
  coproprieteId: string;
  userId: string;
  name: string;
  folderType: SystemFolderType | null;
  icon: string;
  isSystem: boolean;
  sortOrder: number;
  unreadCount: number;
}

/** Données pour un brouillon */
export interface IDraftData {
  to: IMailParticipant[];
  cc?: IMailParticipant[];
  subject: string;
  body: string;
  attachments?: IMailAttachment[];
  labelIds?: string[];
  replyToId?: string;
}
