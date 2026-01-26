/**
 * Service de liaison documents-entités
 *
 * Permet la liaison bidirectionnelle entre les documents de la GED
 * et les entités métier (Factures, Contrats, AG, OS, etc.)
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Types d'entités pouvant être liées à un document
 */
export type LinkedEntityType =
  | 'FACTURE'
  | 'CONTRAT'
  | 'ASSEMBLEE_GENERALE'
  | 'ORDRE_SERVICE'
  | 'APPEL_FONDS'
  | 'IMPAYE'
  | 'INTERVENTION'
  | 'VENTE'
  | 'COPROPRIETAIRE';

/**
 * Liaison document-entité
 */
export interface DocumentEntityLink {
  id: string;
  documentId: string;
  entityType: LinkedEntityType;
  entityId: string;
  createdAt: string;
  createdBy?: string;
  /** Données extraites automatiquement du document */
  extractedData?: ExtractedDocumentData;
  /** Confiance de la détection automatique (0-100) */
  confidence?: number;
}

/**
 * Données extraites automatiquement d'un document
 */
export interface ExtractedDocumentData {
  /** Type détecté du document */
  detectedType?: LinkedEntityType;
  /** Montant détecté (pour factures) */
  montant?: number;
  /** Date de document */
  dateDocument?: string;
  /** Numéro de facture/contrat */
  numero?: string;
  /** Fournisseur/Prestataire détecté */
  fournisseur?: string;
  /** Objet/Description */
  objet?: string;
  /** Période concernée */
  periode?: string;
}

/**
 * Suggestion de liaison
 */
export interface LinkSuggestion {
  entityType: LinkedEntityType;
  entityId: string;
  entityLabel: string;
  entitySubLabel?: string;
  confidence: number;
  reason: string;
}

/**
 * Configuration des modules liables
 */
export interface LinkableModule {
  type: LinkedEntityType;
  label: string;
  pluralLabel: string;
  icon: string;
  color: string;
  routeBase: string;
  /** Catégories de documents associées */
  documentCategories: string[];
  /** Patterns de noms de fichiers pour détection auto */
  filePatterns: RegExp[];
}

// ============================================================================
// CONFIGURATION DES MODULES LIABLES
// ============================================================================

