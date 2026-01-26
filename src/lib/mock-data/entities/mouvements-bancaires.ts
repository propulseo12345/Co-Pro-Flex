/**
 * Mock Data - Mouvements Bancaires
 *
 * @source Fusionné depuis :
 *   - src/app/(dashboard)/finance/mouvements-bancaires/page.tsx → MOCK_MOUVEMENTS_BASE
 *   - src/components/features/finance/Comptabilite/data.ts → journaux
 * @created 2025-01-19
 *
 * Relations:
 * - compte_bancaire_id → comptes-bancaires.id
 * - facture_id → factures.id (optionnel)
 * - appel_fonds_id → appels-fonds.id (optionnel)
 * - coproprietaire_id → coproprietaires.id (optionnel)
 * - fournisseur_id → fournisseurs.id (optionnel)
 *
 * KPIs Dashboard à respecter :
 * - Solde disponible : 10 533,31 €
 * - Fonds travaux : 28 450,00 €
 */

import { BaseEntity } from '../types';
import { COMPTE_BANCAIRE_IDS } from './comptes-bancaires';
import { FACTURE_IDS } from './factures';
import { APPEL_FONDS_IDS } from './appels-fonds';
import { COPROPRIETAIRE_IDS } from './coproprietaires';
import { FOURNISSEUR_IDS } from './fournisseurs';
import { CATEGORIE_COMPTABLE_IDS } from './categories-comptables';

// ============================================
// TYPES
// ============================================

export type TypeMouvement = 'ENTREE' | 'SORTIE';
export type StatutMouvement = 'EN_ATTENTE' | 'VALIDE' | 'RAPPROCHE' | 'ANNULE';
export type SourceMouvement = 'MANUEL' | 'IMPORT_BANQUE' | 'PRELEVEMENT' | 'VIREMENT_AUTO';

export type TypeEntiteLiee = 'facture' | 'appel_fonds' | 'coproprietaire' | 'fournisseur';

export interface EntiteLiee {
  type: TypeEntiteLiee;
  id: string;
  nom: string;
  reference?: string;
  montant?: number;
  details?: {
    // Pour facture
    date_echeance?: string;
    statut?: string;
    // Pour appel de fonds
    periode?: string;
    lot?: string;
    tantiemes?: number;
    // Pour coproprietaire
    email?: string;
    telephone?: string;
  };
}

export interface MouvementBancaire extends BaseEntity {
  // Relations
  compte_bancaire_id: string;
  categorie_comptable_id?: string;
  facture_id?: string;
  appel_fonds_id?: string;
  coproprietaire_id?: string;
  fournisseur_id?: string;

  // Identification
  reference?: string;
  date: string;
  date_valeur?: string;
  libelle: string;

  // Montant
  montant: number; // Positif = entrée, Négatif = sortie
  type: TypeMouvement;

  // Catégorisation
  is_categorise: boolean;
  compte_comptable?: string; // Code compte (ex: "606", "701")
  compte_comptable_label?: string;
  categorie?: 'charge' | 'produit' | '';

  // Entité liée (enrichi)
  entite_liee?: EntiteLiee;

  // Statut
  statut: StatutMouvement;
  source: SourceMouvement;

  // Rapprochement
  is_rapproche: boolean;
  date_rapprochement?: string;

  // Notes
  notes?: string;
}

// ============================================
// IDS PRÉGÉNÉRÉS
// ============================================

export const MOUVEMENT_BANCAIRE_IDS = {
  // Janvier 2025 - Compte courant
  MVT_2025_001: 'mvt_11111111-1111-4111-8111-111111111111',
  MVT_2025_002: 'mvt_22222222-2222-4222-8222-222222222222',
  MVT_2025_003: 'mvt_33333333-3333-4333-8333-333333333333',
  MVT_2025_004: 'mvt_44444444-4444-4444-8444-444444444444',
  MVT_2025_005: 'mvt_55555555-5555-4555-8555-555555555555',
  MVT_2025_006: 'mvt_66666666-6666-4666-8666-666666666666',
  MVT_2025_007: 'mvt_77777777-7777-4777-8777-777777777777',
  MVT_2025_008: 'mvt_88888888-8888-4888-8888-888888888888',
  MVT_2025_009: 'mvt_99999999-9999-4999-8999-999999999999',
  MVT_2025_010: 'mvt_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  // Décembre 2024
  MVT_2024_011: 'mvt_bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  MVT_2024_012: 'mvt_cccccccc-cccc-4ccc-8ccc-cccccccccccc',
} as const;

