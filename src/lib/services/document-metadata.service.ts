/**
 * Service de gestion des métadonnées des documents
 * Gère l'historique des actions, les statistiques d'usage, les tags et les relations
 */

// ============================================================================
// TYPES
// ============================================================================

/** Type d'action sur un document */
export type DocumentActionType =
  | 'UPLOAD'
  | 'VIEW'
  | 'DOWNLOAD'
  | 'EDIT'
  | 'RENAME'
  | 'MOVE'
  | 'TAG_ADD'
  | 'TAG_REMOVE'
  | 'LINK_ADD'
  | 'LINK_REMOVE'
  | 'VERSION_CREATE'
  | 'SHARE'
  | 'PRINT';

/** Type de relation entre documents */
export type DocumentRelationType =
  | 'ANNEXE'           // Document annexé à un autre
  | 'REFERENCE'        // Fait référence à un autre document
  | 'REMPLACE'         // Remplace un autre document
  | 'COMPLETE'         // Complète un autre document
  | 'MODIFIE'          // Modifie un autre document
  | 'ASSOCIE';         // Association générale

/** Action enregistrée sur un document */
export interface DocumentAction {
  id: string;
  documentId: string;
  type: DocumentActionType;
  userId: string;
  userName: string;
  timestamp: string;
  details?: string;
  ipAddress?: string;
}

/** Tag d'un document */
export interface DocumentTag {
  id: string;
  label: string;
  color: string;
  createdBy: string;
  createdAt: string;
}

/** Relation entre documents */
export interface DocumentRelation {
  id: string;
  sourceDocumentId: string;
  targetDocumentId: string;
  relationType: DocumentRelationType;
  description?: string;
  createdBy: string;
  createdAt: string;
}

/** Métadonnées complètes d'un document */
export interface DocumentMetadata {
  documentId: string;

  // Informations d'upload
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: string;

  // Informations de modification
  lastModifiedBy?: string;
  lastModifiedByName?: string;
  lastModifiedAt?: string;

  // Statistiques d'usage
  viewCount: number;
  downloadCount: number;
  printCount: number;
  shareCount: number;
  lastViewedAt?: string;
  lastViewedBy?: string;
  lastViewedByName?: string;

  // Tags
  tags: string[];

  // Description et notes
  description?: string;
  notes?: string;

  // Source/origine
  source?: string;  // Ex: "Scan", "Email", "Téléchargement", "Création"
  originalFileName?: string;

  // Confidentialité
  confidentiality: 'PUBLIC' | 'CONSEIL_SYNDICAL' | 'SYNDIC_ONLY' | 'CONFIDENTIEL';
}

// ============================================================================
// TAGS PRÉDÉFINIS
// ============================================================================

export const PREDEFINED_TAGS: DocumentTag[] = [
  { id: 'tag-reglement', label: 'Règlement', color: '#8B5CF6', createdBy: 'system', createdAt: '2020-01-01' },
  { id: 'tag-copro', label: 'Copropriété', color: '#3B82F6', createdBy: 'system', createdAt: '2020-01-01' },
  { id: 'tag-ag', label: 'Assemblée Générale', color: '#10B981', createdBy: 'system', createdAt: '2020-01-01' },
  { id: 'tag-travaux', label: 'Travaux', color: '#F59E0B', createdBy: 'system', createdAt: '2020-01-01' },
  { id: 'tag-urgent', label: 'Urgent', color: '#EF4444', createdBy: 'system', createdAt: '2020-01-01' },
  { id: 'tag-legal', label: 'Légal', color: '#6366F1', createdBy: 'system', createdAt: '2020-01-01' },
  { id: 'tag-financier', label: 'Financier', color: '#EC4899', createdBy: 'system', createdAt: '2020-01-01' },
  { id: 'tag-maintenance', label: 'Maintenance', color: '#F97316', createdBy: 'system', createdAt: '2020-01-01' },
  { id: 'tag-archive', label: 'Archive', color: '#6B7280', createdBy: 'system', createdAt: '2020-01-01' },
  { id: 'tag-important', label: 'Important', color: '#DC2626', createdBy: 'system', createdAt: '2020-01-01' },
  { id: 'tag-2024', label: '2024', color: '#0EA5E9', createdBy: 'system', createdAt: '2024-01-01' },
  { id: 'tag-2023', label: '2023', color: '#0EA5E9', createdBy: 'system', createdAt: '2023-01-01' },
  { id: 'tag-2019', label: '2019', color: '#0EA5E9', createdBy: 'system', createdAt: '2019-01-01' },
];