export const LINKABLE_MODULES: LinkableModule[] = [
  {
    type: 'FACTURE',
    label: 'Facture',
    pluralLabel: 'Factures',
    icon: 'Receipt',
    color: '#F59E0B',
    routeBase: '/finance/factures',
    documentCategories: ['FACTURE'],
    filePatterns: [
      /facture/i,
      /invoice/i,
      /fact[.\-_]/i,
      /fac[.\-_]\d/i,
    ],
  },
  {
    type: 'CONTRAT',
    label: 'Contrat',
    pluralLabel: 'Contrats',
    icon: 'FileSignature',
    color: '#10B981',
    routeBase: '/maintenance/contracts',
    documentCategories: ['CONTRAT'],
    filePatterns: [
      /contrat/i,
      /contract/i,
      /ctr[.\-_]/i,
      /marché/i,
      /avenant/i,
    ],
  },
  {
    type: 'ASSEMBLEE_GENERALE',
    label: 'Assemblée Générale',
    pluralLabel: 'Assemblées Générales',
    icon: 'Users',
    color: '#3B82F6',
    routeBase: '/ag',
    documentCategories: ['PV_AG'],
    filePatterns: [
      /pv[.\-_]?ag/i,
      /assemblée/i,
      /assemblee/i,
      /convocation/i,
      /ordre[.\-_]?du[.\-_]?jour/i,
    ],
  },
  {
    type: 'ORDRE_SERVICE',
    label: 'Ordre de Service',
    pluralLabel: 'Ordres de Service',
    icon: 'ClipboardList',
    color: '#8B5CF6',
    routeBase: '/maintenance/ordres-service',
    documentCategories: ['ORDRE_SERVICE'],
    filePatterns: [
      /os[.\-_]?\d/i,
      /ordre[.\-_]?service/i,
      /intervention/i,
    ],
  },
  {
    type: 'APPEL_FONDS',
    label: 'Appel de Fonds',
    pluralLabel: 'Appels de Fonds',
    icon: 'Banknote',
    color: '#EC4899',
    routeBase: '/finance/appels-fonds',
    documentCategories: ['AUTRE'],
    filePatterns: [
      /appel[.\-_]?fonds/i,
      /appel[.\-_]?charges/i,
      /appel[.\-_]?provisionnelle?/i,
    ],
  },
  {
    type: 'IMPAYE',
    label: 'Dossier Impayé',
    pluralLabel: 'Dossiers Impayés',
    icon: 'AlertTriangle',
    color: '#EF4444',
    routeBase: '/ventes-impayes/impayes',
    documentCategories: ['CORRESPONDANCE'],
    filePatterns: [
      /impayé/i,
      /impaye/i,
      /mise[.\-_]?en[.\-_]?demeure/i,
      /relance/i,
      /commandement/i,
    ],
  },
  {
    type: 'INTERVENTION',
    label: 'Intervention',
    pluralLabel: 'Interventions',
    icon: 'Wrench',
    color: '#F97316',
    routeBase: '/maintenance/logbook',
    documentCategories: ['ORDRE_SERVICE', 'PHOTO'],
    filePatterns: [
      /intervention/i,
      /réparation/i,
      /reparation/i,
      /maintenance/i,
      /dépannage/i,
      /depannage/i,
    ],
  },
  {
    type: 'VENTE',
    label: 'Vente de Lot',
    pluralLabel: 'Ventes de Lots',
    icon: 'Home',
    color: '#06B6D4',
    routeBase: '/ventes-impayes/ventes',
    documentCategories: ['CORRESPONDANCE'],
    filePatterns: [
      /vente/i,
      /mutation/i,
      /article[.\-_]?6/i,
      /questionnaire[.\-_]?syndic/i,
      /notaire/i,
    ],
  },
  {
    type: 'COPROPRIETAIRE',
    label: 'Copropriétaire',
    pluralLabel: 'Copropriétaires',
    icon: 'User',
    color: '#6366F1',
    routeBase: '/coproprietaires',
    documentCategories: ['CORRESPONDANCE'],
    filePatterns: [
      /lot[.\-_]?\d/i,
      /copropriétaire/i,
      /coproprietaire/i,
    ],
  },
];

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

/**
 * Détecte automatiquement le type d'entité d'un document basé sur son nom et sa catégorie
 */
export function detectDocumentEntityType(
  fileName: string,
  category?: string
): { type: LinkedEntityType; confidence: number } | null {
  const normalizedName = fileName.toLowerCase();

  // D'abord essayer par catégorie (haute confiance)
  if (category) {
    const moduleByCategory = LINKABLE_MODULES.find(m =>
      m.documentCategories.includes(category)
    );
    if (moduleByCategory) {
      return { type: moduleByCategory.type, confidence: 85 };
    }
  }

  // Ensuite essayer par pattern de nom (confiance moyenne)
  for (const module of LINKABLE_MODULES) {
    for (const pattern of module.filePatterns) {
      if (pattern.test(normalizedName)) {
        return { type: module.type, confidence: 70 };
      }
    }
  }

  return null;
}

/**
 * Extrait des données automatiquement du nom de fichier
 */