// ============================================
// DONNÉES MOCK - COMPTE COURANT
// ============================================

/**
 * Calcul du solde :
 * - Solde cible (KPI Dashboard) : 10 533,31 €
 * - Les mouvements doivent aboutir à ce solde
 *
 * Solde initial au 01/01/2025 : 8 000,00 €
 * + Entrées janvier : +7 312,50 € (appels de fonds)
 * - Sorties janvier : -4 779,19 € (factures payées)
 * = Solde au 19/01/2025 : 10 533,31 €
 */
export const MOUVEMENTS_BANCAIRES_MOCK: MouvementBancaire[] = [
  // === JANVIER 2025 - ENTRÉES (Appels de fonds) ===
  {
    id: MOUVEMENT_BANCAIRE_IDS.MVT_2025_001,
    compte_bancaire_id: COMPTE_BANCAIRE_IDS.COURANT_PRINCIPAL,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C701,
    appel_fonds_id: APPEL_FONDS_IDS.FONCT_T1_2025,
    coproprietaire_id: COPROPRIETAIRE_IDS.LEBLANC_MARIE,
    reference: 'VIR-2025-001',
    date: '2025-01-10',
    date_valeur: '2025-01-10',
    libelle: 'VIREMENT LEBLANC MARIE APPEL DE FONDS T1',
    montant: 328.13,
    type: 'ENTREE',
    is_categorise: true,
    compte_comptable: '701',
    compte_comptable_label: 'Appels de fonds',
    categorie: 'produit',
    entite_liee: {
      type: 'appel_fonds',
      id: APPEL_FONDS_IDS.FONCT_T1_2025,
      nom: 'LEBLANC Marie',
      reference: 'AF-2025-001',
      montant: 328.13,
      details: { periode: 'T1 2025', lot: 'A01', tantiemes: 150 },
    },
    statut: 'RAPPROCHE',
    source: 'VIREMENT_AUTO',
    is_rapproche: true,
    date_rapprochement: '2025-01-12',
    created_at: '2025-01-10T09:00:00Z',
    updated_at: '2025-01-12T10:00:00Z',
  },
  {
    id: MOUVEMENT_BANCAIRE_IDS.MVT_2025_002,
    compte_bancaire_id: COMPTE_BANCAIRE_IDS.COURANT_PRINCIPAL,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C701,
    appel_fonds_id: APPEL_FONDS_IDS.FONCT_T1_2025,
    coproprietaire_id: COPROPRIETAIRE_IDS.DUPONT_MARTIN,
    reference: 'CHQ-78456',
    date: '2025-01-08',
    libelle: 'REMISE CHEQUE DUPONT MARTIN CHARGES T1',
    montant: 393.75,
    type: 'ENTREE',
    is_categorise: true,
    compte_comptable: '701',
    compte_comptable_label: 'Appels de fonds',
    categorie: 'produit',
    entite_liee: {
      type: 'appel_fonds',
      id: APPEL_FONDS_IDS.FONCT_T1_2025,
      nom: 'DUPONT Martin',
      reference: 'AF-2025-001',
      montant: 393.75,
      details: { periode: 'T1 2025', lot: 'B02', tantiemes: 180 },
    },
    statut: 'RAPPROCHE',
    source: 'MANUEL',
    is_rapproche: true,
    date_rapprochement: '2025-01-10',
    created_at: '2025-01-08T14:00:00Z',
    updated_at: '2025-01-10T10:00:00Z',
  },
  {
    id: MOUVEMENT_BANCAIRE_IDS.MVT_2025_003,
    compte_bancaire_id: COMPTE_BANCAIRE_IDS.COURANT_PRINCIPAL,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C701,
    appel_fonds_id: APPEL_FONDS_IDS.FONCT_T1_2025,
    coproprietaire_id: COPROPRIETAIRE_IDS.SCI_LES_ORMES,
    reference: 'PREL-2025-001',
    date: '2025-01-11',
    libelle: 'PRELEVEMENT SCI LES ORMES CHARGES T1',
    montant: 656.25,
    type: 'ENTREE',
    is_categorise: true,
    compte_comptable: '701',
    compte_comptable_label: 'Appels de fonds',
    categorie: 'produit',
    entite_liee: {
      type: 'appel_fonds',
      id: APPEL_FONDS_IDS.FONCT_T1_2025,
      nom: 'SCI Les Ormes',
      reference: 'AF-2025-001',
      montant: 656.25,
      details: { periode: 'T1 2025', lot: 'C01', tantiemes: 300 },
    },
    statut: 'RAPPROCHE',
    source: 'PRELEVEMENT',
    is_rapproche: true,
    date_rapprochement: '2025-01-13',
    created_at: '2025-01-11T06:00:00Z',
    updated_at: '2025-01-13T10:00:00Z',
  },
  {
    id: MOUVEMENT_BANCAIRE_IDS.MVT_2025_004,
    compte_bancaire_id: COMPTE_BANCAIRE_IDS.COURANT_PRINCIPAL,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C701,
    appel_fonds_id: APPEL_FONDS_IDS.FONCT_T1_2025,
    coproprietaire_id: COPROPRIETAIRE_IDS.MOREAU_PIERRE,
    reference: 'VIR-2025-002',
    date: '2025-01-12',
    libelle: 'VIREMENT MOREAU PIERRE APPEL FONDS T1 PARTIEL',
    montant: 200.00,
    type: 'ENTREE',
    is_categorise: true,
    compte_comptable: '701',
    compte_comptable_label: 'Appels de fonds',
    categorie: 'produit',
    entite_liee: {
      type: 'appel_fonds',
      id: APPEL_FONDS_IDS.FONCT_T1_2025,
      nom: 'MOREAU Pierre',
      reference: 'AF-2025-001',
      montant: 200.00,
      details: { periode: 'T1 2025', lot: 'A02', tantiemes: 120 },
    },
    statut: 'RAPPROCHE',
    source: 'VIREMENT_AUTO',
    is_rapproche: true,
    date_rapprochement: '2025-01-14',
    notes: 'Paiement partiel - Relance en cours',
    created_at: '2025-01-12T10:00:00Z',
    updated_at: '2025-01-14T10:00:00Z',
  },
  // Autres paiements copropriétaires
  {
    id: MOUVEMENT_BANCAIRE_IDS.MVT_2025_005,
    compte_bancaire_id: COMPTE_BANCAIRE_IDS.COURANT_PRINCIPAL,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C701,
    appel_fonds_id: APPEL_FONDS_IDS.FONCT_T1_2025,
    coproprietaire_id: COPROPRIETAIRE_IDS.DUBOIS_JEAN,
    date: '2025-01-09',
    libelle: 'VIREMENT DUBOIS JEAN CHARGES T1 2025',
    montant: 214.38,
    type: 'ENTREE',
    is_categorise: true,
    compte_comptable: '701',
    compte_comptable_label: 'Appels de fonds',
    categorie: 'produit',
    statut: 'RAPPROCHE',
    source: 'VIREMENT_AUTO',
    is_rapproche: true,
    date_rapprochement: '2025-01-11',
    created_at: '2025-01-09T08:00:00Z',
    updated_at: '2025-01-11T10:00:00Z',
  },
  {
    id: MOUVEMENT_BANCAIRE_IDS.MVT_2025_006,
    compte_bancaire_id: COMPTE_BANCAIRE_IDS.COURANT_PRINCIPAL,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C701,
    appel_fonds_id: APPEL_FONDS_IDS.FONCT_T1_2025,
    coproprietaire_id: COPROPRIETAIRE_IDS.MARTIN_ANNE,
    date: '2025-01-10',
    libelle: 'VIREMENT MARTIN ANNE CHARGES T1 2025',
    montant: 295.31,
    type: 'ENTREE',
    is_categorise: true,
    compte_comptable: '701',
    compte_comptable_label: 'Appels de fonds',
    categorie: 'produit',
    statut: 'RAPPROCHE',
    source: 'VIREMENT_AUTO',
    is_rapproche: true,
    date_rapprochement: '2025-01-12',
    created_at: '2025-01-10T11:00:00Z',
    updated_at: '2025-01-12T10:00:00Z',
  },
  {
    id: MOUVEMENT_BANCAIRE_IDS.MVT_2025_007,
    compte_bancaire_id: COMPTE_BANCAIRE_IDS.COURANT_PRINCIPAL,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C701,
    appel_fonds_id: APPEL_FONDS_IDS.FONCT_T1_2025,
    coproprietaire_id: COPROPRIETAIRE_IDS.BERNARD_FRANCOIS,
    reference: 'CHQ-78460',
    date: '2025-01-08',
    libelle: 'REMISE CHEQUE BERNARD FRANCOIS CHARGES T1',
    montant: 273.44,
    type: 'ENTREE',
    is_categorise: true,
    compte_comptable: '701',
    compte_comptable_label: 'Appels de fonds',
    categorie: 'produit',
    statut: 'RAPPROCHE',
    source: 'MANUEL',
    is_rapproche: true,
    date_rapprochement: '2025-01-10',
    created_at: '2025-01-08T15:00:00Z',
    updated_at: '2025-01-10T10:00:00Z',
  },
  // === JANVIER 2025 - SORTIES (Paiements factures) ===
  {
    id: MOUVEMENT_BANCAIRE_IDS.MVT_2025_008,
    compte_bancaire_id: COMPTE_BANCAIRE_IDS.COURANT_PRINCIPAL,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C606,
    facture_id: FACTURE_IDS.EDF_JAN_2025,
    fournisseur_id: FOURNISSEUR_IDS.EDF,
    reference: 'PREL-EDF-2025-01',
    date: '2025-01-18',
    date_valeur: '2025-01-18',
    libelle: 'PRELEVEMENT EDF ELECTRICITE JANVIER 2025',
    montant: -1245.50,
    type: 'SORTIE',
    is_categorise: true,
    compte_comptable: '606',
    compte_comptable_label: 'Eau et électricité',
    categorie: 'charge',
    entite_liee: {
      type: 'facture',
      id: FACTURE_IDS.EDF_JAN_2025,
      nom: 'EDF',
      reference: 'EDF-2025-00123',
      montant: 1245.50,
      details: { date_echeance: '2025-01-25', statut: 'PAYEE' },
    },
    statut: 'RAPPROCHE',
    source: 'PRELEVEMENT',
    is_rapproche: true,
    date_rapprochement: '2025-01-19',
    created_at: '2025-01-18T06:00:00Z',
    updated_at: '2025-01-19T10:00:00Z',
  },
  {
    id: MOUVEMENT_BANCAIRE_IDS.MVT_2025_009,
    compte_bancaire_id: COMPTE_BANCAIRE_IDS.COURANT_PRINCIPAL,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C606,
    facture_id: FACTURE_IDS.VEOLIA_JAN_2025,
    fournisseur_id: FOURNISSEUR_IDS.VEOLIA,
    reference: 'PREL-VEOLIA-2025-01',
    date: '2025-01-12',
    libelle: 'PRELEVEMENT VEOLIA EAU DECEMBRE 2024',
    montant: -890.00,
    type: 'SORTIE',
    is_categorise: true,
    compte_comptable: '606',
    compte_comptable_label: 'Eau et électricité',
    categorie: 'charge',
    entite_liee: {
      type: 'facture',
      id: FACTURE_IDS.VEOLIA_JAN_2025,
      nom: 'VEOLIA',
      reference: 'VEO-2024-45678',
      montant: 890.00,
      details: { date_echeance: '2025-01-20', statut: 'PAYEE' },
    },
    statut: 'RAPPROCHE',
    source: 'PRELEVEMENT',
    is_rapproche: true,
    date_rapprochement: '2025-01-14',
    created_at: '2025-01-12T06:00:00Z',
    updated_at: '2025-01-14T10:00:00Z',
  },
  {
    id: MOUVEMENT_BANCAIRE_IDS.MVT_2025_010,
    compte_bancaire_id: COMPTE_BANCAIRE_IDS.COURANT_PRINCIPAL,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C615,
    facture_id: FACTURE_IDS.OTIS_JAN_2025,
    fournisseur_id: FOURNISSEUR_IDS.OTIS,
    reference: 'PREL-OTIS-2025-01',
    date: '2025-01-08',
    libelle: 'PRELEVEMENT OTIS MAINTENANCE ASCENSEUR JAN 2025',
    montant: -1890.00,
    type: 'SORTIE',
    is_categorise: true,
    compte_comptable: '615',
    compte_comptable_label: 'Entretien et réparations',
    categorie: 'charge',
    entite_liee: {
      type: 'facture',
      id: FACTURE_IDS.OTIS_JAN_2025,
      nom: 'OTIS',
      reference: 'OTIS-2025-0042',
      montant: 1890.00,
      details: { date_echeance: '2025-01-15', statut: 'PAYEE' },
    },
    statut: 'RAPPROCHE',
    source: 'PRELEVEMENT',
    is_rapproche: true,
    date_rapprochement: '2025-01-10',
    created_at: '2025-01-08T06:00:00Z',
    updated_at: '2025-01-10T10:00:00Z',
  },
  // === Mouvement non catégorisé (pour test) ===
  {
    id: MOUVEMENT_BANCAIRE_IDS.MVT_2024_011,
    compte_bancaire_id: COMPTE_BANCAIRE_IDS.COURANT_PRINCIPAL,
    date: '2025-01-05',
    libelle: 'VIREMENT ENTRANT REF 12345',
    montant: 753.69,
    type: 'ENTREE',
    is_categorise: false,
    statut: 'VALIDE',
    source: 'IMPORT_BANQUE',
    is_rapproche: false,
    notes: 'À identifier et catégoriser',
    created_at: '2025-01-05T10:00:00Z',
    updated_at: '2025-01-05T10:00:00Z',
  },
  // === Décembre 2024 - Mouvement antérieur ===
  {
    id: MOUVEMENT_BANCAIRE_IDS.MVT_2024_012,
    compte_bancaire_id: COMPTE_BANCAIRE_IDS.COURANT_PRINCIPAL,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C616,
    facture_id: FACTURE_IDS.ALLIANZ_DEC_2024,
    fournisseur_id: FOURNISSEUR_IDS.ALLIANZ,
    reference: 'PREL-AXA-2025-01',
    date: '2025-01-02',
    libelle: 'PRELEVEMENT AXA PRIME ASSURANCE 2025',
    montant: -753.69,
    type: 'SORTIE',
    is_categorise: true,
    compte_comptable: '616',
    compte_comptable_label: "Primes d'assurance",
    categorie: 'charge',
    entite_liee: {
      type: 'facture',
      id: FACTURE_IDS.ALLIANZ_DEC_2024,
      nom: 'AXA',
      reference: 'AXA-2025-IMM-001',
      montant: 3200.00, // Montant total annuel
      details: { date_echeance: '2025-01-05', statut: 'PAYEE' },
    },
    statut: 'RAPPROCHE',
    source: 'PRELEVEMENT',
    is_rapproche: true,
    date_rapprochement: '2025-01-05',
    notes: 'Mensualité assurance immeuble',
    created_at: '2025-01-02T06:00:00Z',
    updated_at: '2025-01-05T10:00:00Z',
  },
];

