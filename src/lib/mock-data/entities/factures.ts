/**
 * Mock Data - Factures
 *
 * @source Migré depuis src/components/features/finance/Factures/data.ts
 * @created 2025-01-19
 *
 * Relations:
 * - copropriete_id → coproprietes.id
 * - fournisseur_id → fournisseurs.id
 * - compte_debite_id → comptes-bancaires.id
 * - categorie_comptable_id → categories-comptables.id
 * - ordre_service_id → ordres-service.id (optionnel)
 * - facture_origine_id → factures.id (pour avoirs)
 *
 * KPIs Dashboard à respecter :
 * - Factures à payer : ~9 735,50 € (EDF + Otis + Veolia + Martin BTP - Avoir)
 */

import { BaseEntity, FactureStatut, TypeDocument, MotifAvoir, TypeDepense } from '../types';
import { COPROPRIETE_IDS } from './coproprietes';
import { FOURNISSEUR_IDS } from './fournisseurs';
import { COMPTE_BANCAIRE_IDS } from './comptes-bancaires';
import { CATEGORIE_COMPTABLE_IDS } from './categories-comptables';

// ============================================
// TYPES
// ============================================

export interface Facture extends BaseEntity {
  // Relations
  copropriete_id: string;
  fournisseur_id: string;
  compte_debite_id?: string;
  categorie_comptable_id?: string;
  ordre_service_id?: string;
  facture_origine_id?: string; // Pour les avoirs

  // Identification
  reference: string;
  type_document: TypeDocument;

  // Dates
  date_facture: string;
  date_echeance: string;
  date_paiement?: string;

  // Montants
  montant_ht?: number;
  taux_tva?: number;
  montant_tva?: number;
  montant_ttc: number;

  // Catégorisation
  poste_budgetaire?: TypeDepense;
  motif_avoir?: MotifAvoir;

  // Statut
  statut: FactureStatut;

  // Documents
  fichier_url?: string;

  // Notes
  notes?: string;
}

// ============================================
// IDS PRÉGÉNÉRÉS
// ============================================

export const FACTURE_IDS = {
  EDF_JAN_2025: 'fac_11111111-1111-4111-8111-111111111111',
  VEOLIA_JAN_2025: 'fac_22222222-2222-4222-8222-222222222222',
  ALLIANZ_DEC_2024: 'fac_33333333-3333-4333-8333-333333333333',
  MARTIN_BTP_JAN_2025: 'fac_44444444-4444-4444-8444-444444444444',
  CLEANPRO_DEC_2024: 'fac_55555555-5555-4555-8555-555555555555',
  OTIS_JAN_2025: 'fac_66666666-6666-4666-8666-666666666666',
  AVOIR_MARTIN: 'fac_77777777-7777-4777-8777-777777777777',
  ENGIE_JAN_2025: 'fac_88888888-8888-4888-8888-888888888888',
  JARDILAND_JAN_2025: 'fac_99999999-9999-4999-8999-999999999999',
  CHAUFFAGE_EXPERT_NOV_2024: 'fac_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  PAYSAGISTE_SEPT_2024: 'fac_bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
} as const;

// ============================================
// DONNÉES MOCK
// ============================================

/**
 * Factures à payer (KPI Dashboard) :
 * - EDF: 1 245,50 €
 * - Veolia: 890,00 €
 * - Martin BTP: 5 600,00 € - 600,00 € (avoir) = 5 000,00 €
 * - Otis: 1 890,00 €
 * - Chauffage Expert: 520,00 €
 * - ENGIE: 756,30 € (à catégoriser)
 * - Jardiland: 320,00 € (à catégoriser)
 * Total : 10 621,80 € brut, 9 545,50 € net (hors à catégoriser)
 */
