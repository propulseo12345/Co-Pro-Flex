/**
 * Mock Data - Appels de Fonds
 *
 * @source Fusionné depuis :
 *   - src/components/features/finance/AppelsFonds/mock-data.ts
 *   - src/components/features/finance/AppelsFonds/types.ts
 * @created 2025-01-19
 *
 * Relations:
 * - copropriete_id → coproprietes.id
 * - budget_id → budgets.id
 * - resolution_ag_id → resolutions.id (futur)
 * - repartitions[].coproprietaire_id → coproprietaires.id
 *
 * Notes:
 * - 6 appels de fonds pour la copropriété principale
 * - Chaque appel a des répartitions par copropriétaire
 * - Statuts variés pour tester tous les cas d'usage
 */

import { BaseEntity, AppelFondsStatut } from '../types';
import { COPROPRIETE_IDS } from './coproprietes';
import { COPROPRIETAIRE_IDS } from './coproprietaires';
import { BUDGET_IDS } from './budgets';

// ============================================
// TYPES
// ============================================

export type TypeAppelFonds = 'fonctionnement' | 'travaux' | 'alur';
export type ModePaiement = 'VIREMENT' | 'CHEQUE' | 'PRELEVEMENT' | 'ESPECES' | 'CB';
export type StatutPaiement = 'NON_PAYE' | 'PARTIELLEMENT_PAYE' | 'PAYE';
export type ModeEnvoi = 'ELECTRONIQUE' | 'POSTAL' | 'EMAIL';
export type StatutEnvoi = 'NON_ENVOYE' | 'PREPARE' | 'ENVOYE' | 'LIVRE' | 'LU';

export interface PaiementAppel {
  id: string;
  date: string;
  montant: number;
  mode: ModePaiement;
  reference?: string;
  notes?: string;
}

export interface EnvoiAppel {
  mode: ModeEnvoi;
  statut: StatutEnvoi;
  date_prepare?: string;
  date_envoi?: string;
  date_livraison?: string;
  date_lecture?: string;
  numero_suivi?: string;
}

export interface RepartitionAppel {
  id: string;
  coproprietaire_id: string;
  lot_reference: string;
  tantiemes: number;
  montant_du: number;
  montant_paye: number;
  statut_paiement: StatutPaiement;
  paiements: PaiementAppel[];
  envoi?: EnvoiAppel;
  mode_envoi_preference?: ModeEnvoi;
}

export interface AppelFonds extends BaseEntity {
  // Relations
  copropriete_id: string;
  budget_id?: string;
  resolution_ag_id?: string;

  // Identification
  reference: string;
  description: string;
  type: TypeAppelFonds;
  periode: string;
  annee: number;
  trimestre?: number;

  // Montants
  montant_total: number;
  montant_encaisse: number;
  montant_restant: number;

  // Dates
  date_emission?: string;
  date_exigibilite: string;
  date_cloture?: string;

  // Statut
  statut: AppelFondsStatut;

  // Répartitions
  repartitions: RepartitionAppel[];

  // Métadonnées
  notes?: string;
  devis_url?: string;
  projet_nom?: string;
}

// ============================================
// IDS PRÉGÉNÉRÉS
// ============================================

export const APPEL_FONDS_IDS = {
  // Appels fonctionnement 2025
  FONCT_T1_2025: 'adf_11111111-1111-4111-8111-111111111111',
  FONCT_T2_2025: 'adf_22222222-2222-4222-8222-222222222222',
  // Appels fonctionnement 2024
  FONCT_T3_2024: 'adf_33333333-3333-4333-8333-333333333333',
  FONCT_T4_2024: 'adf_44444444-4444-4444-8444-444444444444',
  // Appels travaux
  TRAVAUX_ISOLATION: 'adf_55555555-5555-4555-8555-555555555555',
  TRAVAUX_RAVALEMENT: 'adf_66666666-6666-4666-8666-666666666666',
} as const;

// ============================================
// HELPERS POUR GÉNÉRATION
// ============================================

