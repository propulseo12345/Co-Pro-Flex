import { ID } from '../common';
import { NiveauConfidentialite } from '../enums';

/**
 * Utilisateur autorise pour les documents CONFIDENTIEL
 */
export interface IDocumentAuthorizedUser {
  userId: ID;
  userName: string;
  userEmail: string;
  grantedBy: ID;
  grantedByName: string;
  grantedAt: string;
  reason?: string;
}

/**
 * Configuration d'acces d'un document
 */
export interface IDocumentAccessConfig {
  documentId: ID;
  confidentialite: NiveauConfidentialite;
  authorizedUsers: IDocumentAuthorizedUser[];
  accessHistory: IDocumentAccessLog[];
}

/**
 * Types d'actions tracees pour l'audit
 */
export type DocumentAccessActionType =
  | 'VIEW'
  | 'DOWNLOAD'
  | 'PRINT'
  | 'SHARE'
  | 'ACCESS_GRANTED'
  | 'ACCESS_REVOKED'
  | 'ACCESS_DENIED';

/**
 * Log d'acces pour l'audit trail
 */
export interface IDocumentAccessLog {
  id: ID;
  documentId: ID;
  userId: ID;
  userName: string;
  action: DocumentAccessActionType;
  timestamp: string;
  ipAddress?: string;
  details?: string;
  success: boolean;
  failureReason?: string;
}

/**
 * Resultat de verification de permission
 */
export interface DocumentPermissionResult {
  canView: boolean;
  canDownload: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageAccess: boolean;
  canShare: boolean;
  reason?: string;
}
