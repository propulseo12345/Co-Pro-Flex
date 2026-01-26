/**
 * Mock Data - Ventes / Mutations de lots
 *
 * @source Fusionné depuis :
 *   - src/data/mock/index.ts → MOCK_SALES (2)
 *   - src/components/features/ventes/VenteDetail/constants.ts → INITIAL_VENTE (1)
 * @created 2025-01-19
 *
 * Relations:
 * - copropriete_id → coproprietes.id
 * - lot_id → lots.id
 * - vendeur_coproprietaire_id → coproprietaires.id
 * - acquereur_coproprietaire_id → coproprietaires.id (si déjà copropriétaire)
 *
 * Notes:
 * - Workflow V2 en 6 étapes obligatoires (loi ELAN / ALUR)
 * - Documents obligatoires : Pré-état daté, État daté, Certificat Art. 20-II
 * - Traçabilité complète de l'historique des actions
 */

import { BaseEntity } from '../types';
import { COPROPRIETE_IDS } from './coproprietes';
import { LOT_IDS } from './lots';
import { COPROPRIETAIRE_IDS } from './coproprietaires';
import { USER_IDS } from './users';

// ============================================
// TYPES
// ============================================

export type VenteStatut =
  | 'en_cours'
  | 'finalisee'
  | 'annulee';

export type VenteEtapeWorkflow =
  | 'demande' // Demande de mutation
  | 'pre_etat_date' // Pré-état daté
  | 'etat_date' // État daté complet
  | 'envoi_notaire' // Transmission notaire
  | 'signature_acte' // Signature acte authentique
  | 'cloture_compte'; // Clôture compte vendeur

export type DocumentVenteType =
  | 'PRE_ETAT_DATE'
  | 'ETAT_DATE'
  | 'CERTIFICAT_ARTICLE_20'
  | 'COMPROMIS'
  | 'DIAGNOSTIC'
  | 'PV_AG'
  | 'ACTE_AUTHENTIQUE'
  | 'AUTRE';

export type DocumentVenteStatut =
  | 'EN_ATTENTE'
  | 'DISPONIBLE'
  | 'SIGNE'
  | 'ENVOYE'
  | 'EXPIRE';

export interface DocumentVente {
  id: string;
  type: DocumentVenteType;
  nom: string;
  statut: DocumentVenteStatut;
  obligatoire: boolean;
  date_upload?: string;
  date_signature?: string;
  date_envoi?: string;
  signe_par?: string;
  url?: string;
}

export interface HistoriqueVente {
  id: string;
  date: string;
  action: string;
  utilisateur: string;
  commentaire?: string;
}

export interface Partie {
  nom: string;
  prenom?: string;
  email?: string;
  telephone?: string;
}

export interface Notaire extends Partie {
  etude?: string;
  adresse?: string;
}

export interface ClotureCompte {
  solde_actuel: number;
  est_cloturable: boolean;
  cloture_manuelle_faite: boolean;
  date_cloture?: string;
}

export interface Vente extends BaseEntity {
  // FK Relations
  copropriete_id: string;
  lot_ids: string[]; // Peut inclure plusieurs lots (appart + cave)
  vendeur_coproprietaire_id: string;
  acquereur_coproprietaire_id?: string; // Si déjà copro

  // Référence
  reference: string; // "VEN-2024-001"

  // Vendeur
  vendeur: Partie & { impayes: number };

  // Acquéreur
  acquereur?: Partie;

  // Notaire
  notaire?: Notaire;

  // Montants
  prix_vente?: number;

  // Dates workflow
  date_notification: string; // Notification au syndic
  date_compromis?: string;
  date_acte_authentique?: string;
  date_mutation_effective?: string;

  // Pré-état daté & État daté
  pre_etat_date_demande?: string;
  pre_etat_date_envoi?: string;
  etat_date_demande?: string;
  etat_date_envoi?: string;

  // Oppositions (Art. 20 loi 10 juillet 1965)
  montant_opposition?: number; // Sommes dues par vendeur
  date_opposition?: string;

  // Workflow
  statut: VenteStatut;
  etape_workflow: VenteEtapeWorkflow;
  workflow_v2: boolean;

