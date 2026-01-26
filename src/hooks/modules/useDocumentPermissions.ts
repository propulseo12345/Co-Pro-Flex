'use client';

import { useCallback, useMemo, useRef } from 'react';
import { useCurrentUser } from '@/providers/CurrentUserProvider';
import { UserRole, NiveauConfidentialite, ROLE_PERMISSIONS } from '@/types/enums';
import type {
  IDocumentAccessConfig,
  IDocumentAuthorizedUser,
  IDocumentAccessLog,
  DocumentPermissionResult,
  DocumentAccessActionType,
} from '@/types/models/document-access';

/**
 * Store mock pour les configurations d'acces (remplace par Supabase plus tard)
 */
const accessConfigsStore: Record<string, IDocumentAccessConfig> = {};
const accessLogsStore: IDocumentAccessLog[] = [];

/**
 * Hook de gestion des permissions documents
 */
export function useDocumentPermissions() {
  const { currentUser } = useCurrentUser();
  const idCounter = useRef(0);

  const generateId = useCallback(() => {
    idCounter.current += 1;
    return `log-${Date.now()}-${idCounter.current}`;
  }, []);

  /**
   * Verifie si l'utilisateur a une permission specifique selon son role
   */
  const hasPermission = useCallback((permission: string): boolean => {
    if (!currentUser) return false;

    const rolePerms = ROLE_PERMISSIONS[currentUser.role as UserRole] || [];

    if (rolePerms.includes('*')) return true;
    if (rolePerms.includes(permission)) return true;

    const [module, action] = permission.split(':');
    if (rolePerms.includes(`${module}:*`)) return true;

    return false;
  }, [currentUser]);

  /**
   * Verifie si l'utilisateur peut acceder a un document selon son niveau de confidentialite
   */
  const canAccessDocument = useCallback((
    confidentialite: NiveauConfidentialite | string,
    authorizedUserIds?: string[]
  ): DocumentPermissionResult => {
    const noAccess: DocumentPermissionResult = {
      canView: false,
      canDownload: false,
      canEdit: false,
      canDelete: false,
      canManageAccess: false,
      canShare: false,
    };

    if (!currentUser) {
      return { ...noAccess, reason: 'Non connecte' };
    }

    const role = currentUser.role as UserRole;

    // ADMIN et SYNDIC ont acces total
    if (role === UserRole.ADMIN || role === UserRole.SYNDIC) {
      return {
        canView: true,
        canDownload: true,
        canEdit: true,
        canDelete: true,
        canManageAccess: true,
        canShare: true,
      };
    }

    const level = confidentialite as NiveauConfidentialite;

    switch (level) {
      case NiveauConfidentialite.PUBLIC:
        if (role === UserRole.LOCATAIRE) {
          return {
            canView: true,
            canDownload: false,
            canEdit: false,
            canDelete: false,
            canManageAccess: false,
            canShare: false,
            reason: 'Locataire - acces en lecture seule',
          };
        }
        return {
          canView: true,
          canDownload: true,
          canEdit: false,
          canDelete: false,
          canManageAccess: false,
          canShare: false,
        };

      case NiveauConfidentialite.CS_ONLY:
        if (role === UserRole.PRESIDENT_CS || role === UserRole.MEMBRE_CS) {
          return {
            canView: true,
            canDownload: true,
            canEdit: false,
            canDelete: false,
            canManageAccess: false,
            canShare: false,
          };
        }
        return { ...noAccess, reason: 'Reserve au Conseil Syndical' };

      case NiveauConfidentialite.SYNDIC_ONLY:
        return { ...noAccess, reason: 'Reserve au Syndic' };

      case NiveauConfidentialite.CONFIDENTIEL:
        if (authorizedUserIds?.includes(currentUser.id)) {
          return {
            canView: true,
            canDownload: true,
            canEdit: false,
            canDelete: false,
            canManageAccess: false,
            canShare: false,
          };
        }
        return { ...noAccess, reason: 'Document confidentiel - acces non autorise' };

      default:
        // Defaut: traiter comme PUBLIC
        return {
          canView: true,
          canDownload: true,
          canEdit: false,
          canDelete: false,
          canManageAccess: false,
          canShare: false,
        };
    }
  }, [currentUser]);

  /**
   * Filtre une liste de documents selon les droits de l'utilisateur
   */
  const filterAccessibleDocuments = useCallback(<T extends { id: string; confidentialite?: NiveauConfidentialite | string }>(
    documents: T[]
  ): T[] => {
    if (!currentUser) return [];

    return documents.filter(doc => {
      const config = accessConfigsStore[doc.id];
      const authorizedIds = config?.authorizedUsers.map(u => u.userId);
      const result = canAccessDocument(
        doc.confidentialite || NiveauConfidentialite.PUBLIC,
        authorizedIds
      );
      return result.canView;
    });
  }, [currentUser, canAccessDocument]);

  /**
   * Recupere la configuration d'acces d'un document
   */
  const getDocumentAccessConfig = useCallback((documentId: string): IDocumentAccessConfig | null => {
    return accessConfigsStore[documentId] || null;
  }, []);

  /**
   * Ajoute un utilisateur autorise pour un document CONFIDENTIEL
   */
  const addAuthorizedUser = useCallback((
    documentId: string,
    userId: string,
    userName: string,
    userEmail: string,
    reason?: string
  ): boolean => {
    if (!currentUser) return false;

    const role = currentUser.role as UserRole;
    if (role !== UserRole.ADMIN && role !== UserRole.SYNDIC) return false;

    if (!accessConfigsStore[documentId]) {
      accessConfigsStore[documentId] = {
        documentId,
        confidentialite: NiveauConfidentialite.CONFIDENTIEL,
        authorizedUsers: [],
        accessHistory: [],
      };
    }

    // Verifier si deja autorise
    const existing = accessConfigsStore[documentId].authorizedUsers.find(u => u.userId === userId);
    if (existing) return false;

    const newAuth: IDocumentAuthorizedUser = {
      userId,
      userName,
      userEmail,
      grantedBy: currentUser.id,
      grantedByName: `${currentUser.prenom || ''} ${currentUser.nom}`.trim(),
      grantedAt: new Date().toISOString(),
      reason,
    };

    accessConfigsStore[documentId].authorizedUsers.push(newAuth);

    logAccessAction(documentId, 'ACCESS_GRANTED', true, `Acces accorde a ${userName}`);

    return true;
  }, [currentUser]);

  /**
   * Retire l'acces d'un utilisateur pour un document CONFIDENTIEL
   */
  const removeAuthorizedUser = useCallback((documentId: string, userId: string): boolean => {
    if (!currentUser) return false;

    const role = currentUser.role as UserRole;
    if (role !== UserRole.ADMIN && role !== UserRole.SYNDIC) return false;

    const config = accessConfigsStore[documentId];
    if (!config) return false;

    const removedUser = config.authorizedUsers.find(u => u.userId === userId);
    if (!removedUser) return false;

    config.authorizedUsers = config.authorizedUsers.filter(u => u.userId !== userId);

    logAccessAction(documentId, 'ACCESS_REVOKED', true, `Acces revoque pour ${removedUser.userName}`);

    return true;
  }, [currentUser]);

  /**
   * Met a jour le niveau de confidentialite d'un document
   */
  const updateDocumentConfidentiality = useCallback((
    documentId: string,
    newLevel: NiveauConfidentialite
  ): boolean => {
    if (!currentUser) return false;

    const role = currentUser.role as UserRole;
    if (role !== UserRole.ADMIN && role !== UserRole.SYNDIC) return false;

    if (!accessConfigsStore[documentId]) {
      accessConfigsStore[documentId] = {
        documentId,
        confidentialite: newLevel,
        authorizedUsers: [],
        accessHistory: [],
      };
    } else {
      accessConfigsStore[documentId].confidentialite = newLevel;
    }

    // Effacer les utilisateurs autorises si ce n'est plus CONFIDENTIEL
    if (newLevel !== NiveauConfidentialite.CONFIDENTIEL) {
      accessConfigsStore[documentId].authorizedUsers = [];
    }

    return true;
  }, [currentUser]);

  /**
   * Enregistre une action d'acces dans les logs
   */
  const logAccessAction = useCallback((
    documentId: string,
    action: DocumentAccessActionType,
    success: boolean,
    details?: string,
    failureReason?: string
  ): void => {
    if (!currentUser) return;

    const log: IDocumentAccessLog = {
      id: generateId(),
      documentId,
      userId: currentUser.id,
      userName: `${currentUser.prenom || ''} ${currentUser.nom}`.trim(),
      action,
      timestamp: new Date().toISOString(),
      success,
      details,
      failureReason,
    };

    accessLogsStore.push(log);

    if (accessConfigsStore[documentId]) {
      accessConfigsStore[documentId].accessHistory.push(log);
    }
  }, [currentUser, generateId]);

  /**
   * Recupere les logs d'acces d'un document
   */
  const getDocumentAccessLogs = useCallback((documentId: string, limit?: number): IDocumentAccessLog[] => {
    const logs = accessLogsStore
      .filter(l => l.documentId === documentId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return limit ? logs.slice(0, limit) : logs;
  }, []);

  /**
   * Verifie si l'utilisateur peut gerer les droits d'acces
   */
  const canManageAccess = useMemo((): boolean => {
    if (!currentUser) return false;
    const role = currentUser.role as UserRole;
    return role === UserRole.ADMIN || role === UserRole.SYNDIC;
  }, [currentUser]);

  return {
    // Verification des permissions
    hasPermission,
    canAccessDocument,
    filterAccessibleDocuments,
    canManageAccess,

    // Gestion de la configuration d'acces
    getDocumentAccessConfig,
    addAuthorizedUser,
    removeAuthorizedUser,
    updateDocumentConfidentiality,

    // Logging
    logAccessAction,
    getDocumentAccessLogs,

    // Info utilisateur
    currentUser,
  };
}

/**
 * Exporte le store pour les tests et l'initialisation
 */
export function initializeDocumentAccessConfig(
  documentId: string,
  confidentialite: NiveauConfidentialite,
  authorizedUsers: IDocumentAuthorizedUser[] = []
): void {
  accessConfigsStore[documentId] = {
    documentId,
    confidentialite,
    authorizedUsers,
    accessHistory: [],
  };
}

export function getAccessConfigsStore(): Record<string, IDocumentAccessConfig> {
  return accessConfigsStore;
}

export function getAccessLogsStore(): IDocumentAccessLog[] {
  return accessLogsStore;
}