export const FACTURES_MOCK: Facture[] = [
  // === FACTURES À PAYER ===
  {
    id: FACTURE_IDS.EDF_JAN_2025,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    fournisseur_id: FOURNISSEUR_IDS.EDF,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C606,
    reference: 'EDF-2025-001',
    type_document: TypeDocument.FACTURE,
    date_facture: '2025-01-15',
    date_echeance: '2025-01-31',
    montant_ht: 1037.92,
    taux_tva: 20,
    montant_tva: 207.58,
    montant_ttc: 1245.50,
    poste_budgetaire: TypeDepense.ELECTRICITE,
    statut: FactureStatut.A_PAYER,
    fichier_url: '/documents/factures/edf-janvier-2025.pdf',
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: FACTURE_IDS.VEOLIA_JAN_2025,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    fournisseur_id: FOURNISSEUR_IDS.VEOLIA,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C606,
    reference: 'VEO-2025-012',
    type_document: TypeDocument.FACTURE,
    date_facture: '2025-01-10',
    date_echeance: '2025-01-20', // Échéance proche !
    montant_ht: 809.09,
    taux_tva: 10,
    montant_tva: 80.91,
    montant_ttc: 890.00,
    poste_budgetaire: TypeDepense.EAU,
    statut: FactureStatut.A_PAYER,
    fichier_url: '/documents/factures/veolia-janvier-2025.pdf',
    notes: 'Échéance proche - Priorité',
    created_at: '2025-01-10T10:00:00Z',
    updated_at: '2025-01-10T10:00:00Z',
  },
  {
    id: FACTURE_IDS.MARTIN_BTP_JAN_2025,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    fournisseur_id: FOURNISSEUR_IDS.MARTIN_BTP,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C615,
    reference: 'MAR-2025-789',
    type_document: TypeDocument.FACTURE,
    date_facture: '2025-01-05',
    date_echeance: '2025-01-10', // EN RETARD !
    montant_ht: 4666.67,
    taux_tva: 20,
    montant_tva: 933.33,
    montant_ttc: 5600.00,
    poste_budgetaire: TypeDepense.TRAVAUX,
    statut: FactureStatut.A_PAYER,
    fichier_url: '/documents/factures/martin-devis-2025.pdf',
    notes: 'EN RETARD - Avoir de 600€ à déduire',
    created_at: '2025-01-05T10:00:00Z',
    updated_at: '2025-01-10T10:00:00Z',
  },
  {
    id: FACTURE_IDS.AVOIR_MARTIN,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    fournisseur_id: FOURNISSEUR_IDS.MARTIN_BTP,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C615,
    facture_origine_id: FACTURE_IDS.MARTIN_BTP_JAN_2025,
    reference: 'AVO-MAR-2025-001',
    type_document: TypeDocument.AVOIR,
    date_facture: '2025-01-08',
    date_echeance: '2025-01-31',
    montant_ttc: 600.00,
    poste_budgetaire: TypeDepense.TRAVAUX,
    motif_avoir: MotifAvoir.ERREUR_FACTURATION,
    statut: FactureStatut.A_PAYER,
    fichier_url: '/documents/avoirs/avoir-martin-2025.pdf',
    notes: 'Remise suite erreur de facturation',
    created_at: '2025-01-08T10:00:00Z',
    updated_at: '2025-01-08T10:00:00Z',
  },
  {
    id: FACTURE_IDS.OTIS_JAN_2025,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    fournisseur_id: FOURNISSEUR_IDS.OTIS,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C615,
    reference: 'OTS-2025-654',
    type_document: TypeDocument.FACTURE,
    date_facture: '2025-01-12',
    date_echeance: '2025-02-28',
    montant_ht: 1575.00,
    taux_tva: 20,
    montant_tva: 315.00,
    montant_ttc: 1890.00,
    poste_budgetaire: TypeDepense.ASCENSEUR,
    statut: FactureStatut.A_PAYER,
    fichier_url: '/documents/factures/otis-maintenance-2025.pdf',
    created_at: '2025-01-12T10:00:00Z',
    updated_at: '2025-01-12T10:00:00Z',
  },
  {
    id: FACTURE_IDS.CHAUFFAGE_EXPERT_NOV_2024,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    fournisseur_id: FOURNISSEUR_IDS.CHAUFFAGE_EXPERT,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C615,
    ordre_service_id: 'os_33333333-3333-4333-8333-333333333333', // FK vers OS dépannage fuite
    reference: 'CHE-2024-089',
    type_document: TypeDocument.FACTURE,
    date_facture: '2024-11-05',
    date_echeance: '2024-12-05',
    montant_ht: 472.73,
    taux_tva: 10,
    montant_tva: 47.27,
    montant_ttc: 520.00,
    poste_budgetaire: TypeDepense.PLOMBERIE,
    statut: FactureStatut.A_PAYER,
    fichier_url: '/documents/factures/chauffage-expert-novembre-2024.pdf',
    notes: 'Liée à OS #3 - Dépannage fuite eau parking',
    created_at: '2024-11-05T10:00:00Z',
    updated_at: '2024-11-05T10:00:00Z',
  },

  // === FACTURES À CATÉGORISER ===
  {
    id: FACTURE_IDS.ENGIE_JAN_2025,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    fournisseur_id: FOURNISSEUR_IDS.EDF, // Utilise EDF comme placeholder
    reference: 'ENG-2025-001',
    type_document: TypeDocument.FACTURE,
    date_facture: '2025-01-16',
    date_echeance: '2025-02-15',
    montant_ttc: 756.30,
    statut: FactureStatut.A_CATEGORISER,
    fichier_url: '/documents/factures/engie-janvier-2025.pdf',
    notes: 'Nouveau fournisseur - À catégoriser',
    created_at: '2025-01-16T10:00:00Z',
    updated_at: '2025-01-16T10:00:00Z',
  },
  {
    id: FACTURE_IDS.JARDILAND_JAN_2025,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    fournisseur_id: FOURNISSEUR_IDS.PAYSAGISTE_EXPERT,
    reference: 'JAR-2025-042',
    type_document: TypeDocument.FACTURE,
    date_facture: '2025-01-14',
    date_echeance: '2025-02-14',
    montant_ttc: 320.00,
    statut: FactureStatut.A_CATEGORISER,
    fichier_url: '/documents/factures/jardiland-janvier-2025.pdf',
    created_at: '2025-01-14T10:00:00Z',
    updated_at: '2025-01-14T10:00:00Z',
  },

  // === FACTURES PAYÉES ===
  {
    id: FACTURE_IDS.ALLIANZ_DEC_2024,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    fournisseur_id: FOURNISSEUR_IDS.ALLIANZ,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C616,
    compte_debite_id: COMPTE_BANCAIRE_IDS.COURANT_PRINCIPAL,
    reference: 'ALL-2024-456',
    type_document: TypeDocument.FACTURE,
    date_facture: '2024-12-20',
    date_echeance: '2024-12-31',
    date_paiement: '2024-12-22',
    montant_ht: 2666.67,
    taux_tva: 20,
    montant_tva: 533.33,
    montant_ttc: 3200.00,
    poste_budgetaire: TypeDepense.ASSURANCE,
    statut: FactureStatut.PAYEE,
    created_at: '2024-12-20T10:00:00Z',
    updated_at: '2024-12-22T10:00:00Z',
  },
  {
    id: FACTURE_IDS.CLEANPRO_DEC_2024,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    fournisseur_id: FOURNISSEUR_IDS.CLEANPRO,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C614,
    compte_debite_id: COMPTE_BANCAIRE_IDS.COURANT_PRINCIPAL,
    reference: 'CLP-2024-321',
    type_document: TypeDocument.FACTURE,
    date_facture: '2024-12-28',
    date_echeance: '2025-01-31',
    date_paiement: '2024-12-30',
    montant_ht: 375.00,
    taux_tva: 20,
    montant_tva: 75.00,
    montant_ttc: 450.00,
    poste_budgetaire: TypeDepense.MENAGE,
    statut: FactureStatut.PAYEE,
    created_at: '2024-12-28T10:00:00Z',
    updated_at: '2024-12-30T10:00:00Z',
  },
  {
    id: FACTURE_IDS.PAYSAGISTE_SEPT_2024,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    fournisseur_id: FOURNISSEUR_IDS.PAYSAGISTE_EXPERT,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C614,
    compte_debite_id: COMPTE_BANCAIRE_IDS.COURANT_PRINCIPAL,
    ordre_service_id: 'os_44444444-4444-4444-8444-444444444444', // FK vers OS espaces verts
    reference: 'PAY-2024-156',
    type_document: TypeDocument.FACTURE,
    date_facture: '2024-09-25',
    date_echeance: '2024-10-25',
    date_paiement: '2024-10-15',
    montant_ht: 316.67,
    taux_tva: 20,
    montant_tva: 63.33,
    montant_ttc: 380.00,
    poste_budgetaire: TypeDepense.ESPACES_VERTS,
    statut: FactureStatut.PAYEE,
    fichier_url: '/documents/factures/paysagiste-expert-septembre-2024.pdf',
    notes: 'Liée à OS #4 - Entretien espaces verts automne',
    created_at: '2024-09-25T10:00:00Z',
    updated_at: '2024-10-15T10:00:00Z',
  },
];