  // Dates par étape
  dates_etapes?: Partial<Record<VenteEtapeWorkflow, string>>;

  // Clôture compte
  cloture_compte?: ClotureCompte;

  // Documents
  documents: DocumentVente[];

  // Historique
  historique: HistoriqueVente[];

  // Notes
  observations?: string;
  notes_internes?: string;

  // Ordres de service liés
  ordres_service_ids?: string[];
}

// ============================================
// IDS PRÉGÉNÉRÉS
// ============================================

export const VENTE_IDS = {
  VENTE_C5_CAVE12: 'ven_11111111-1111-4111-8111-111111111111',
  VENTE_A2_MOREAU: 'ven_22222222-2222-4222-8222-222222222222',
  VENTE_LOT15_DUPONT: 'ven_33333333-3333-4333-8333-333333333333',
} as const;

// ============================================
// DONNÉES MOCK
// ============================================

export const VENTES_MOCK: Vente[] = [
  // ============================================
  // Vente 1 : C5 + Cave 12 (LAURENT → MOREAU)
  // Source: MOCK_SALES[0]
  // ============================================
  {
    id: VENTE_IDS.VENTE_C5_CAVE12,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    lot_ids: [LOT_IDS.C5, LOT_IDS.CAVE_12],
    vendeur_coproprietaire_id: COPROPRIETAIRE_IDS.LAURENT_SOPHIE,
    reference: 'VEN-2024-001',
    vendeur: {
      nom: 'DUBOIS',
      prenom: 'Isabelle',
      email: 'isabelle.dubois@example.fr',
      telephone: '06 55 66 77 88',
      impayes: 0,
    },
    acquereur: {
      nom: 'MOREAU',
      prenom: 'Claire',
      email: 'claire.moreau@example.fr',
      telephone: '06 77 88 99 00',
    },
    notaire: {
      nom: 'GIRARD',
      prenom: 'François',
      email: 'girard@notaires.fr',
      telephone: '01 45 67 89 10',
      etude: 'Office Notarial Girard & Associés',
    },
    prix_vente: 285000,
    date_notification: '2024-09-15',
    date_compromis: '2024-09-20',
    date_acte_authentique: '2024-12-15',
    pre_etat_date_demande: '2024-09-15',
    pre_etat_date_envoi: '2024-09-16',
    etat_date_demande: '2024-10-20',
    etat_date_envoi: '2024-10-25',
    statut: 'en_cours',
    etape_workflow: 'envoi_notaire',
    workflow_v2: true,
    dates_etapes: {
      demande: '2024-09-15T10:00:00',
      pre_etat_date: '2024-09-16T14:30:00',
      etat_date: '2024-10-25T10:00:00',
      envoi_notaire: '2024-10-26T09:15:00',
    },
    cloture_compte: {
      solde_actuel: 0,
      est_cloturable: true,
      cloture_manuelle_faite: false,
    },
    documents: [
      {
        id: 'doc-v1-1',
        type: 'PRE_ETAT_DATE',
        nom: 'Pré-état daté',
        statut: 'DISPONIBLE',
        obligatoire: true,
        date_upload: '2024-09-15',
      },
      {
        id: 'doc-v1-2',
        type: 'ETAT_DATE',
        nom: 'État daté définitif',
        statut: 'SIGNE',
        obligatoire: true,
        date_upload: '2024-10-25',
        date_signature: '2024-10-26',
        signe_par: 'Syndic',
      },
      {
        id: 'doc-v1-3',
        type: 'CERTIFICAT_ARTICLE_20',
        nom: 'Certificat article 20-II',
        statut: 'EN_ATTENTE',
        obligatoire: true,
        date_upload: '2024-10-25',
      },
      {
        id: 'doc-v1-4',
        type: 'DIAGNOSTIC',
        nom: 'Diagnostic amiante',
        statut: 'DISPONIBLE',
        obligatoire: true,
        date_upload: '2024-09-10',
      },
      {
        id: 'doc-v1-5',
        type: 'PV_AG',
        nom: 'PV AG 2023',
        statut: 'DISPONIBLE',
        obligatoire: false,
        date_upload: '2024-09-05',
      },
    ],
    historique: [
      {
        id: 'h1-1',
        date: '2024-09-15T10:00:00',
        action: 'Création de la vente',
        utilisateur: 'Syndic',
      },
      {
        id: 'h1-2',
        date: '2024-09-15T10:05:00',
        action: 'Génération du document: Pré-état daté',
        utilisateur: 'Système',
      },
      {
        id: 'h1-3',
        date: '2024-10-25T14:30:00',
        action: 'Génération du document: État daté définitif',
        utilisateur: 'Système',
      },
      {
        id: 'h1-4',
        date: '2024-10-26T09:15:00',
        action: 'Signature du document: État daté définitif',
        utilisateur: 'Syndic',
      },
    ],
    observations: 'Vente de l\'appartement C5 avec cave 12',
    created_at: '2024-09-15T10:00:00Z',
    updated_at: '2024-10-26T09:15:00Z',
  },

  // ============================================
  // Vente 2 : A2 (MOREAU - début de procédure)
  // Source: MOCK_SALES[1]
  // ============================================
  {
    id: VENTE_IDS.VENTE_A2_MOREAU,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    lot_ids: [LOT_IDS.A02],
    vendeur_coproprietaire_id: COPROPRIETAIRE_IDS.MOREAU_PIERRE,
    reference: 'VEN-2024-002',
    vendeur: {
      nom: 'MOREAU',
      prenom: 'Pierre',
      email: 'pierre.moreau@email.fr',
      telephone: '06 22 33 44 55',
      impayes: 250, // Solde négatif du copropriétaire
    },
    prix_vente: 195000,
    date_notification: '2024-10-20',
    pre_etat_date_demande: '2024-10-20',
    montant_opposition: 250, // Sommes dues
    statut: 'en_cours',
    etape_workflow: 'pre_etat_date',
    workflow_v2: true,
    dates_etapes: {
      demande: '2024-10-20T11:00:00',
    },
    cloture_compte: {
      solde_actuel: -250,
      est_cloturable: false,
      cloture_manuelle_faite: false,
    },
    documents: [
      {
        id: 'doc-v2-1',
        type: 'PRE_ETAT_DATE',
        nom: 'Pré-état daté',
        statut: 'DISPONIBLE',
        obligatoire: true,
        date_upload: '2024-10-20',
      },
    ],
    historique: [
      {
        id: 'h2-1',
        date: '2024-10-20T11:00:00',
        action: 'Création de la vente',
        utilisateur: 'Syndic',
      },
    ],
    notes_internes: 'Attention: impayé de 250€ à régulariser avant clôture',
    created_at: '2024-10-20T11:00:00Z',
    updated_at: '2024-10-20T11:00:00Z',
  },

  // ============================================
  // Vente 3 : Lot 15 (DUPONT - workflow avancé)
  // Source: VenteDetail/constants.ts → INITIAL_VENTE
  // ============================================
  {
    id: VENTE_IDS.VENTE_LOT15_DUPONT,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    lot_ids: [LOT_IDS.LOT_15],
    vendeur_coproprietaire_id: COPROPRIETAIRE_IDS.DUPONT_MARTIN,
    reference: 'VEN-2025-001',
    vendeur: {
      nom: 'DUPONT',
      prenom: 'Martin',
      email: 'martin.dupont@example.com',
      telephone: '06 12 34 56 78',
      impayes: 0,
    },
    acquereur: {
      nom: 'LEBLANC',
      prenom: 'Sophie',
      email: 'sophie.leblanc@example.com',
      telephone: '06 98 76 54 32',
    },
    notaire: {
      nom: 'BERNARD',
      prenom: 'François',
      email: 'bernard@notaire.fr',
      telephone: '01 23 45 67 89',
      etude: 'Étude Notariale Bernard',
    },
    prix_vente: 320000,
    date_notification: '2025-11-10',
    date_compromis: '2025-11-15',
    date_acte_authentique: '2026-01-20',
    pre_etat_date_demande: '2025-11-10',
    pre_etat_date_envoi: '2025-11-11',
    etat_date_demande: '2025-11-12',
    statut: 'en_cours',
    etape_workflow: 'etat_date',
    workflow_v2: true,
    dates_etapes: {
      demande: '2025-11-10T10:00:00',
      pre_etat_date: '2025-11-11T09:15:00',
    },
    cloture_compte: {
      solde_actuel: 0,
      est_cloturable: true,
      cloture_manuelle_faite: false,
    },
    documents: [
      {
        id: 'doc-v3-1',
        type: 'PRE_ETAT_DATE',
        nom: 'Pré-état daté',
        statut: 'SIGNE',
        obligatoire: true,
        date_upload: '2025-11-10',
        date_signature: '2025-11-11',
        signe_par: 'Syndic - Jean MARTIN',
      },
      {
        id: 'doc-v3-2',
        type: 'ETAT_DATE',
        nom: 'État daté',
        statut: 'EN_ATTENTE',
        obligatoire: true,
        date_upload: '2025-11-12',
      },
      {
        id: 'doc-v3-3',
        type: 'CERTIFICAT_ARTICLE_20',
        nom: 'Certificat article 20-II',
        statut: 'EN_ATTENTE',
        obligatoire: true,
        date_upload: '2025-11-12',
      },
      {
        id: 'doc-v3-4',
        type: 'COMPROMIS',
        nom: 'Compromis de vente signé',
        statut: 'DISPONIBLE',
        obligatoire: false,
        date_upload: '2025-11-15',
      },
      {
        id: 'doc-v3-5',
        type: 'DIAGNOSTIC',
        nom: 'Diagnostics techniques (DPE, Amiante, Plomb)',
        statut: 'EN_ATTENTE',
        obligatoire: true,
      },
    ],
    historique: [
      {
        id: 'h3-1',
        date: '2025-11-10T14:00:00',
        action: 'Création de la vente pour le Lot 15',
        utilisateur: 'Syndic - Jean MARTIN',
      },
      {
        id: 'h3-2',
        date: '2025-11-10T14:30:00',
        action:
          'Génération automatique : Pré-état daté, État daté, Certificat Art. 20-II',
        utilisateur: 'Système',
      },
      {
        id: 'h3-3',
        date: '2025-11-11T09:15:00',
        action: 'Signature du Pré-état daté',
        utilisateur: 'Syndic - Jean MARTIN',
      },
      {
        id: 'h3-4',
        date: '2025-11-15T16:00:00',
        action: 'Upload : Compromis de vente signé',
        utilisateur: 'Syndic - Jean MARTIN',
      },
    ],
    observations: 'Vente urgente - Priorité haute',
    notes_internes: 'Vérifier état des charges avant signature',
    ordres_service_ids: ['os_11111111-1111-4111-8111-111111111111'],
    created_at: '2025-11-10T14:00:00Z',
    updated_at: '2025-11-15T16:00:00Z',
  },
];