// ============================================
// CALCUL SOLDE
// ============================================

/**
 * Solde initial au 01/01/2025 pour atteindre KPI 10 533,31 €
 *
 * Entrées janvier :
 *   328.13 + 393.75 + 656.25 + 200.00 + 214.38 + 295.31 + 273.44 + 753.69 = 3 114,95 €
 *
 * Sorties janvier :
 *   1245.50 + 890.00 + 1890.00 + 753.69 = 4 779,19 €
 *
 * Net = 3 114,95 - 4 779,19 = -1 664,24 €
 * Solde initial = 10 533,31 + 1 664,24 = 12 197,55 €
 */
export const SOLDE_INITIAL_COURANT = 12197.55;

/**
 * Calcule le solde actuel à partir du solde initial et des mouvements
 */
export function calculerSoldeActuel(compteId: string): number {
  const mouvements = MOUVEMENTS_BANCAIRES_MOCK.filter(
    (m) => m.compte_bancaire_id === compteId
  );

  let solde = SOLDE_INITIAL_COURANT;
  for (const mvt of mouvements) {
    solde += mvt.montant;
  }
  return Math.round(solde * 100) / 100;
}

// ============================================
// STATISTIQUES
// ============================================

export const MOUVEMENTS_BANCAIRES_STATS = {
  total: MOUVEMENTS_BANCAIRES_MOCK.length,
  par_type: {
    entree: MOUVEMENTS_BANCAIRES_MOCK.filter((m) => m.type === 'ENTREE').length,
    sortie: MOUVEMENTS_BANCAIRES_MOCK.filter((m) => m.type === 'SORTIE').length,
  },
  par_statut: {
    rapproche: MOUVEMENTS_BANCAIRES_MOCK.filter((m) => m.is_rapproche).length,
    non_rapproche: MOUVEMENTS_BANCAIRES_MOCK.filter((m) => !m.is_rapproche).length,
  },
  categorises: MOUVEMENTS_BANCAIRES_MOCK.filter((m) => m.is_categorise).length,
  non_categorises: MOUVEMENTS_BANCAIRES_MOCK.filter((m) => !m.is_categorise).length,
  total_entrees: MOUVEMENTS_BANCAIRES_MOCK.filter((m) => m.type === 'ENTREE').reduce(
    (acc, m) => acc + m.montant,
    0
  ),
  total_sorties: Math.abs(
    MOUVEMENTS_BANCAIRES_MOCK.filter((m) => m.type === 'SORTIE').reduce(
      (acc, m) => acc + m.montant,
      0
    )
  ),
  // KPI Dashboard
  solde_calcule: calculerSoldeActuel(COMPTE_BANCAIRE_IDS.COURANT_PRINCIPAL),
};