export function extractDataFromFileName(fileName: string): ExtractedDocumentData {
  const data: ExtractedDocumentData = {};

  // Extraire le mois (pour factures périodiques)
  const moisMatch = fileName.match(/(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|jan|fév|mar|avr|mai|jun|jul|aoû|sep|oct|nov|déc)/i);
  if (moisMatch) {
    const moisMap: Record<string, string> = {
      'janvier': '01', 'jan': '01', 'février': '02', 'fév': '02',
      'mars': '03', 'mar': '03', 'avril': '04', 'avr': '04',
      'mai': '05', 'juin': '06', 'jun': '06', 'juillet': '07', 'jul': '07',
      'août': '08', 'aoû': '08', 'septembre': '09', 'sep': '09',
      'octobre': '10', 'oct': '10', 'novembre': '11', 'nov': '11',
      'décembre': '12', 'déc': '12'
    };
    const mois = moisMap[moisMatch[1].toLowerCase()];
    if (mois) {
      data.periode = mois;
    }
  }

  // Extraire l'année
  const anneeMatch = fileName.match(/20\d{2}/);
  if (anneeMatch) {
    if (data.periode) {
      data.dateDocument = `${anneeMatch[0]}-${data.periode}-01`;
    } else {
      data.dateDocument = `${anneeMatch[0]}-01-01`;
    }
  }

  // Extraire le trimestre
  const trimestreMatch = fileName.match(/T([1-4])/i);
  if (trimestreMatch) {
    const trimMap: Record<string, string> = { '1': '01', '2': '04', '3': '07', '4': '10' };
    data.periode = `T${trimestreMatch[1]}`;
    if (anneeMatch) {
      data.dateDocument = `${anneeMatch[0]}-${trimMap[trimestreMatch[1]]}-01`;
    }
  }

  // Extraire le numéro de facture/OS
  const numeroMatch = fileName.match(/n[°o]?\s?(\d{4}[-_]?\d{0,3})/i) ||
                      fileName.match(/(\d{4}[-_]\d{3})/);
  if (numeroMatch) {
    data.numero = numeroMatch[1];
  }

  // Extraire le fournisseur connu
  const fournisseurs = ['edf', 'engie', 'otis', 'veolia', 'suez', 'grdf', 'total', 'schindler', 'kone', 'thyssen'];
  for (const f of fournisseurs) {
    if (fileName.toLowerCase().includes(f)) {
      data.fournisseur = f.charAt(0).toUpperCase() + f.slice(1);
      break;
    }
  }

  return data;
}

/**
 * Obtenir les informations du module pour un type d'entité
 */
export function getLinkableModule(entityType: LinkedEntityType): LinkableModule | undefined {
  return LINKABLE_MODULES.find(m => m.type === entityType);
}

/**
 * Génère un label descriptif pour une entité liée
 */
export function formatEntityLabel(entityType: LinkedEntityType, entityData: Record<string, unknown>): string {
  const module = getLinkableModule(entityType);
  if (!module) return 'Entité inconnue';

  switch (entityType) {
    case 'FACTURE':
      return `${entityData.fournisseur || 'Facture'} - ${entityData.numero || entityData.id}`;
    case 'CONTRAT':
      return `${entityData.nom || entityData.type || 'Contrat'} - ${entityData.fournisseur || ''}`;
    case 'ASSEMBLEE_GENERALE':
      return `AG ${entityData.type || ''} - ${entityData.date || entityData.annee || ''}`;
    case 'ORDRE_SERVICE':
      return `OS n°${entityData.numero || entityData.id} - ${entityData.titre || ''}`;
    case 'APPEL_FONDS':
      return `Appel ${entityData.trimestre || ''} ${entityData.annee || ''}`;
    case 'IMPAYE':
      return `Impayé ${entityData.lot || ''} - ${entityData.montant || ''}€`;
    case 'INTERVENTION':
      return `${entityData.titre || 'Intervention'} - ${entityData.date || ''}`;
    case 'VENTE':
      return `Vente Lot ${entityData.lot || entityData.id}`;
    case 'COPROPRIETAIRE':
      return `${entityData.nom || 'Copropriétaire'} - Lot ${entityData.lot || ''}`;
    default:
      return module.label;
  }
}

// ============================================================================
// DONNÉES MOCKÉES - LIAISONS EXISTANTES
// ============================================================================

/**
 * Liaisons mockées entre documents et entités
 * Simule des liaisons déjà établies dans le système
 */