// ============================================
// STATISTIQUES
// ============================================

const facturesAPayer = FACTURES_MOCK.filter(
  (f) => f.statut === FactureStatut.A_PAYER && f.type_document === TypeDocument.FACTURE
);
const avoirs = FACTURES_MOCK.filter((f) => f.type_document === TypeDocument.AVOIR);
const totalFacturesAPayer = facturesAPayer.reduce((acc, f) => acc + f.montant_ttc, 0);
const totalAvoirs = avoirs.reduce((acc, f) => acc + f.montant_ttc, 0);

export const FACTURES_STATS = {
  total: FACTURES_MOCK.length,
  par_statut: {
    a_payer: FACTURES_MOCK.filter((f) => f.statut === FactureStatut.A_PAYER).length,
    a_categoriser: FACTURES_MOCK.filter((f) => f.statut === FactureStatut.A_CATEGORISER).length,
    payee: FACTURES_MOCK.filter((f) => f.statut === FactureStatut.PAYEE).length,
  },
  par_type: {
    facture: FACTURES_MOCK.filter((f) => f.type_document === TypeDocument.FACTURE).length,
    avoir: FACTURES_MOCK.filter((f) => f.type_document === TypeDocument.AVOIR).length,
  },
  montant_total_a_payer: totalFacturesAPayer,
  montant_total_avoirs: totalAvoirs,
  montant_net_a_payer: totalFacturesAPayer - totalAvoirs, // KPI Dashboard
  factures_en_retard: FACTURES_MOCK.filter(
    (f) => f.statut === FactureStatut.A_PAYER && new Date(f.date_echeance) < new Date()
  ).length,
};