// ============================================================================
// DONNÉES MOCK - MÉTADONNÉES
// ============================================================================

export const MOCK_DOCUMENT_METADATA: Record<string, DocumentMetadata> = {
  // Règlement de copropriété
  'reg-copro': {
    documentId: 'reg-copro',
    uploadedBy: 'user-syndic',
    uploadedByName: 'Cabinet Martin',
    uploadedAt: '2020-03-15T14:32:00',
    lastModifiedBy: 'user-marie',
    lastModifiedByName: 'Marie BERNARD',
    lastModifiedAt: '2024-01-22T10:15:00',
    viewCount: 127,
    downloadCount: 34,
    printCount: 8,
    shareCount: 5,
    lastViewedAt: '2026-01-15T09:42:00',
    lastViewedBy: 'user-jean',
    lastViewedByName: 'Jean DUPONT',
    tags: ['Règlement', 'Copropriété', 'Légal', 'Important'],
    description: 'Règlement de copropriété principal de la résidence Les Music-Halles',
    source: 'Scan',
    originalFileName: 'reglement_copropriete_scan.pdf',
    confidentiality: 'PUBLIC',
  },
  // Règlement intérieur
  'reg-interieur': {
    documentId: 'reg-interieur',
    uploadedBy: 'user-ancien-syndic',
    uploadedByName: 'Ancien Syndic SA',
    uploadedAt: '2019-06-20T11:45:00',
    viewCount: 89,
    downloadCount: 22,
    printCount: 12,
    shareCount: 3,
    lastViewedAt: '2026-01-12T16:30:00',
    lastViewedBy: 'user-paul',
    lastViewedByName: 'Paul MARTIN',
    tags: ['Règlement', 'Copropriété', '2019', 'Archive'],
    description: 'Règlement intérieur définissant les règles de vie commune',
    notes: 'À mettre à jour - document obsolète depuis 2024',
    source: 'Email',
    confidentiality: 'PUBLIC',
  },
  // EDD
  'edd': {
    documentId: 'edd',
    uploadedBy: 'user-notaire',
    uploadedByName: 'Me Lefèvre',
    uploadedAt: '2010-03-15T09:00:00',
    lastModifiedBy: 'user-syndic',
    lastModifiedByName: 'Cabinet Martin',
    lastModifiedAt: '2023-06-15T14:20:00',
    viewCount: 256,
    downloadCount: 67,
    printCount: 15,
    shareCount: 12,
    lastViewedAt: '2026-01-14T11:15:00',
    lastViewedBy: 'user-marie',
    lastViewedByName: 'Marie BERNARD',
    tags: ['Légal', 'Copropriété', 'Important'],
    description: 'État Descriptif de Division - répartition des tantièmes',
    source: 'Notaire',
    confidentiality: 'PUBLIC',
  },
  // PV AG 2024
  'pv-ag-2024': {
    documentId: 'pv-ag-2024',
    uploadedBy: 'user-syndic',
    uploadedByName: 'Cabinet Martin',
    uploadedAt: '2024-06-18T16:45:00',
    viewCount: 45,
    downloadCount: 28,
    printCount: 5,
    shareCount: 28,
    lastViewedAt: '2026-01-10T14:00:00',
    lastViewedBy: 'user-jean',
    lastViewedByName: 'Jean DUPONT',
    tags: ['Assemblée Générale', '2024', 'Important'],
    description: 'Procès-verbal de l\'Assemblée Générale ordinaire du 15 juin 2024',
    source: 'Création',
    confidentiality: 'PUBLIC',
  },
  // Contrat syndic 2024
  'ctr-syndic-2024': {
    documentId: 'ctr-syndic-2024',
    uploadedBy: 'user-syndic',
    uploadedByName: 'Cabinet Martin',
    uploadedAt: '2024-07-01T10:00:00',
    viewCount: 34,
    downloadCount: 12,
    printCount: 2,
    shareCount: 0,
    lastViewedAt: '2026-01-08T09:30:00',
    lastViewedBy: 'user-conseil',
    lastViewedByName: 'Pierre LEROY (CS)',
    tags: ['Légal', '2024', 'Financier'],
    description: 'Contrat de mandat syndic 2024-2027',
    source: 'Création',
    confidentiality: 'CONSEIL_SYNDICAL',
  },
  // Facture EDF
  'fac-edf-2024-01': {
    documentId: 'fac-edf-2024-01',
    uploadedBy: 'user-comptable',
    uploadedByName: 'Sophie DURAND',
    uploadedAt: '2024-02-05T11:20:00',
    viewCount: 8,
    downloadCount: 2,
    printCount: 1,
    shareCount: 0,
    lastViewedAt: '2024-03-15T10:00:00',
    lastViewedBy: 'user-syndic',
    lastViewedByName: 'Cabinet Martin',
    tags: ['Financier', '2024'],
    description: 'Facture électricité parties communes - Janvier 2024',
    source: 'Email',
    originalFileName: 'facture_edf_01_2024.pdf',
    confidentiality: 'SYNDIC_ONLY',
  },
  // Diagnostic DPE
  'diag-dpe-2023': {
    documentId: 'diag-dpe-2023',
    uploadedBy: 'user-syndic',
    uploadedByName: 'Cabinet Martin',
    uploadedAt: '2023-09-20T15:30:00',
    viewCount: 67,
    downloadCount: 23,
    printCount: 4,
    shareCount: 8,
    lastViewedAt: '2026-01-05T11:45:00',
    lastViewedBy: 'user-jean',
    lastViewedByName: 'Jean DUPONT',
    tags: ['Légal', '2023', 'Important'],
    description: 'Diagnostic de Performance Énergétique collectif',
    source: 'Diagnostiqueur',
    confidentiality: 'PUBLIC',
  },
};