export const MOCK_DOCUMENT_LINKS: DocumentEntityLink[] = [
  // Liaisons Factures
  {
    id: 'link-1',
    documentId: 'fac-elec-2024-12',
    entityType: 'FACTURE',
    entityId: 'fac-001',
    createdAt: '2024-12-15T10:30:00',
    confidence: 95,
    extractedData: {
      detectedType: 'FACTURE',
      fournisseur: 'EDF',
      dateDocument: '2024-12-15',
      periode: 'Décembre 2024',
    },
  },
  {
    id: 'link-2',
    documentId: 'fac-gaz-2024-12',
    entityType: 'FACTURE',
    entityId: 'fac-002',
    createdAt: '2024-12-20T14:15:00',
    confidence: 92,
    extractedData: {
      detectedType: 'FACTURE',
      fournisseur: 'Engie',
      dateDocument: '2024-12-20',
      periode: 'Décembre 2024',
    },
  },
  {
    id: 'link-3',
    documentId: 'fac-eau-2024-t4',
    entityType: 'FACTURE',
    entityId: 'fac-003',
    createdAt: '2024-12-10T09:00:00',
    confidence: 88,
    extractedData: {
      detectedType: 'FACTURE',
      dateDocument: '2024-12-10',
      periode: 'T4 2024',
    },
  },
  // Liaisons Contrats
  {
    id: 'link-4',
    documentId: 'ctr-ascenseur-2023',
    entityType: 'CONTRAT',
    entityId: 'ctr-001',
    createdAt: '2023-04-01T11:00:00',
    confidence: 98,
    extractedData: {
      detectedType: 'CONTRAT',
      fournisseur: 'OTIS',
      objet: 'Maintenance Ascenseur',
    },
  },
  {
    id: 'link-5',
    documentId: 'ctr-chauffage-2024',
    entityType: 'CONTRAT',
    entityId: 'ctr-002',
    createdAt: '2024-09-01T10:00:00',
    confidence: 95,
    extractedData: {
      detectedType: 'CONTRAT',
      fournisseur: 'ENGIE',
      objet: 'Entretien Chaudière',
    },
  },
  {
    id: 'link-6',
    documentId: 'ctr-assur-2024',
    entityType: 'CONTRAT',
    entityId: 'ctr-003',
    createdAt: '2024-01-01T08:00:00',
    confidence: 97,
    extractedData: {
      detectedType: 'CONTRAT',
      objet: 'Assurance Immeuble',
    },
  },
  // Liaisons AG
  {
    id: 'link-7',
    documentId: 'pv-ag-2024',
    entityType: 'ASSEMBLEE_GENERALE',
    entityId: 'ag-001',
    createdAt: '2024-06-15T18:00:00',
    confidence: 100,
    extractedData: {
      detectedType: 'ASSEMBLEE_GENERALE',
      dateDocument: '2024-06-15',
    },
  },
  {
    id: 'link-8',
    documentId: 'convoc-ag-2024',
    entityType: 'ASSEMBLEE_GENERALE',
    entityId: 'ag-001',
    createdAt: '2024-05-01T09:00:00',
    confidence: 95,
    extractedData: {
      detectedType: 'ASSEMBLEE_GENERALE',
      dateDocument: '2024-05-01',
      objet: 'Convocation AG',
    },
  },
  // Liaisons OS
  {
    id: 'link-9',
    documentId: 'os-2024-001',
    entityType: 'ORDRE_SERVICE',
    entityId: 'os-001',
    createdAt: '2024-01-18T11:30:00',
    confidence: 100,
    extractedData: {
      detectedType: 'ORDRE_SERVICE',
      numero: '2024-001',
      objet: 'Réparation Ascenseur',
    },
  },
  {
    id: 'link-10',
    documentId: 'os-2024-002',
    entityType: 'ORDRE_SERVICE',
    entityId: 'os-002',
    createdAt: '2024-02-25T14:00:00',
    confidence: 100,
    extractedData: {
      detectedType: 'ORDRE_SERVICE',
      numero: '2024-002',
      objet: 'Fuite Chaufferie',
    },
  },
  // Liaisons Appels de Fonds
  {
    id: 'link-11',
    documentId: 'appel-fonds-q4-2024',
    entityType: 'APPEL_FONDS',
    entityId: 'af-001',
    createdAt: '2024-10-01T08:00:00',
    confidence: 90,
    extractedData: {
      detectedType: 'APPEL_FONDS',
      periode: 'T4 2024',
    },
  },
  // Liaisons Impayés
  {
    id: 'link-12',
    documentId: 'med-relance1-lot8',
    entityType: 'IMPAYE',
    entityId: 'imp-001',
    createdAt: '2024-04-15T10:00:00',
    confidence: 85,
    extractedData: {
      detectedType: 'IMPAYE',
      objet: 'Relance 1 - Lot 8',
    },
  },
  {
    id: 'link-13',
    documentId: 'med-relance2-lot8',
    entityType: 'IMPAYE',
    entityId: 'imp-001',
    createdAt: '2024-06-02T10:00:00',
    confidence: 85,
    extractedData: {
      detectedType: 'IMPAYE',
      objet: 'Relance 2 - Lot 8',
    },
  },
  {
    id: 'link-14',
    documentId: 'courr-huissier-lot8',
    entityType: 'IMPAYE',
    entityId: 'imp-001',
    createdAt: '2024-08-10T11:00:00',
    confidence: 90,
    extractedData: {
      detectedType: 'IMPAYE',
      objet: 'Commandement de payer - Lot 8',
    },
  },
  // Liaisons Interventions
  {
    id: 'link-15',
    documentId: 'fac-plomberie-2024',
    entityType: 'INTERVENTION',
    entityId: 'int-001',
    createdAt: '2024-02-28T16:00:00',
    confidence: 80,
    extractedData: {
      detectedType: 'INTERVENTION',
      objet: 'Réparation Fuite Chaufferie',
    },
  },
  {
    id: 'link-16',
    documentId: 'photo-sinistre-lot12',
    entityType: 'INTERVENTION',
    entityId: 'int-002',
    createdAt: '2024-03-08T09:30:00',
    confidence: 75,
    extractedData: {
      detectedType: 'INTERVENTION',
      objet: 'Dégât des eaux Lot 12',
    },
  },
  // Liaisons Ventes
  {
    id: 'link-17',
    documentId: 'courr-notaire-vente',
    entityType: 'VENTE',
    entityId: 'vente-001',
    createdAt: '2024-11-08T14:00:00',
    confidence: 92,
    extractedData: {
      detectedType: 'VENTE',
      objet: 'Attestation vente Lot 22',
    },
  },
];