// ============================================
// STATISTIQUES
// ============================================

export const VENTES_STATS = {
  total: VENTES_MOCK.length,
  par_statut: {
    en_cours: VENTES_MOCK.filter((v) => v.statut === 'en_cours').length,
    finalisee: VENTES_MOCK.filter((v) => v.statut === 'finalisee').length,
    annulee: VENTES_MOCK.filter((v) => v.statut === 'annulee').length,
  },
  par_etape: {
    demande: VENTES_MOCK.filter((v) => v.etape_workflow === 'demande').length,
    pre_etat_date: VENTES_MOCK.filter((v) => v.etape_workflow === 'pre_etat_date')
      .length,
    etat_date: VENTES_MOCK.filter((v) => v.etape_workflow === 'etat_date').length,
    envoi_notaire: VENTES_MOCK.filter(
      (v) => v.etape_workflow === 'envoi_notaire'
    ).length,
    signature_acte: VENTES_MOCK.filter(
      (v) => v.etape_workflow === 'signature_acte'
    ).length,
    cloture_compte: VENTES_MOCK.filter(
      (v) => v.etape_workflow === 'cloture_compte'
    ).length,
  },
  montant_total_ventes: VENTES_MOCK.reduce(
    (sum, v) => sum + (v.prix_vente || 0),
    0
  ),
  avec_opposition: VENTES_MOCK.filter(
    (v) => v.montant_opposition && v.montant_opposition > 0
  ).length,
};