// ============================================================================
// DONNÉES MOCK - HISTORIQUE DES ACTIONS
// ============================================================================

export const MOCK_DOCUMENT_ACTIONS: DocumentAction[] = [
  // Actions sur le règlement intérieur
  { id: 'act-1', documentId: 'reg-interieur', type: 'UPLOAD', userId: 'user-ancien-syndic', userName: 'Ancien Syndic SA', timestamp: '2019-06-20T11:45:00', details: 'Upload initial' },
  { id: 'act-2', documentId: 'reg-interieur', type: 'VIEW', userId: 'user-jean', userName: 'Jean DUPONT', timestamp: '2026-01-12T16:30:00' },
  { id: 'act-3', documentId: 'reg-interieur', type: 'DOWNLOAD', userId: 'user-marie', userName: 'Marie BERNARD', timestamp: '2025-11-05T14:20:00' },
  { id: 'act-4', documentId: 'reg-interieur', type: 'VIEW', userId: 'user-paul', userName: 'Paul MARTIN', timestamp: '2025-10-22T09:15:00' },
  { id: 'act-5', documentId: 'reg-interieur', type: 'PRINT', userId: 'user-conseil', userName: 'Pierre LEROY (CS)', timestamp: '2025-09-10T11:00:00' },

  // Actions sur le règlement de copropriété
  { id: 'act-6', documentId: 'reg-copro', type: 'UPLOAD', userId: 'user-syndic', userName: 'Cabinet Martin', timestamp: '2020-03-15T14:32:00', details: 'Upload version 2.0' },
  { id: 'act-7', documentId: 'reg-copro', type: 'EDIT', userId: 'user-marie', userName: 'Marie BERNARD', timestamp: '2024-01-22T10:15:00', details: 'Correction erreur page 12' },
  { id: 'act-8', documentId: 'reg-copro', type: 'VIEW', userId: 'user-jean', userName: 'Jean DUPONT', timestamp: '2026-01-15T09:42:00' },
  { id: 'act-9', documentId: 'reg-copro', type: 'TAG_ADD', userId: 'user-syndic', userName: 'Cabinet Martin', timestamp: '2024-02-01T09:00:00', details: 'Tag ajouté: Important' },
  { id: 'act-10', documentId: 'reg-copro', type: 'SHARE', userId: 'user-syndic', userName: 'Cabinet Martin', timestamp: '2024-06-20T14:00:00', details: 'Partagé avec les copropriétaires' },

  // Actions sur le PV AG 2024
  { id: 'act-11', documentId: 'pv-ag-2024', type: 'UPLOAD', userId: 'user-syndic', userName: 'Cabinet Martin', timestamp: '2024-06-18T16:45:00', details: 'PV validé et signé' },
  { id: 'act-12', documentId: 'pv-ag-2024', type: 'SHARE', userId: 'user-syndic', userName: 'Cabinet Martin', timestamp: '2024-06-19T09:00:00', details: 'Envoyé à tous les copropriétaires' },
  { id: 'act-13', documentId: 'pv-ag-2024', type: 'VIEW', userId: 'user-jean', userName: 'Jean DUPONT', timestamp: '2026-01-10T14:00:00' },

  // Actions sur l'EDD
  { id: 'act-14', documentId: 'edd', type: 'UPLOAD', userId: 'user-notaire', userName: 'Me Lefèvre', timestamp: '2010-03-15T09:00:00', details: 'Document notarié original' },
  { id: 'act-15', documentId: 'edd', type: 'VERSION_CREATE', userId: 'user-syndic', userName: 'Cabinet Martin', timestamp: '2023-06-15T14:20:00', details: 'Version 2.1 - Correction tantièmes' },
  { id: 'act-16', documentId: 'edd', type: 'LINK_ADD', userId: 'user-syndic', userName: 'Cabinet Martin', timestamp: '2023-06-15T15:00:00', details: 'Lié au PV AG 2023' },
];

