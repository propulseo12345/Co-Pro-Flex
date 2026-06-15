/**
 * Logique PURE de liaison documents <-> entités métier (GED).
 *
 * Ce module ne contient AUCUNE donnée mock et AUCUN accès Supabase : uniquement
 * la configuration des modules liables, la détection automatique du type d'entité
 * et l'extraction de métadonnées depuis le nom de fichier.
 *
 * Les accès à la base (création/lecture de liens) vivent dans `@/lib/documents/api`.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Types d'entités (vocabulaire legacy front, en MAJUSCULES) pouvant être liées à
 * un document. Le mapping vers l'enum canonique `document_entity_type` se fait
 * côté API (`ENTITY_TYPE_FROM_LEGACY`).
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
 * Données extraites automatiquement d'un document (heuristique sur le nom de fichier).
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
 * Configuration d'affichage et de détection d'un module liable.
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
    filePatterns: [/facture/i, /invoice/i, /fact[.\-_]/i, /fac[.\-_]\d/i],
  },
  {
    type: 'CONTRAT',
    label: 'Contrat',
    pluralLabel: 'Contrats',
    icon: 'FileSignature',
    color: '#10B981',
    routeBase: '/maintenance/contracts',
    documentCategories: ['CONTRAT'],
    filePatterns: [/contrat/i, /contract/i, /ctr[.\-_]/i, /marché/i, /avenant/i],
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
    filePatterns: [/os[.\-_]?\d/i, /ordre[.\-_]?service/i, /intervention/i],
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
    filePatterns: [/lot[.\-_]?\d/i, /copropriétaire/i, /coproprietaire/i],
  },
];

// ============================================================================
// MAPPING legacy (MAJUSCULES) <-> enum canonique document_entity_type
// ============================================================================

/**
 * Re-mappe un `entity_type` canonique (renvoyé par la base) vers le vocabulaire
 * legacy du front, pour retrouver le `LinkableModule` correspondant.
 *
 * NB : plusieurs valeurs legacy se rabattent sur le même enum canonique
 * (ex. INTERVENTION et ORDRE_SERVICE -> 'service_order' ; APPEL_FONDS et IMPAYE
 * -> 'other'), donc ce re-mapping retourne le type legacy le plus représentatif.
 */
const LINKED_ENTITY_TYPE_FROM_CANONICAL: Record<string, LinkedEntityType> = {
  supplier_invoice: 'FACTURE',
  contract: 'CONTRAT',
  ag: 'ASSEMBLEE_GENERALE',
  resolution: 'ASSEMBLEE_GENERALE',
  service_order: 'ORDRE_SERVICE',
  mutation: 'VENTE',
  coproprietaire: 'COPROPRIETAIRE',
};

export function linkedEntityTypeFromCanonical(
  canonical: string
): LinkedEntityType | null {
  return LINKED_ENTITY_TYPE_FROM_CANONICAL[canonical] ?? null;
}

// ============================================================================
// FONCTIONS UTILITAIRES (PURES)
// ============================================================================

/**
 * Détecte automatiquement le type d'entité d'un document à partir de son nom et
 * de sa catégorie. Retourne `null` si rien ne correspond.
 */
export function detectDocumentEntityType(
  fileName: string,
  category?: string
): { type: LinkedEntityType; confidence: number } | null {
  const normalizedName = fileName.toLowerCase();

  // D'abord par catégorie (haute confiance)
  if (category) {
    const moduleByCategory = LINKABLE_MODULES.find((m) =>
      m.documentCategories.includes(category)
    );
    if (moduleByCategory) {
      return { type: moduleByCategory.type, confidence: 85 };
    }
  }

  // Ensuite par pattern de nom (confiance moyenne)
  for (const mod of LINKABLE_MODULES) {
    for (const pattern of mod.filePatterns) {
      if (pattern.test(normalizedName)) {
        return { type: mod.type, confidence: 70 };
      }
    }
  }

  return null;
}

/**
 * Extrait des données (période, date, numéro, fournisseur) du nom de fichier.
 */
export function extractDataFromFileName(fileName: string): ExtractedDocumentData {
  const data: ExtractedDocumentData = {};

  const moisMatch = fileName.match(
    /(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|jan|fév|mar|avr|mai|jun|jul|aoû|sep|oct|nov|déc)/i
  );
  if (moisMatch) {
    const moisMap: Record<string, string> = {
      janvier: '01',
      jan: '01',
      février: '02',
      fév: '02',
      mars: '03',
      mar: '03',
      avril: '04',
      avr: '04',
      mai: '05',
      juin: '06',
      jun: '06',
      juillet: '07',
      jul: '07',
      août: '08',
      aoû: '08',
      septembre: '09',
      sep: '09',
      octobre: '10',
      oct: '10',
      novembre: '11',
      nov: '11',
      décembre: '12',
      déc: '12',
    };
    const mois = moisMap[moisMatch[1].toLowerCase()];
    if (mois) {
      data.periode = mois;
    }
  }

  const anneeMatch = fileName.match(/20\d{2}/);
  if (anneeMatch) {
    if (data.periode) {
      data.dateDocument = `${anneeMatch[0]}-${data.periode}-01`;
    } else {
      data.dateDocument = `${anneeMatch[0]}-01-01`;
    }
  }

  const trimestreMatch = fileName.match(/T([1-4])/i);
  if (trimestreMatch) {
    const trimMap: Record<string, string> = { '1': '01', '2': '04', '3': '07', '4': '10' };
    data.periode = `T${trimestreMatch[1]}`;
    if (anneeMatch) {
      data.dateDocument = `${anneeMatch[0]}-${trimMap[trimestreMatch[1]]}-01`;
    }
  }

  const numeroMatch =
    fileName.match(/n[°o]?\s?(\d{4}[-_]?\d{0,3})/i) || fileName.match(/(\d{4}[-_]\d{3})/);
  if (numeroMatch) {
    data.numero = numeroMatch[1];
  }

  const fournisseurs = [
    'edf',
    'engie',
    'otis',
    'veolia',
    'suez',
    'grdf',
    'total',
    'schindler',
    'kone',
    'thyssen',
  ];
  for (const f of fournisseurs) {
    if (fileName.toLowerCase().includes(f)) {
      data.fournisseur = f.charAt(0).toUpperCase() + f.slice(1);
      break;
    }
  }

  return data;
}

/**
 * Retourne la configuration du module pour un type d'entité legacy donné.
 */
export function getLinkableModule(entityType: LinkedEntityType): LinkableModule | undefined {
  return LINKABLE_MODULES.find((m) => m.type === entityType);
}
