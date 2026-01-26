/**
 * Service de gestion du versioning des documents
 * Gère les statuts, versions, validité et historique des documents
 */

// ============================================================================
// TYPES
// ============================================================================

/** Statut de validité du document */
export type DocumentValidityStatus = 'VALIDE' | 'OBSOLETE' | 'ARCHIVE' | 'BROUILLON';

/** Type de modification */
export type ModificationType =
  | 'CREATION'
  | 'MODIFICATION_MINEURE'
  | 'MODIFICATION_MAJEURE'
  | 'REMPLACEMENT'
  | 'ARCHIVAGE'
  | 'RESTAURATION';

/** Catégories de documents réglementaires nécessitant un suivi */
export const CATEGORIES_REGLEMENTAIRES = [
  'REGLEMENT',
  'CONTRAT',
  'DIAGNOSTIC',
  'PV_AG',
] as const;

/** Durée maximale de validité par défaut (en années) par catégorie */
export const DUREE_VALIDITE_PAR_CATEGORIE: Record<string, number | null> = {
  REGLEMENT: 5,        // Règlements: alerte après 5 ans
  CONTRAT: null,       // Contrats: selon date de fin du contrat
  DIAGNOSTIC: 10,      // Diagnostics: durée réglementaire
  PV_AG: null,         // PV: pas de date d'expiration
  FACTURE: 10,         // Factures: conservation 10 ans
  PLAN: null,          // Plans: pas d'expiration
  CORRESPONDANCE: 5,   // Correspondances: archivage après 5 ans
  PHOTO: null,         // Photos: pas d'expiration
  ORDRE_SERVICE: 10,   // Ordres service: conservation 10 ans
  AUTRE: null,
};

/** Information de version d'un document */
export interface DocumentVersion {
  version: string;           // Ex: "1.0", "1.1", "2.0"
  documentId: string;        // ID du document dans cette version
  dateCreation: string;      // Date de création de cette version
  creePar: string;           // Utilisateur ayant créé cette version
  motif?: string;            // Motif de la modification
  modificationType: ModificationType;
  changements?: string;      // Description des changements
  taille: string;            // Taille du fichier
}

/** Historique d'un document versionné */
export interface DocumentVersionHistory {
  documentRootId: string;    // ID racine du document (groupe toutes les versions)
  currentVersionId: string;  // ID de la version courante
  currentVersion: string;    // Numéro de version courante
  versions: DocumentVersion[];
}

/** Métadonnées étendues pour le versioning */
export interface DocumentVersioningMetadata {
  statut: DocumentValidityStatus;
  version: string;
  dateValidite?: string;           // Date jusqu'à laquelle le document est valide
  dateExpiration?: string;         // Date d'expiration (archivage recommandé)
  remplacePar?: string;            // ID du document qui remplace celui-ci
  remplaceDocument?: string;       // ID du document que celui-ci remplace
  estVersionActive: boolean;       // Est-ce la version active ?
  documentRootId: string;          // ID racine pour grouper les versions
  motifModification?: string;      // Dernier motif de modification
  derniereVerification?: string;   // Date de dernière vérification de validité
  prochainExamen?: string;         // Date du prochain examen recommandé
}

// ============================================================================
// DONNÉES MOCK - MÉTADONNÉES DE VERSIONING
// ============================================================================

