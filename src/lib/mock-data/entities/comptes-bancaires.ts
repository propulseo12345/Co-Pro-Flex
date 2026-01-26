/**
 * Mock Data - Comptes Bancaires
 *
 * @source Créé depuis :
 *   - src/components/features/finance/Factures/data.ts → MOCK_COMPTES
 *   - src/lib/mock-data/entities/coproprietes.ts → compte_bancaire_principal/travaux
 * @created 2025-01-19
 *
 * Relations:
 * - copropriete_id → coproprietes.id
 *
 * Notes:
 * - 2 comptes pour la copropriété principale : courant + travaux
 * - Les soldes doivent matcher les KPIs Dashboard :
 *   • Solde disponible : 10 533,31 € (compte courant)
 *   • Fonds travaux : 28 450,00 €
 */

import { BaseEntity } from '../types';
import { COPROPRIETE_IDS } from './coproprietes';

// ============================================
// TYPES
// ============================================

export type TypeCompteBancaire = 'courant' | 'travaux' | 'epargne' | 'alur';

export interface CompteBancaire extends BaseEntity {
  copropriete_id: string;
  libelle: string;
  type: TypeCompteBancaire;
  banque: string;
  iban: string;
  bic: string;
  solde: number;
  date_solde: string;
  titulaire: string;
  is_principal: boolean;
  is_actif: boolean;
  notes?: string;
}

// ============================================
// IDS PRÉGÉNÉRÉS
// ============================================

export const COMPTE_BANCAIRE_IDS = {
  COURANT_PRINCIPAL: 'cba_11111111-1111-4111-8111-111111111111',
  TRAVAUX_PRINCIPAL: 'cba_22222222-2222-4222-8222-222222222222',
  COURANT_SECONDAIRE: 'cba_33333333-3333-4333-8333-333333333333',
} as const;

// ============================================
// DONNÉES MOCK
// ============================================

/**
 * Soldes cohérents avec KPIs Dashboard :
 * - Solde disponible : 10 533,31 € → compte courant
 * - Fonds travaux : 28 450,00 € → compte travaux
 */
export const COMPTES_BANCAIRES_MOCK: CompteBancaire[] = [
  {
    id: COMPTE_BANCAIRE_IDS.COURANT_PRINCIPAL,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    libelle: 'Compte Courant Copropriété',
    type: 'courant',
    banque: 'BNP Paribas',
    iban: 'FR76 1234 5678 9012 3456 7890 123',
    bic: 'BNPAFRPP',
    solde: 10533.31, // KPI Dashboard : Solde disponible
    date_solde: '2025-01-19',
    titulaire: 'SDC Résidence La Carrière au Loup',
    is_principal: true,
    is_actif: true,
    notes: 'Compte principal pour charges courantes',
    created_at: '2015-01-01T00:00:00Z',
    updated_at: '2025-01-19T10:00:00Z',
  },
  {
    id: COMPTE_BANCAIRE_IDS.TRAVAUX_PRINCIPAL,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    libelle: 'Fonds Travaux (ALUR)',
    type: 'travaux',
    banque: 'BNP Paribas',
    iban: 'FR76 9876 5432 1098 7654 3210 987',
    bic: 'BNPAFRPP',
    solde: 28450.00, // Fonds travaux ALUR
    date_solde: '2025-01-19',
    titulaire: 'SDC Résidence La Carrière au Loup - Fonds Travaux',
    is_principal: false,
    is_actif: true,
    notes: 'Fonds de travaux obligatoire loi ALUR',
    created_at: '2017-01-01T00:00:00Z',
    updated_at: '2025-01-19T10:00:00Z',
  },
  {
    id: COMPTE_BANCAIRE_IDS.COURANT_SECONDAIRE,
    copropriete_id: COPROPRIETE_IDS.SECONDAIRE,
    libelle: 'Compte Courant',
    type: 'courant',
    banque: 'Crédit Agricole',
    iban: 'FR76 1111 2222 3333 4444 5555 666',
    bic: 'AGRIFRPP',
    solde: 5230.50,
    date_solde: '2025-01-19',
    titulaire: 'SDC Résidence Les Tilleuls',
    is_principal: true,
    is_actif: true,
    created_at: '2021-06-01T00:00:00Z',
    updated_at: '2025-01-19T10:00:00Z',
  },
];

// ============================================
// STATISTIQUES
// ============================================

export const COMPTES_BANCAIRES_STATS = {
  total: COMPTES_BANCAIRES_MOCK.length,
  actifs: COMPTES_BANCAIRES_MOCK.filter((c) => c.is_actif).length,
  par_type: {
    courant: COMPTES_BANCAIRES_MOCK.filter((c) => c.type === 'courant').length,
    travaux: COMPTES_BANCAIRES_MOCK.filter((c) => c.type === 'travaux').length,
    epargne: COMPTES_BANCAIRES_MOCK.filter((c) => c.type === 'epargne').length,
  },
  solde_total: COMPTES_BANCAIRES_MOCK.reduce((acc, c) => acc + c.solde, 0),
  solde_courant_principal: COMPTES_BANCAIRES_MOCK.find(
    (c) => c.id === COMPTE_BANCAIRE_IDS.COURANT_PRINCIPAL
  )?.solde,
  solde_travaux_principal: COMPTES_BANCAIRES_MOCK.find(
    (c) => c.id === COMPTE_BANCAIRE_IDS.TRAVAUX_PRINCIPAL
  )?.solde,
};

// ============================================
// TABLE DE CORRESPONDANCE
// ============================================

export const COMPTES_BANCAIRES_ID_MAP: Record<string, string> = {
  'compte-courant': COMPTE_BANCAIRE_IDS.COURANT_PRINCIPAL,
  'compte-travaux': COMPTE_BANCAIRE_IDS.TRAVAUX_PRINCIPAL,
  courant: COMPTE_BANCAIRE_IDS.COURANT_PRINCIPAL,
  travaux: COMPTE_BANCAIRE_IDS.TRAVAUX_PRINCIPAL,
};

// ============================================
// HELPERS
// ============================================

export function getCompteBancaireById(id: string): CompteBancaire | undefined {
  return COMPTES_BANCAIRES_MOCK.find((c) => c.id === id);
}

export function getComptesByCopropriete(coproprieteId: string): CompteBancaire[] {
  return COMPTES_BANCAIRES_MOCK.filter((c) => c.copropriete_id === coproprieteId);
}

export function getComptePrincipal(coproprieteId: string): CompteBancaire | undefined {
  return COMPTES_BANCAIRES_MOCK.find(
    (c) => c.copropriete_id === coproprieteId && c.is_principal
  );
}

export function getCompteTravaux(coproprieteId: string): CompteBancaire | undefined {
  return COMPTES_BANCAIRES_MOCK.find(
    (c) => c.copropriete_id === coproprieteId && c.type === 'travaux'
  );
}

export function getSoldeDisponible(coproprieteId: string): number {
  const comptePrincipal = getComptePrincipal(coproprieteId);
  return comptePrincipal?.solde || 0;
}

export function getSoldeTravaux(coproprieteId: string): number {
  const compteTravaux = getCompteTravaux(coproprieteId);
  return compteTravaux?.solde || 0;
}

export function formatIBAN(iban: string): string {
  return iban.replace(/(.{4})/g, '$1 ').trim();
}