// ============================================
// TABLE DE CORRESPONDANCE (migration)
// ============================================

export const VENTE_ID_MAP: Record<string, string> = {
  '1': VENTE_IDS.VENTE_C5_CAVE12,
  '2': VENTE_IDS.VENTE_A2_MOREAU,
  INITIAL_VENTE: VENTE_IDS.VENTE_LOT15_DUPONT,
};

// ============================================
// WORKFLOW V2 - Étapes
// ============================================

export const WORKFLOW_STEPS_V2: {
  id: VenteEtapeWorkflow;
  label: string;
  labelCourt: string;
  description: string;
  obligatoire: boolean;
}[] = [
  {
    id: 'demande',
    label: 'Demande de mutation',
    labelCourt: 'Demande',
    description: 'Création et enregistrement de la vente',
    obligatoire: true,
  },
  {
    id: 'pre_etat_date',
    label: 'Pré-état daté',
    labelCourt: 'Pré-état daté',
    description: 'Document obligatoire - toujours requis',
    obligatoire: true,
  },
  {
    id: 'etat_date',
    label: 'État daté',
    labelCourt: 'État daté',
    description: 'État daté complet avec toutes les annexes',
    obligatoire: true,
  },
  {
    id: 'envoi_notaire',
    label: 'Envoi au notaire',
    labelCourt: 'Envoi notaire',
    description: 'Transmission de tous les documents au notaire',
    obligatoire: true,
  },
  {
    id: 'signature_acte',
    label: "Signature de l'acte",
    labelCourt: 'Signature acte',
    description: "Date de signature de l'acte authentique chez le notaire",
    obligatoire: true,
  },
  {
    id: 'cloture_compte',
    label: 'Clôture compte vendeur',
    labelCourt: 'Clôture compte',
    description: 'Vérification du solde et clôture du compte',
    obligatoire: true,
  },
];