/** Métadonnées de versioning pour les documents mock */
export const MOCK_DOCUMENT_VERSIONING: Record<string, DocumentVersioningMetadata> = {
  // Règlement de copropriété - Version valide
  'reg-copro': {
    statut: 'VALIDE',
    version: '2.0',
    dateValidite: '2030-03-15',
    estVersionActive: true,
    documentRootId: 'root-reglement-copro',
    remplaceDocument: 'reg-copro-v1',
    motifModification: 'Mise en conformité loi ELAN',
    derniereVerification: '2020-03-15',
    prochainExamen: '2025-03-15',
  },
  // Règlement intérieur - OBSOLÈTE (> 5 ans sans mise à jour)
  'reg-interieur': {
    statut: 'OBSOLETE',
    version: '1.0',
    dateValidite: '2024-06-20', // 5 ans après création, expiré
    estVersionActive: true, // Toujours actif car pas remplacé
    documentRootId: 'root-reglement-interieur',
    derniereVerification: '2019-06-20',
    prochainExamen: '2024-06-20', // Dépassé !
  },
  // EDD - État Descriptif de Division
  'edd': {
    statut: 'VALIDE',
    version: '2.1',
    dateValidite: '2030-01-01',
    remplaceDocument: 'edd-v2',
    estVersionActive: true,
    documentRootId: 'root-edd',
    motifModification: 'Correction tantièmes lot 15 suite erreur matérielle',
    derniereVerification: '2023-06-15',
    prochainExamen: '2028-06-15',
  },
  // Modificatif règlement parking vélos 2022
  'mod-reg-2022': {
    statut: 'VALIDE',
    version: '1.0',
    dateValidite: '2027-07-10',
    estVersionActive: true,
    documentRootId: 'root-mod-parking',
    derniereVerification: '2022-07-10',
    prochainExamen: '2027-07-10',
  },
  // Modificatif règlement local poubelles 2018 - OBSOLÈTE
  'mod-reg-2018': {
    statut: 'OBSOLETE',
    version: '1.0',
    dateValidite: '2023-09-22', // 5 ans après
    estVersionActive: true,
    documentRootId: 'root-mod-poubelles',
    derniereVerification: '2018-09-22',
    prochainExamen: '2023-09-22', // Dépassé
  },
  // Contrat syndic 2024
  'ctr-syndic-2024': {
    statut: 'VALIDE',
    version: '1.0',
    dateValidite: '2027-06-30',
    estVersionActive: true,
    documentRootId: 'root-ctr-syndic',
    remplaceDocument: 'ctr-syndic-2021',
    motifModification: 'Nouveau mandat de 3 ans voté en AG 2024',
    derniereVerification: '2024-07-01',
    prochainExamen: '2027-01-01',
  },
  // Contrat syndic 2021 - Archivé
  'ctr-syndic-2021': {
    statut: 'ARCHIVE',
    version: '1.0',
    dateValidite: '2024-06-30',
    dateExpiration: '2024-06-30',
    remplacePar: 'ctr-syndic-2024',
    estVersionActive: false,
    documentRootId: 'root-ctr-syndic',
    derniereVerification: '2021-07-01',
  },
  // Contrat assurance MRH - À réviser bientôt
  'ctr-assurance-mrh': {
    statut: 'VALIDE',
    version: '3.0',
    dateValidite: '2025-03-31',
    estVersionActive: true,
    documentRootId: 'root-assurance-mrh',
    motifModification: 'Renouvellement annuel avec ajustement garanties',
    derniereVerification: '2024-01-01',
    prochainExamen: '2025-01-15', // Révision à prévoir
  },
  // Contrat ascenseur
  'ctr-ascenseur': {
    statut: 'VALIDE',
    version: '2.0',
    dateValidite: '2026-01-01',
    estVersionActive: true,
    documentRootId: 'root-ctr-ascenseur',
    derniereVerification: '2023-01-15',
    prochainExamen: '2025-10-01',
  },
  // DPE collectif
  'diag-dpe-2023': {
    statut: 'VALIDE',
    version: '1.0',
    dateValidite: '2033-09-15',
    estVersionActive: true,
    documentRootId: 'root-dpe',
    derniereVerification: '2023-09-15',
    prochainExamen: '2033-09-15',
  },
  // Diagnostic amiante - Brouillon
  'diag-amiante-brouillon': {
    statut: 'BROUILLON',
    version: '1.0',
    estVersionActive: false,
    documentRootId: 'root-diag-amiante',
    motifModification: 'En attente de validation du diagnostiqueur',
  },
};