function createRepartition(
  id: string,
  coproId: string,
  lot: string,
  tantiemes: number,
  montant: number,
  paye: number,
  statutPaiement: StatutPaiement,
  paiements: PaiementAppel[] = [],
  envoi?: EnvoiAppel
): RepartitionAppel {
  return {
    id,
    coproprietaire_id: coproId,
    lot_reference: lot,
    tantiemes,
    montant_du: montant,
    montant_paye: paye,
    statut_paiement: statutPaiement,
    paiements,
    envoi,
  };
}

// ============================================
// DONNÉES MOCK
// ============================================

export const APPELS_FONDS_MOCK: AppelFonds[] = [
  // === APPEL T1 2025 - EN COURS (délai court) ===
  {
    id: APPEL_FONDS_IDS.FONCT_T1_2025,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    budget_id: BUDGET_IDS.FONCTIONNEMENT_2025,
    resolution_ag_id: 'res_11111111-1111-4111-8111-111111111111',
    reference: 'AF-2025-001',
    description: 'Appel de fonds - Charges T1 2025',
    type: 'fonctionnement',
    periode: 'T1 2025',
    annee: 2025,
    trimestre: 1,
    montant_total: 21875.00, // 87500 / 4
    montant_encaisse: 15312.50,
    montant_restant: 6562.50,
    date_emission: '2025-01-05',
    date_exigibilite: '2025-02-15',
    statut: AppelFondsStatut.EN_COURS,
    repartitions: [
      createRepartition(
        'rep-t1-1', COPROPRIETAIRE_IDS.LEBLANC_MARIE, 'A01', 150, 328.13, 328.13, 'PAYE',
        [{ id: 'pai-1', date: '2025-01-10', montant: 328.13, mode: 'VIREMENT', reference: 'VIR-2025-001' }],
        { mode: 'ELECTRONIQUE', statut: 'LU', date_prepare: '2025-01-05', date_envoi: '2025-01-06', date_lecture: '2025-01-07', numero_suivi: 'AR123456789FR' }
      ),
      createRepartition(
        'rep-t1-2', COPROPRIETAIRE_IDS.MOREAU_PIERRE, 'A02', 120, 262.50, 200.00, 'PARTIELLEMENT_PAYE',
        [{ id: 'pai-2', date: '2025-01-12', montant: 200.00, mode: 'VIREMENT', reference: 'VIR-2025-002' }],
        { mode: 'ELECTRONIQUE', statut: 'LIVRE', date_prepare: '2025-01-05', date_envoi: '2025-01-06', date_livraison: '2025-01-06', numero_suivi: 'AR123456790FR' }
      ),
      createRepartition(
        'rep-t1-3', COPROPRIETAIRE_IDS.LAURENT_SOPHIE, 'B01', 200, 437.50, 0, 'NON_PAYE',
        [],
        { mode: 'POSTAL', statut: 'ENVOYE', date_prepare: '2025-01-05', date_envoi: '2025-01-07', numero_suivi: '1A12345678901' }
      ),
      createRepartition(
        'rep-t1-4', COPROPRIETAIRE_IDS.DUPONT_MARTIN, 'B02', 180, 393.75, 393.75, 'PAYE',
        [{ id: 'pai-3', date: '2025-01-08', montant: 393.75, mode: 'CHEQUE', reference: 'CHQ-78456' }],
        { mode: 'POSTAL', statut: 'LIVRE', date_prepare: '2025-01-05', date_envoi: '2025-01-07', date_livraison: '2025-01-09', numero_suivi: '1A12345678902' }
      ),
      createRepartition(
        'rep-t1-5', COPROPRIETAIRE_IDS.SCI_LES_ORMES, 'C01', 300, 656.25, 656.25, 'PAYE',
        [{ id: 'pai-4', date: '2025-01-11', montant: 656.25, mode: 'PRELEVEMENT', reference: 'PREL-2025-001' }],
        { mode: 'ELECTRONIQUE', statut: 'LU', date_prepare: '2025-01-05', date_envoi: '2025-01-06', date_lecture: '2025-01-06', numero_suivi: 'AR123456792FR' }
      ),
      createRepartition('rep-t1-6', COPROPRIETAIRE_IDS.DUBOIS_JEAN, 'A03', 98, 214.38, 214.38, 'PAYE',
        [{ id: 'pai-5', date: '2025-01-09', montant: 214.38, mode: 'VIREMENT' }]
      ),
      createRepartition('rep-t1-7', COPROPRIETAIRE_IDS.MARTIN_ANNE, 'A04', 135, 295.31, 295.31, 'PAYE',
        [{ id: 'pai-6', date: '2025-01-10', montant: 295.31, mode: 'VIREMENT' }]
      ),
      createRepartition('rep-t1-8', COPROPRIETAIRE_IDS.BERNARD_FRANCOIS, 'B03', 125, 273.44, 273.44, 'PAYE',
        [{ id: 'pai-7', date: '2025-01-08', montant: 273.44, mode: 'CHEQUE' }]
      ),
      // Copropriétaires avec impayés - montants non payés
      createRepartition('rep-t1-9', COPROPRIETAIRE_IDS.SIMON_M, 'C02', 110, 240.63, 0, 'NON_PAYE'),
      createRepartition('rep-t1-10', COPROPRIETAIRE_IDS.GARCIA_MME, 'C03', 95, 207.81, 0, 'NON_PAYE'),
      createRepartition('rep-t1-11', COPROPRIETAIRE_IDS.THOMAS_M, 'D01', 140, 306.25, 0, 'NON_PAYE'),
      createRepartition('rep-t1-12', COPROPRIETAIRE_IDS.LOPEZ_MME, 'D02', 160, 350.00, 0, 'NON_PAYE'),
    ],
    notes: 'Premier appel 2025 - En cours de recouvrement',
    created_at: '2025-01-05T00:00:00Z',
    updated_at: '2025-01-19T10:00:00Z',
  },

  // === APPEL T2 2025 - À GÉNÉRER ===
  {
    id: APPEL_FONDS_IDS.FONCT_T2_2025,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    budget_id: BUDGET_IDS.FONCTIONNEMENT_2025,
    resolution_ag_id: 'res_11111111-1111-4111-8111-111111111111',
    reference: 'AF-2025-002',
    description: 'Appel de fonds - Charges T2 2025 (Planifié)',
    type: 'fonctionnement',
    periode: 'T2 2025',
    annee: 2025,
    trimestre: 2,
    montant_total: 21875.00,
    montant_encaisse: 0,
    montant_restant: 21875.00,
    date_exigibilite: '2025-05-15',
    statut: AppelFondsStatut.BROUILLON,
    repartitions: [], // À générer
    notes: 'Appel planifié - Génération prévue J-45',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },

  // === APPEL T3 2024 - SOLDÉ ===
  {
    id: APPEL_FONDS_IDS.FONCT_T3_2024,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    budget_id: BUDGET_IDS.FONCTIONNEMENT_2024,
    reference: 'AF-2024-003',
    description: 'Appel de fonds - Charges T3 2024',
    type: 'fonctionnement',
    periode: 'T3 2024',
    annee: 2024,
    trimestre: 3,
    montant_total: 21250.00,
    montant_encaisse: 21250.00,
    montant_restant: 0,
    date_emission: '2024-07-01',
    date_exigibilite: '2024-08-15',
    date_cloture: '2024-09-05',
    statut: AppelFondsStatut.CLOTURE,
    repartitions: [
      createRepartition('rep-t3-1', COPROPRIETAIRE_IDS.LEBLANC_MARIE, 'A01', 150, 318.75, 318.75, 'PAYE',
        [{ id: 'pai-t3-1', date: '2024-07-15', montant: 318.75, mode: 'VIREMENT' }]
      ),
      createRepartition('rep-t3-2', COPROPRIETAIRE_IDS.MOREAU_PIERRE, 'A02', 120, 255.00, 255.00, 'PAYE',
        [{ id: 'pai-t3-2', date: '2024-07-20', montant: 255.00, mode: 'VIREMENT' }]
      ),
      createRepartition('rep-t3-3', COPROPRIETAIRE_IDS.LAURENT_SOPHIE, 'B01', 200, 425.00, 425.00, 'PAYE',
        [{ id: 'pai-t3-3', date: '2024-08-01', montant: 425.00, mode: 'CHEQUE' }]
      ),
      // ... autres copropriétaires tous payés
    ],
    created_at: '2024-07-01T00:00:00Z',
    updated_at: '2024-09-05T00:00:00Z',
  },

  // === APPEL T4 2024 - EN COURS (échéance proche) ===
  {
    id: APPEL_FONDS_IDS.FONCT_T4_2024,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    budget_id: BUDGET_IDS.FONCTIONNEMENT_2024,
    reference: 'AF-2024-004',
    description: 'Appel de fonds - Charges T4 2024 (URGENT)',
    type: 'fonctionnement',
    periode: 'T4 2024',
    annee: 2024,
    trimestre: 4,
    montant_total: 21250.00,
    montant_encaisse: 18562.50,
    montant_restant: 2687.50,
    date_emission: '2024-10-01',
    date_exigibilite: '2024-11-15',
    statut: AppelFondsStatut.EN_COURS,
    repartitions: [
      createRepartition('rep-t4-1', COPROPRIETAIRE_IDS.LEBLANC_MARIE, 'A01', 150, 318.75, 318.75, 'PAYE',
        [{ id: 'pai-t4-1', date: '2024-10-20', montant: 318.75, mode: 'VIREMENT' }]
      ),
      createRepartition('rep-t4-2', COPROPRIETAIRE_IDS.MOREAU_PIERRE, 'A02', 120, 255.00, 255.00, 'PAYE',
        [{ id: 'pai-t4-2', date: '2024-10-25', montant: 255.00, mode: 'VIREMENT' }]
      ),
      createRepartition('rep-t4-3', COPROPRIETAIRE_IDS.LAURENT_SOPHIE, 'B01', 200, 425.00, 425.00, 'PAYE',
        [{ id: 'pai-t4-3', date: '2024-11-01', montant: 425.00, mode: 'CHEQUE' }]
      ),
      createRepartition('rep-t4-4', COPROPRIETAIRE_IDS.SIMON_M, 'C02', 110, 233.75, 0, 'NON_PAYE'),
      createRepartition('rep-t4-5', COPROPRIETAIRE_IDS.GARCIA_MME, 'C03', 95, 201.88, 0, 'NON_PAYE'),
    ],
    notes: 'Échéance proche - Relances envoyées pour impayés',
    created_at: '2024-10-01T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },

  // === APPEL TRAVAUX ISOLATION ===
  {
    id: APPEL_FONDS_IDS.TRAVAUX_ISOLATION,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    budget_id: BUDGET_IDS.TRAVAUX_ISOLATION,
    resolution_ag_id: 'res_22222222-2222-4222-8222-222222222222',
    reference: 'AF-2024-TRAV-001',
    description: 'Appel de fonds - Travaux Isolation Thermique',
    type: 'travaux',
    periode: '2024-2025',
    annee: 2024,
    montant_total: 28000.00,
    montant_encaisse: 19600.00,
    montant_restant: 8400.00,
    date_emission: '2024-06-01',
    date_exigibilite: '2024-07-15',
    statut: AppelFondsStatut.EN_COURS,
    repartitions: [
      createRepartition('rep-iso-1', COPROPRIETAIRE_IDS.LEBLANC_MARIE, 'A01', 150, 420.00, 420.00, 'PAYE',
        [{ id: 'pai-iso-1', date: '2024-06-20', montant: 420.00, mode: 'VIREMENT' }]
      ),
      createRepartition('rep-iso-2', COPROPRIETAIRE_IDS.MOREAU_PIERRE, 'A02', 120, 336.00, 336.00, 'PAYE',
        [{ id: 'pai-iso-2', date: '2024-06-25', montant: 336.00, mode: 'VIREMENT' }]
      ),
      createRepartition('rep-iso-3', COPROPRIETAIRE_IDS.LAURENT_SOPHIE, 'B01', 200, 560.00, 280.00, 'PARTIELLEMENT_PAYE',
        [{ id: 'pai-iso-3', date: '2024-07-01', montant: 280.00, mode: 'CHEQUE' }]
      ),
      createRepartition('rep-iso-4', COPROPRIETAIRE_IDS.THOMAS_M, 'D01', 140, 392.00, 0, 'NON_PAYE'),
      createRepartition('rep-iso-5', COPROPRIETAIRE_IDS.LOPEZ_MME, 'D02', 160, 448.00, 0, 'NON_PAYE'),
    ],
    projet_nom: 'Isolation Thermique',
    devis_url: '/documents/devis-isolation.pdf',
    notes: 'Travaux en cours - 70% encaissé',
    created_at: '2024-06-01T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },

  // === APPEL TRAVAUX RAVALEMENT (EN PRÉPARATION) ===
  {
    id: APPEL_FONDS_IDS.TRAVAUX_RAVALEMENT,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    budget_id: BUDGET_IDS.TRAVAUX_ECLAIRAGE, // Prochain budget travaux
    resolution_ag_id: 'res_33333333-3333-4333-8333-333333333333',
    reference: 'AF-2026-TRAV-001',
    description: 'Appel de fonds - Rénovation Éclairage LED',
    type: 'travaux',
    periode: '2026',
    annee: 2026,
    montant_total: 5500.00,
    montant_encaisse: 0,
    montant_restant: 5500.00,
    date_emission: '2026-01-15',
    date_exigibilite: '2026-02-28',
    statut: AppelFondsStatut.BROUILLON,
    repartitions: [], // À générer lors de l'émission
    projet_nom: 'Rénovation Éclairage LED',
    devis_url: '/documents/devis-eclairage-led.pdf',
    notes: 'En préparation - Envoi prévu mi-janvier',
    created_at: '2026-01-10T00:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  },
];

// ============================================
// STATISTIQUES
// ============================================

export const APPELS_FONDS_STATS = {
  total: APPELS_FONDS_MOCK.length,
  par_type: {
    fonctionnement: APPELS_FONDS_MOCK.filter((a) => a.type === 'fonctionnement').length,
    travaux: APPELS_FONDS_MOCK.filter((a) => a.type === 'travaux').length,
    alur: APPELS_FONDS_MOCK.filter((a) => a.type === 'alur').length,
  },
  par_statut: {
    brouillon: APPELS_FONDS_MOCK.filter((a) => a.statut === AppelFondsStatut.BROUILLON).length,
    en_cours: APPELS_FONDS_MOCK.filter((a) => a.statut === AppelFondsStatut.EN_COURS).length,
    cloture: APPELS_FONDS_MOCK.filter((a) => a.statut === AppelFondsStatut.CLOTURE).length,
  },
  montant_total_2025: APPELS_FONDS_MOCK.filter((a) => a.annee === 2025).reduce(
    (acc, a) => acc + a.montant_total,
    0
  ),
  montant_encaisse_2025: APPELS_FONDS_MOCK.filter((a) => a.annee === 2025).reduce(
    (acc, a) => acc + a.montant_encaisse,
    0
  ),
  montant_restant_2025: APPELS_FONDS_MOCK.filter((a) => a.annee === 2025).reduce(
    (acc, a) => acc + a.montant_restant,
    0
  ),
  taux_recouvrement_global: (() => {
    const total = APPELS_FONDS_MOCK.reduce((acc, a) => acc + a.montant_total, 0);
    const encaisse = APPELS_FONDS_MOCK.reduce((acc, a) => acc + a.montant_encaisse, 0);
    return total > 0 ? Math.round((encaisse / total) * 100 * 10) / 10 : 0;
  })(),
};

// ============================================
// TABLE DE CORRESPONDANCE
// ============================================

export const APPELS_FONDS_ID_MAP: Record<string, string> = {
  '1': APPEL_FONDS_IDS.FONCT_T1_2025,
  '2': APPEL_FONDS_IDS.TRAVAUX_ISOLATION,
  '3': APPEL_FONDS_IDS.FONCT_T4_2024,
  '4': APPEL_FONDS_IDS.TRAVAUX_RAVALEMENT,
  '5': APPEL_FONDS_IDS.FONCT_T2_2025,
  '6': APPEL_FONDS_IDS.FONCT_T3_2024,
  'T1-2025': APPEL_FONDS_IDS.FONCT_T1_2025,
  'T2-2025': APPEL_FONDS_IDS.FONCT_T2_2025,
  'T3-2024': APPEL_FONDS_IDS.FONCT_T3_2024,
  'T4-2024': APPEL_FONDS_IDS.FONCT_T4_2024,
};

// ============================================
// HELPERS
// ============================================

export function getAppelFondsById(id: string): AppelFonds | undefined {
  return APPELS_FONDS_MOCK.find((a) => a.id === id);
}

export function getAppelsFondsByCopropriete(coproprieteId: string): AppelFonds[] {
  return APPELS_FONDS_MOCK.filter((a) => a.copropriete_id === coproprieteId);
}

export function getAppelsFondsByAnnee(annee: number): AppelFonds[] {
  return APPELS_FONDS_MOCK.filter((a) => a.annee === annee);
}

export function getAppelsFondsEnCours(): AppelFonds[] {
  return APPELS_FONDS_MOCK.filter((a) => a.statut === AppelFondsStatut.EN_COURS);
}

export function getAppelsFondsParType(type: TypeAppelFonds): AppelFonds[] {
  return APPELS_FONDS_MOCK.filter((a) => a.type === type);
}

export function calculerTauxRecouvrement(appel: AppelFonds): number {
  if (appel.montant_total === 0) return 0;
  return Math.round((appel.montant_encaisse / appel.montant_total) * 100 * 10) / 10;
}

export function getRepartitionsByCoproprietaire(coproprietaireId: string): RepartitionAppel[] {
  const repartitions: RepartitionAppel[] = [];
  for (const appel of APPELS_FONDS_MOCK) {
    const rep = appel.repartitions.find((r) => r.coproprietaire_id === coproprietaireId);
    if (rep) {
      repartitions.push(rep);
    }
  }
  return repartitions;
}

export function getMontantImpayesByCoproprietaire(coproprietaireId: string): number {
  let total = 0;
  for (const appel of APPELS_FONDS_MOCK) {
    if (appel.statut === AppelFondsStatut.CLOTURE) continue;
    const rep = appel.repartitions.find((r) => r.coproprietaire_id === coproprietaireId);
    if (rep && rep.statut_paiement !== 'PAYE') {
      total += rep.montant_du - rep.montant_paye;
    }
  }
  return total;
}

export function getAppelsAvecImpayes(): AppelFonds[] {
  return APPELS_FONDS_MOCK.filter(
    (a) =>
      a.statut !== AppelFondsStatut.CLOTURE &&
      a.repartitions.some((r) => r.statut_paiement !== 'PAYE')
  );
}

// ============================================
// DÉLAIS OPTIMAUX (CONSTANTES)
// ============================================

export const DELAIS_APPELS_FONDS = {
  GENERATION: 45, // J-45 : Génération de l'appel
  ENVOI: 40, // J-40 : Envoi aux copropriétaires
  RELANCE_1: 15, // J-15 : 1ère relance si non payé
  RELANCE_2: 5, // J-5 : 2ème relance urgente
  DELAI_MINIMUM: 30, // Délai minimum acceptable pour paiement
  DELAI_CRITIQUE: 15, // Délai critique (urgence)
} as const;

// ============================================
// RÉSOLUTIONS AG (DONNÉES LIÉES)
// ============================================

export interface ResolutionAG {
  id: string;
  numero: string;
  titre: string;
  date_ag: string;
  montant_vote: number;
  statut: 'ADOPTEE' | 'REJETEE';
}

export const RESOLUTIONS_AG_MOCK: ResolutionAG[] = [
  {
    id: 'res_11111111-1111-4111-8111-111111111111',
    numero: '2024-AG-001',
    titre: 'Adoption du budget prévisionnel 2025',
    date_ag: '2024-11-15',
    montant_vote: 87500,
    statut: 'ADOPTEE',
  },
  {
    id: 'res_22222222-2222-4222-8222-222222222222',
    numero: '2024-AG-002',
    titre: "Travaux d'isolation thermique",
    date_ag: '2024-11-15',
    montant_vote: 28000,
    statut: 'ADOPTEE',
  },
  {
    id: 'res_33333333-3333-4333-8333-333333333333',
    numero: '2024-AG-003',
    titre: 'Rénovation éclairage LED',
    date_ag: '2024-11-15',
    montant_vote: 5500,
    statut: 'ADOPTEE',
  },
];

export function getResolutionAGById(id: string): ResolutionAG | undefined {
  return RESOLUTIONS_AG_MOCK.find((r) => r.id === id);
}