// ============================================
// TABLE DE CORRESPONDANCE
// ============================================

export const MOUVEMENTS_BANCAIRES_ID_MAP: Record<string, string> = {
  '1': MOUVEMENT_BANCAIRE_IDS.MVT_2025_001,
  '2': MOUVEMENT_BANCAIRE_IDS.MVT_2025_002,
  '3': MOUVEMENT_BANCAIRE_IDS.MVT_2025_003,
  '4': MOUVEMENT_BANCAIRE_IDS.MVT_2025_004,
  '5': MOUVEMENT_BANCAIRE_IDS.MVT_2025_005,
  '6': MOUVEMENT_BANCAIRE_IDS.MVT_2025_006,
};

// ============================================
// HELPERS
// ============================================

export function getMouvementById(id: string): MouvementBancaire | undefined {
  return MOUVEMENTS_BANCAIRES_MOCK.find((m) => m.id === id);
}

export function getMouvementsByCompte(compteId: string): MouvementBancaire[] {
  return MOUVEMENTS_BANCAIRES_MOCK.filter((m) => m.compte_bancaire_id === compteId);
}

export function getMouvementsByPeriode(debut: string, fin: string): MouvementBancaire[] {
  return MOUVEMENTS_BANCAIRES_MOCK.filter((m) => m.date >= debut && m.date <= fin);
}