// ============================================================================
// DONNÉES MOCK - RELATIONS ENTRE DOCUMENTS
// ============================================================================

export const MOCK_DOCUMENT_RELATIONS: DocumentRelation[] = [
  // Règlement intérieur lié au règlement de copropriété
  {
    id: 'rel-1',
    sourceDocumentId: 'reg-interieur',
    targetDocumentId: 'reg-copro',
    relationType: 'COMPLETE',
    description: 'Le règlement intérieur complète le règlement de copropriété',
    createdBy: 'user-syndic',
    createdAt: '2019-06-20',
  },
  // PV AG 2024 référence le règlement de copropriété (modification votée)
  {
    id: 'rel-2',
    sourceDocumentId: 'pv-ag-2024',
    targetDocumentId: 'reg-copro',
    relationType: 'MODIFIE',
    description: 'Modifications du règlement votées en AG',
    createdBy: 'user-syndic',
    createdAt: '2024-06-18',
  },
  // EDD lié au PV AG 2023
  {
    id: 'rel-3',
    sourceDocumentId: 'edd',
    targetDocumentId: 'pv-ag-2023',
    relationType: 'REFERENCE',
    description: 'Correction tantièmes approuvée en AG 2023',
    createdBy: 'user-syndic',
    createdAt: '2023-06-15',
  },
  // Contrat syndic 2024 remplace contrat 2021
  {
    id: 'rel-4',
    sourceDocumentId: 'ctr-syndic-2024',
    targetDocumentId: 'ctr-syndic-2021',
    relationType: 'REMPLACE',
    description: 'Nouveau mandat syndic',
    createdBy: 'user-syndic',
    createdAt: '2024-07-01',
  },
  // DPE annexé au PV AG 2023
  {
    id: 'rel-5',
    sourceDocumentId: 'diag-dpe-2023',
    targetDocumentId: 'pv-ag-2023',
    relationType: 'ANNEXE',
    description: 'DPE présenté lors de l\'AG 2023',
    createdBy: 'user-syndic',
    createdAt: '2023-09-20',
  },
  // Règlement intérieur lié au PV AG 2019 (adoption)
  {
    id: 'rel-6',
    sourceDocumentId: 'reg-interieur',
    targetDocumentId: 'pv-ag-2019',
    relationType: 'REFERENCE',
    description: 'Règlement adopté lors de l\'AG 2019',
    createdBy: 'user-ancien-syndic',
    createdAt: '2019-06-20',
  },
];

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

/**
 * Récupère les métadonnées d'un document
 */
export function getDocumentMetadata(documentId: string): DocumentMetadata | null {
  return MOCK_DOCUMENT_METADATA[documentId] || null;
}

/**
 * Récupère l'historique des actions d'un document
 */