/** Historique des versions des documents */
export const MOCK_DOCUMENT_VERSION_HISTORY: DocumentVersionHistory[] = [
  {
    documentRootId: 'root-reglement-copro',
    currentVersionId: 'reg-copro',
    currentVersion: '2.0',
    versions: [
      {
        version: '1.0',
        documentId: 'reg-copro-v1',
        dateCreation: '2010-03-15',
        creePar: 'Notaire - Me Lefèvre',
        modificationType: 'CREATION',
        changements: 'Version initiale établie lors de la mise en copropriété',
        taille: '6.2 Mo',
      },
      {
        version: '2.0',
        documentId: 'reg-copro',
        dateCreation: '2020-03-15',
        creePar: 'Cabinet Martin',
        modificationType: 'MODIFICATION_MAJEURE',
        motif: 'Mise en conformité loi ELAN',
        changements: 'Révision complète des parties communes, ajout règles stationnement véhicules électriques, mise à jour des tantièmes',
        taille: '8.5 Mo',
      },
    ],
  },
  {
    documentRootId: 'root-reglement-interieur',
    currentVersionId: 'reg-interieur',
    currentVersion: '1.0',
    versions: [
      {
        version: '1.0',
        documentId: 'reg-interieur',
        dateCreation: '2019-06-20',
        creePar: 'Syndic Précédent',
        modificationType: 'CREATION',
        changements: 'Version initiale',
        taille: '1.2 Mo',
      },
    ],
  },
  {
    documentRootId: 'root-edd',
    currentVersionId: 'edd',
    currentVersion: '2.1',
    versions: [
      {
        version: '1.0',
        documentId: 'edd-v1',
        dateCreation: '2010-03-15',
        creePar: 'Me Lefèvre',
        modificationType: 'CREATION',
        changements: 'Version originale établie lors de la mise en copropriété',
        taille: '4.2 Mo',
      },
      {
        version: '2.0',
        documentId: 'edd-v2',
        dateCreation: '2020-07-01',
        creePar: 'Me Durand',
        modificationType: 'MODIFICATION_MAJEURE',
        motif: 'Division lot 8 en deux lots (8a et 8b)',
        changements: 'Modification grilles de tantièmes, création nouveaux lots',
        taille: '4.8 Mo',
      },
      {
        version: '2.1',
        documentId: 'edd',
        dateCreation: '2023-06-15',
        creePar: 'Cabinet Martin',
        modificationType: 'MODIFICATION_MINEURE',
        motif: 'Correction erreur matérielle',
        changements: 'Correction tantièmes lot 15 (345/10000 au lieu de 354/10000)',
        taille: '5.1 Mo',
      },
    ],
  },
  {
    documentRootId: 'root-assurance-mrh',
    currentVersionId: 'ctr-assurance-mrh',
    currentVersion: '3.0',
    versions: [
      {
        version: '1.0',
        documentId: 'ctr-assurance-mrh-v1',
        dateCreation: '2022-01-01',
        creePar: 'Cabinet Martin',
        modificationType: 'CREATION',
        changements: 'Contrat initial avec AXA',
        taille: '890 Ko',
      },
      {
        version: '2.0',
        documentId: 'ctr-assurance-mrh-v2',
        dateCreation: '2023-01-01',
        creePar: 'Cabinet Martin',
        modificationType: 'REMPLACEMENT',
        motif: 'Changement assureur',
        changements: 'Nouveau contrat avec Allianz, amélioration couverture dégâts des eaux',
        taille: '1.1 Mo',
      },
      {
        version: '3.0',
        documentId: 'ctr-assurance-mrh',
        dateCreation: '2024-01-01',
        creePar: 'Cabinet Martin',
        modificationType: 'MODIFICATION_MAJEURE',
        motif: 'Renouvellement avec options supplémentaires',
        changements: 'Ajout garantie catastrophes naturelles étendue, augmentation plafond indemnisation',
        taille: '1.2 Mo',
      },
    ],
  },
  {
    documentRootId: 'root-ctr-syndic',
    currentVersionId: 'ctr-syndic-2024',
    currentVersion: '4.0',
    versions: [
      {
        version: '1.0',
        documentId: 'ctr-syndic-2015',
        dateCreation: '2015-07-01',
        creePar: 'Ancien Syndic SA',
        modificationType: 'CREATION',
        changements: 'Premier contrat de syndic',
        taille: '520 Ko',
      },
      {
        version: '2.0',
        documentId: 'ctr-syndic-2018',
        dateCreation: '2018-07-01',
        creePar: 'Ancien Syndic SA',
        modificationType: 'REMPLACEMENT',
        motif: 'Renouvellement mandat 3 ans',
        changements: 'Ajustement honoraires, ajout clause rénovation énergétique',
        taille: '680 Ko',
      },
      {
        version: '3.0',
        documentId: 'ctr-syndic-2021',
        dateCreation: '2021-07-01',
        creePar: 'Cabinet Martin',
        modificationType: 'REMPLACEMENT',
        motif: 'Changement de syndic',
        changements: 'Nouveau syndic - Cabinet Martin, refonte complète du contrat',
        taille: '1.4 Mo',
      },
      {
        version: '4.0',
        documentId: 'ctr-syndic-2024',
        dateCreation: '2024-07-01',
        creePar: 'Cabinet Martin',
        modificationType: 'MODIFICATION_MAJEURE',
        motif: 'Renouvellement avec nouvelles prestations',
        changements: 'Ajout services numériques, plateforme copropriétaires, extranet',
        taille: '1.8 Mo',
      },
    ],
  },
];

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

/**
 * Récupère les métadonnées de versioning d'un document
 */
export function getDocumentVersioning(documentId: string): DocumentVersioningMetadata | null {
  return MOCK_DOCUMENT_VERSIONING[documentId] || null;
}

/**
 * Récupère l'historique des versions d'un document
 */