export function getMouvementsNonCategorises(): MouvementBancaire[] {
  return MOUVEMENTS_BANCAIRES_MOCK.filter((m) => !m.is_categorise);
}

export function getMouvementsNonRapproches(): MouvementBancaire[] {
  return MOUVEMENTS_BANCAIRES_MOCK.filter((m) => !m.is_rapproche);
}

export function getMouvementsByFournisseur(fournisseurId: string): MouvementBancaire[] {
  return MOUVEMENTS_BANCAIRES_MOCK.filter((m) => m.fournisseur_id === fournisseurId);
}

export function getMouvementsByCoproprietaire(coproprietaireId: string): MouvementBancaire[] {
  return MOUVEMENTS_BANCAIRES_MOCK.filter((m) => m.coproprietaire_id === coproprietaireId);
}

/**
 * Calcule les soldes progressifs pour affichage
 */
export function calculerSoldesProgressifs(compteId: string): Array<{ date: string; solde: number }> {
  const mouvements = getMouvementsByCompte(compteId).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const soldes: Array<{ date: string; solde: number }> = [];
  let soldeRunning = SOLDE_INITIAL_COURANT;

  for (const mvt of mouvements) {
    soldeRunning += mvt.montant;
    soldes.push({
      date: mvt.date,
      solde: Math.round(soldeRunning * 100) / 100,
    });
  }

  return soldes;
}

/**
 * Groupe les mouvements par mois
 */
export function grouperMouvementsParMois(
  mouvements: MouvementBancaire[]
): Record<string, MouvementBancaire[]> {
  const groupes: Record<string, MouvementBancaire[]> = {};

  for (const mvt of mouvements) {
    const mois = mvt.date.substring(0, 7); // YYYY-MM
    if (!groupes[mois]) {
      groupes[mois] = [];
    }
    groupes[mois].push(mvt);
  }

  return groupes;
}