export function getDocumentActions(documentId: string, limit?: number): DocumentAction[] {
  const actions = MOCK_DOCUMENT_ACTIONS
    .filter(a => a.documentId === documentId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return limit ? actions.slice(0, limit) : actions;
}

/**
 * Récupère les relations d'un document
 */
export function getDocumentRelations(documentId: string): {
  asSource: DocumentRelation[];
  asTarget: DocumentRelation[];
} {
  return {
    asSource: MOCK_DOCUMENT_RELATIONS.filter(r => r.sourceDocumentId === documentId),
    asTarget: MOCK_DOCUMENT_RELATIONS.filter(r => r.targetDocumentId === documentId),
  };
}

/**
 * Récupère les tags d'un document
 */
export function getDocumentTags(documentId: string): DocumentTag[] {
  const metadata = getDocumentMetadata(documentId);
  if (!metadata) return [];

  return metadata.tags.map(tagLabel => {
    const predefined = PREDEFINED_TAGS.find(t => t.label === tagLabel);
    return predefined || {
      id: `custom-${tagLabel.toLowerCase().replace(/\s+/g, '-')}`,
      label: tagLabel,
      color: '#6B7280',
      createdBy: 'unknown',
      createdAt: '2020-01-01',
    };
  });
}

/**
 * Récupère tous les tags disponibles
 */
export function getAllTags(): DocumentTag[] {
  return PREDEFINED_TAGS;
}

/**
 * Obtient le label du type d'action
 */
export function getActionTypeLabel(type: DocumentActionType): string {
  const labels: Record<DocumentActionType, string> = {
    UPLOAD: 'Téléversement',
    VIEW: 'Consultation',
    DOWNLOAD: 'Téléchargement',
    EDIT: 'Modification',
    RENAME: 'Renommage',
    MOVE: 'Déplacement',
    TAG_ADD: 'Ajout de tag',
    TAG_REMOVE: 'Suppression de tag',
    LINK_ADD: 'Liaison ajoutée',
    LINK_REMOVE: 'Liaison supprimée',
    VERSION_CREATE: 'Nouvelle version',
    SHARE: 'Partage',
    PRINT: 'Impression',
  };
  return labels[type];
}

/**
 * Obtient l'icône du type d'action (nom Lucide)
 */
export function getActionTypeIcon(type: DocumentActionType): string {
  const icons: Record<DocumentActionType, string> = {
    UPLOAD: 'Upload',
    VIEW: 'Eye',
    DOWNLOAD: 'Download',
    EDIT: 'Edit3',
    RENAME: 'Type',
    MOVE: 'FolderInput',
    TAG_ADD: 'Tag',
    TAG_REMOVE: 'Tag',
    LINK_ADD: 'Link2',
    LINK_REMOVE: 'Link2',
    VERSION_CREATE: 'GitBranch',
    SHARE: 'Share2',
    PRINT: 'Printer',
  };
  return icons[type];
}

/**
 * Obtient le label du type de relation
 */
export function getRelationTypeLabel(type: DocumentRelationType): string {
  const labels: Record<DocumentRelationType, string> = {
    ANNEXE: 'Annexe de',
    REFERENCE: 'Référence',
    REMPLACE: 'Remplace',
    COMPLETE: 'Complète',
    MODIFIE: 'Modifie',
    ASSOCIE: 'Associé à',
  };
  return labels[type];
}

/**
 * Obtient la couleur du type de relation
 */
export function getRelationTypeColor(type: DocumentRelationType): string {
  const colors: Record<DocumentRelationType, string> = {
    ANNEXE: '#8B5CF6',
    REFERENCE: '#3B82F6',
    REMPLACE: '#EF4444',
    COMPLETE: '#10B981',
    MODIFIE: '#F59E0B',
    ASSOCIE: '#6B7280',
  };
  return colors[type];
}

/**
 * Obtient le label de confidentialité
 */
export function getConfidentialityLabel(level: DocumentMetadata['confidentiality']): string {
  const labels: Record<DocumentMetadata['confidentiality'], string> = {
    PUBLIC: 'Public (tous les copropriétaires)',
    CONSEIL_SYNDICAL: 'Conseil Syndical uniquement',
    SYNDIC_ONLY: 'Syndic uniquement',
    CONFIDENTIEL: 'Confidentiel (accès restreint)',
  };
  return labels[level];
}

/**
 * Obtient la couleur de confidentialité
 */
export function getConfidentialityColor(level: DocumentMetadata['confidentiality']): string {
  const colors: Record<DocumentMetadata['confidentiality'], string> = {
    PUBLIC: '#10B981',
    CONSEIL_SYNDICAL: '#F59E0B',
    SYNDIC_ONLY: '#EF4444',
    CONFIDENTIEL: '#8B5CF6',
  };
  return colors[level];
}

/**
 * Formate une date relative (il y a X jours/heures)
 */
export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 60) {
    return `il y a ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
  }
  if (diffHours < 24) {
    return `il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
  }
  if (diffDays < 7) {
    return `il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
  }
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `il y a ${weeks} semaine${weeks > 1 ? 's' : ''}`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `il y a ${months} mois`;
  }
  const years = Math.floor(diffDays / 365);
  return `il y a ${years} an${years > 1 ? 's' : ''}`;
}

/**
 * Formate la date et l'heure
 */
export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