// ============================================
// HELPERS
// ============================================

export function getVenteById(id: string): Vente | undefined {
  return VENTES_MOCK.find((v) => v.id === id);
}

export function getVentesByCopropriete(coproprieteId: string): Vente[] {
  return VENTES_MOCK.filter((v) => v.copropriete_id === coproprieteId);
}

export function getVentesEnCours(): Vente[] {
  return VENTES_MOCK.filter((v) => v.statut === 'en_cours');
}

export function getVentesByVendeur(vendeurId: string): Vente[] {
  return VENTES_MOCK.filter((v) => v.vendeur_coproprietaire_id === vendeurId);
}

export function getVentesAvecOpposition(): Vente[] {
  return VENTES_MOCK.filter(
    (v) => v.montant_opposition && v.montant_opposition > 0
  );
}

export function getProgressionWorkflow(vente: Vente): {
  etape_actuelle: number;
  total_etapes: number;
  pourcentage: number;
  prochaine_etape?: VenteEtapeWorkflow;
} {
  const etapes: VenteEtapeWorkflow[] = [
    'demande',
    'pre_etat_date',
    'etat_date',
    'envoi_notaire',
    'signature_acte',
    'cloture_compte',
  ];

  const indexActuel = etapes.indexOf(vente.etape_workflow);
  const prochaineEtape =
    indexActuel < etapes.length - 1 ? etapes[indexActuel + 1] : undefined;

  return {
    etape_actuelle: indexActuel + 1,
    total_etapes: etapes.length,
    pourcentage: Math.round(((indexActuel + 1) / etapes.length) * 100),
    prochaine_etape: prochaineEtape,
  };
}

export function getDocumentsManquants(vente: Vente): DocumentVente[] {
  return vente.documents.filter(
    (d) => d.obligatoire && d.statut === 'EN_ATTENTE'
  );
}

export function peutCloturerCompte(vente: Vente): boolean {
  return (
    vente.cloture_compte?.est_cloturable === true &&
    vente.cloture_compte?.solde_actuel === 0
  );
}