// ============================================
// TABLE DE CORRESPONDANCE
// ============================================

export const FACTURES_ID_MAP: Record<string, string> = {
  '1': FACTURE_IDS.EDF_JAN_2025,
  '2': FACTURE_IDS.VEOLIA_JAN_2025,
  '3': FACTURE_IDS.ALLIANZ_DEC_2024,
  '4': FACTURE_IDS.MARTIN_BTP_JAN_2025,
  '5': FACTURE_IDS.CLEANPRO_DEC_2024,
  '6': FACTURE_IDS.OTIS_JAN_2025,
  '7': FACTURE_IDS.AVOIR_MARTIN,
  '8': FACTURE_IDS.ENGIE_JAN_2025,
  '9': FACTURE_IDS.JARDILAND_JAN_2025,
  '10': FACTURE_IDS.CHAUFFAGE_EXPERT_NOV_2024,
  '11': FACTURE_IDS.PAYSAGISTE_SEPT_2024,
};

// ============================================
// HELPERS
// ============================================

export function getFactureById(id: string): Facture | undefined {
  return FACTURES_MOCK.find((f) => f.id === id);
}

export function getFacturesByStatut(statut: FactureStatut): Facture[] {
  return FACTURES_MOCK.filter((f) => f.statut === statut);
}

export function getFacturesAPayer(): Facture[] {
  return FACTURES_MOCK.filter(
    (f) => f.statut === FactureStatut.A_PAYER && f.type_document === TypeDocument.FACTURE
  );
}

export function getFacturesEnRetard(): Facture[] {
  const now = new Date();
  return FACTURES_MOCK.filter(
    (f) => f.statut === FactureStatut.A_PAYER && new Date(f.date_echeance) < now
  );
}

export function getFacturesByFournisseur(fournisseurId: string): Facture[] {
  return FACTURES_MOCK.filter((f) => f.fournisseur_id === fournisseurId);
}

export function getAvoirsByFacture(factureId: string): Facture[] {
  return FACTURES_MOCK.filter((f) => f.facture_origine_id === factureId);
}

export function getMontantNetFacture(facture: Facture): number {
  if (facture.type_document === TypeDocument.AVOIR) {
    return -facture.montant_ttc;
  }
  const avoirs = getAvoirsByFacture(facture.id);
  const totalAvoirs = avoirs.reduce((acc, a) => acc + a.montant_ttc, 0);
  return facture.montant_ttc - totalAvoirs;
}

export function getTotalFacturesAPayer(): number {
  return FACTURES_STATS.montant_net_a_payer;
}
