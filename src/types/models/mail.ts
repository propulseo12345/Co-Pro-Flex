import { BaseEntity, ID } from '../common';

// ========================================
// STATUTS
// ========================================

export type MailStatut = 'sent' | 'opened' | 'received' | 'draft' | 'deleted';

export type MailRecipientType = 'all' | 'group' | 'individual';

export type MailHistoriqueAction =
  | 'creation'
  | 'envoi'
  | 'lecture'
  | 'suppression'
  | 'restauration'
  | 'suppression_definitive';

// ========================================
// PIECES JOINTES
// ========================================

export interface PieceJointeMail {
  id: string;
  nom: string;
  taille: number; // bytes
  mimeType: string;
  url: string; // blob URL ou URL storage
  dateAjout: string;
}

// ========================================
// PARTICIPANTS
// ========================================

export interface MailParticipant {
  id: string;
  nom: string;
  email?: string;
  lot?: string;
  type: 'coproprietaire' | 'syndic' | 'groupe';
}

export interface MailGroupe {
  id: string;
  label: string;
  count: number;
}

// ========================================
// STATISTIQUES
// ========================================

export interface MailStats {
  sent: number;
  opened: number;
  received: number;
}

// ========================================
// MAIL PRINCIPAL
// ========================================

export interface Mail {
  id: string;
  coproprieteId: string;
  subject: string;
  body: string;
  preview?: string;
  sender?: MailParticipant;
  recipients: MailParticipant[];
  recipientType: MailRecipientType;
  piecesJointes: PieceJointeMail[];
  statut: MailStatut;
  template?: string;
  isRead: boolean;
  hasAttachment: boolean;
  dateCreation: string;
  dateEnvoi?: string;
  dateSuppression?: string; // Pour corbeille 30 jours
  stats?: MailStats;
}

// ========================================
// HISTORIQUE / JOURNALISATION
// ========================================

export interface MailHistorique {
  id: string;
  mailId: string;
  action: MailHistoriqueAction;
  date: string;
  utilisateur: string;
  utilisateurId?: string;
  details?: string;
}

// ========================================
// FILTRES
// ========================================

export type MailOnglet = 'inbox' | 'sent' | 'drafts' | 'archived' | 'trash';

export interface MailFiltres {
  onglet: MailOnglet;
  recherche: string;
  hasAttachment?: boolean;
  isRead?: boolean;
}

// ========================================
// BROUILLON
// ========================================

export interface BrouillonData {
  id?: string;
  subject: string;
  body: string;
  recipients: MailParticipant[];
  recipientType: MailRecipientType;
  template?: string;
  piecesJointes: PieceJointeMail[];
}

// ========================================
// STORAGE
// ========================================

export interface MailStorageData {
  mails: Mail[];
  historique: Record<string, MailHistorique[]>;
  lastPurgeDate?: string;
}

// ========================================
// TEMPLATES
// ========================================

export interface MailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

// ========================================
// CONSTANTES
// ========================================

export const MAIL_CORBEILLE_JOURS = 30;

export const MAIL_FORMATS_AUTORISES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const MAIL_TAILLE_MAX = 10 * 1024 * 1024; // 10 Mo

// ========================================
// UTILITAIRES
// ========================================

export function joursRestantsCorbeille(dateSuppression: string): number {
  const suppression = new Date(dateSuppression);
  const maintenant = new Date();
  const diffMs = MAIL_CORBEILLE_JOURS * 24 * 60 * 60 * 1000 - (maintenant.getTime() - suppression.getTime());
  return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}

export function generateMailId(): string {
  return `mail-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function generatePJId(): string {
  return `pj-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function formatTailleFichier(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function validerFichierPJ(file: File): { valid: boolean; error?: string } {
  if (file.size > MAIL_TAILLE_MAX) {
    return { valid: false, error: `Le fichier dépasse la taille maximale de 10 Mo` };
  }

  if (!MAIL_FORMATS_AUTORISES.includes(file.type)) {
    return { valid: false, error: `Format de fichier non autorisé` };
  }

  return { valid: true };
}