// ============================================================================
// FONCTIONS D'ACCÈS AUX DONNÉES
// ============================================================================

/**
 * Obtenir les liaisons d'un document
 */
export function getDocumentLinks(documentId: string): DocumentEntityLink[] {
  return MOCK_DOCUMENT_LINKS.filter(l => l.documentId === documentId);
}

/**
 * Obtenir les documents liés à une entité
 */
export function getEntityDocuments(entityType: LinkedEntityType, entityId: string): DocumentEntityLink[] {
  return MOCK_DOCUMENT_LINKS.filter(l => l.entityType === entityType && l.entityId === entityId);
}

/**
 * Vérifier si un document a des liaisons
 */
export function hasDocumentLinks(documentId: string): boolean {
  return MOCK_DOCUMENT_LINKS.some(l => l.documentId === documentId);
}

/**
 * Compter les documents liés à une entité
 */
export function countEntityDocuments(entityType: LinkedEntityType, entityId: string): number {
  return MOCK_DOCUMENT_LINKS.filter(l => l.entityType === entityType && l.entityId === entityId).length;
}

/**
 * Statistiques des liaisons
 */
export function getLinksStats(): Record<LinkedEntityType, number> {
  const stats: Record<LinkedEntityType, number> = {
    FACTURE: 0,
    CONTRAT: 0,
    ASSEMBLEE_GENERALE: 0,
    ORDRE_SERVICE: 0,
    APPEL_FONDS: 0,
    IMPAYE: 0,
    INTERVENTION: 0,
    VENTE: 0,
    COPROPRIETAIRE: 0,
  };

  for (const link of MOCK_DOCUMENT_LINKS) {
    stats[link.entityType]++;
  }

  return stats;
}