export function getDocumentVersionHistory(documentId: string): DocumentVersionHistory | null {
  const metadata = getDocumentVersioning(documentId);
  if (!metadata) return null;

  return MOCK_DOCUMENT_VERSION_HISTORY.find(
    h => h.documentRootId === metadata.documentRootId
  ) || null;
}

/**
 * Vérifie si un document est obsolète
 */
export function isDocumentObsolete(documentId: string): boolean {
  const metadata = getDocumentVersioning(documentId);
  return metadata?.statut === 'OBSOLETE';
}

/**
 * Vérifie si un document nécessite une révision (proche de l'expiration)
 */
export function needsReview(documentId: string, daysThreshold = 90): boolean {
  const metadata = getDocumentVersioning(documentId);
  if (!metadata || !metadata.prochainExamen) return false;

  const examDate = new Date(metadata.prochainExamen);
  const today = new Date();
  const diffDays = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return diffDays <= daysThreshold && diffDays > 0;
}

/**
 * Vérifie si un document a dépassé sa date d'examen
 */
export function isOverdueForReview(documentId: string): boolean {
  const metadata = getDocumentVersioning(documentId);
  if (!metadata || !metadata.prochainExamen) return false;

  const examDate = new Date(metadata.prochainExamen);
  const today = new Date();

  return examDate < today;
}

/**
 * Calcule l'âge d'un document en années
 */
export function getDocumentAgeYears(dateCreation: string): number {
  const created = new Date(dateCreation);
  const today = new Date();
  return (today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 365);
}

/**
 * Vérifie si un document réglementaire est trop ancien
 */
export function isRegulatoryDocumentTooOld(
  categorie: string,
  dateCreation: string
): boolean {
  const maxYears = DUREE_VALIDITE_PAR_CATEGORIE[categorie];
  if (maxYears === null) return false;

  const age = getDocumentAgeYears(dateCreation);
  return age > maxYears;
}

/**
 * Obtient le label du statut
 */
export function getStatusLabel(statut: DocumentValidityStatus): string {
  const labels: Record<DocumentValidityStatus, string> = {
    VALIDE: 'Valide',
    OBSOLETE: 'Obsolète',
    ARCHIVE: 'Archivé',
    BROUILLON: 'Brouillon',
  };
  return labels[statut];
}

/**
 * Obtient la couleur du statut
 */
export function getStatusColor(statut: DocumentValidityStatus): string {
  const colors: Record<DocumentValidityStatus, string> = {
    VALIDE: '#10B981',    // Vert
    OBSOLETE: '#EF4444',  // Rouge
    ARCHIVE: '#6B7280',   // Gris
    BROUILLON: '#F59E0B', // Orange
  };
  return colors[statut];
}

/**
 * Obtient le label du type de modification
 */
export function getModificationTypeLabel(type: ModificationType): string {
  const labels: Record<ModificationType, string> = {
    CREATION: 'Création',
    MODIFICATION_MINEURE: 'Modification mineure',
    MODIFICATION_MAJEURE: 'Modification majeure',
    REMPLACEMENT: 'Remplacement',
    ARCHIVAGE: 'Archivage',
    RESTAURATION: 'Restauration',
  };
  return labels[type];
}

/**
 * Génère le prochain numéro de version
 */
export function getNextVersion(
  currentVersion: string,
  modificationType: ModificationType
): string {
  const parts = currentVersion.split('.').map(Number);

  switch (modificationType) {
    case 'MODIFICATION_MAJEURE':
    case 'REMPLACEMENT':
      // Incrémenter version majeure (1.x -> 2.0)
      return `${parts[0] + 1}.0`;
    case 'MODIFICATION_MINEURE':
      // Incrémenter version mineure (1.0 -> 1.1)
      return `${parts[0]}.${(parts[1] || 0) + 1}`;
    default:
      return currentVersion;
  }
}

/**
 * Récupère tous les documents nécessitant une attention (obsolètes ou à réviser)
 */
export function getDocumentsNeedingAttention(): {
  obsolete: string[];
  needsReview: string[];
  overdue: string[];
} {
  const obsolete: string[] = [];
  const needsReviewList: string[] = [];
  const overdue: string[] = [];

  for (const [docId, metadata] of Object.entries(MOCK_DOCUMENT_VERSIONING)) {
    if (metadata.statut === 'OBSOLETE' && metadata.estVersionActive) {
      obsolete.push(docId);
    }
    if (needsReview(docId)) {
      needsReviewList.push(docId);
    }
    if (isOverdueForReview(docId)) {
      overdue.push(docId);
    }
  }

  return { obsolete, needsReview: needsReviewList, overdue };
}
