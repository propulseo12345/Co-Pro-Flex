/**
 * Mock data for Finance module
 * Temporally coherent dataset for fiscal year 2024/2025
 * All data is interconnected: coproprietes -> lots -> coproprietaires -> budgets -> appels -> paiements
 */

import type { ID } from '@/types/common';
import {
  BudgetStatut,
  ExerciceStatut,
  LigneAppelStatut,
  ModePaiement,
  LotType,
  EcheancierMode,
  TypeCompte,
} from '@/types/enums';

// ============================================
// BASE TYPES FOR MOCK DATA
// ============================================

export interface MockCopropriete {
  id: ID;
  nom: string;
  adresse: {
    rue: string;
    codePostal: string;
    ville: string;
  };
  nombreLots: number;
  totalTantiemes: number;
  exerciceDebut: number; // month (1-12)
  dateCreation: string;
}

export interface MockLot {
  id: ID;
  coproprieteId: ID;
  coproprietaireId: ID;
  numero: string;
  type: LotType;
  etage?: number;
  surface?: number;
  tantiemesGeneraux: number;
  tantiemesAscenseur?: number;
  tantiemesChauffage?: number;
}

export interface MockCoproprietaire {
  id: ID;
  coproprieteId: ID;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  adresse?: {
    rue: string;
    codePostal: string;
    ville: string;
  };
  isResident: boolean;
  dateEntree: string;
}

export interface MockCleRepartition {
  id: ID;
  coproprieteId: ID;
  nom: string;
  code: string;
  description?: string;
  totalTantiemes: number;
  type: 'GENERALE' | 'ASCENSEUR' | 'CHAUFFAGE' | 'BATIMENT' | 'PERSONNALISEE';
  tantiemesParLot: TantiemeLot[];
}

export interface TantiemeLot {
  lotId: ID;
  tantiemes: number;
}

export interface MockExercice {
  id: ID;
  coproprieteId: ID;
  annee: number;
  dateDebut: string;
  dateFin: string;
  statut: ExerciceStatut;
}

export interface MockBudget {
  id: ID;
  coproprieteId: ID;
  exerciceId: ID;
  annee: number;
  type: 'COURANT' | 'TRAVAUX';
  nom: string;
  statut: BudgetStatut;
  montantTotal: number;
  cleRepartitionId: ID;
  resolutionId?: ID;
  categories: MockBudgetCategorie[];
}

export interface MockBudgetCategorie {
  id: ID;
  nom: string;
  postes: MockBudgetPoste[];
}

export interface MockBudgetPoste {
  id: ID;
  libelle: string;
  compteComptableId?: string;
  montantPrevu: number;
  montantN1?: number;
  montantRealise: number;
}

export interface MockAppelFonds {
  id: ID;
  coproprieteId: ID;
  budgetId: ID;
  exerciceId: ID;
  numero: number;
  periode: string;
  dateEmission: string;
  dateEcheance: string;
  montantTotal: number;
  mode: EcheancierMode;
  statut: string;
  lignes: MockLigneAppel[];
}

export interface MockLigneAppel {
  id: ID;
  appelFondsId: ID;
  coproprietaireId: ID;
  lotId: ID;
  montantDu: number;
  montantPaye: number;
  statut: LigneAppelStatut;
}

export interface MockPaiement {
  id: ID;
  coproprieteId: ID;
  coproprietaireId: ID;
  ligneAppelId?: ID;
  appelFondsId?: ID;
  montant: number;
  datePaiement: string;
  dateValeur?: string;
  modePaiement: ModePaiement;
  reference?: string;
  notes?: string;
}

export interface MockFacture {
  id: ID;
  coproprieteId: ID;
  fournisseurId: ID;
  fournisseurNom: string;
  numero: string;
  dateFacture: string;
  dateEcheance: string;
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
  statut: 'BROUILLON' | 'A_VALIDER' | 'VALIDEE' | 'A_PAYER' | 'PAYEE';
  compteComptableId?: string;
  budgetPosteId?: ID;
  pieceJointe?: string;
}

export interface MockMouvementBancaire {
  id: ID;
  coproprieteId: ID;
  compteBancaireId: ID;
  dateOperation: string;
  dateValeur: string;
  libelle: string;
  montant: number;
  sens: 'DEBIT' | 'CREDIT';
  statut: 'A_RAPPROCHER' | 'RAPPROCHE' | 'IGNORE';
  ecritureId?: ID;
  paiementId?: ID;
  factureId?: ID;
}

export interface MockEcritureComptable {
  id: ID;
  coproprieteId: ID;
  exerciceId: ID;
  dateEcriture: string;
  datePiece?: string;
  journalCode: string;
  numeroPiece?: string;
  libelle: string;
  compteDebit: string;
  compteCredit: string;
  montant: number;
  pieceJustificative?: string;
  origine?: 'APPEL_FONDS' | 'PAIEMENT' | 'FACTURE' | 'MANUEL';
  origineId?: ID;
}

export interface MockCompteComptable {
  id: ID;
  coproprieteId: ID;
  numero: string;
  libelle: string;
  type: TypeCompte;
  niveau: number;
  compteParentId?: ID;
  soldeDebit: number;
  soldeCredit: number;
}

export interface MockFournisseur {
  id: ID;
  coproprieteId: ID;
  raisonSociale: string;
  siret?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  iban?: string;
  bic?: string;
  domaine: string;
}

// ============================================
// SEED DATA - Temporally coherent for 2024/2025
// ============================================

const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();

// Helper to create dates
const date = (year: number, month: number, day: number): string => {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

// ============================================
// COPROPRIETE
// ============================================

export const MOCK_COPROPRIETE: MockCopropriete = {
  id: 'copro-1',
  nom: 'Residence Les Jardins',
  adresse: {
    rue: '25 avenue Victor Hugo',
    codePostal: '69003',
    ville: 'Lyon',
  },
  nombreLots: 24,
  totalTantiemes: 10000,
  exerciceDebut: 1, // January
  dateCreation: '1992-06-15',
};

// ============================================
// COPROPRIETAIRES
// ============================================

export const MOCK_COPROPRIETAIRES: MockCoproprietaire[] = [
  {
    id: 'copro-owner-1',
    coproprieteId: 'copro-1',
    nom: 'LEBLANC',
    prenom: 'Marie',
    email: 'marie.leblanc@example.fr',
    telephone: '06 12 34 56 78',
    adresse: { rue: '25 avenue Victor Hugo', codePostal: '69003', ville: 'Lyon' },
    isResident: true,
    dateEntree: '2018-03-15',
  },
  {
    id: 'copro-owner-2',
    coproprieteId: 'copro-1',
    nom: 'MOREAU',
    prenom: 'Pierre',
    email: 'pierre.moreau@example.fr',
    telephone: '06 23 45 67 89',
    adresse: { rue: '25 avenue Victor Hugo', codePostal: '69003', ville: 'Lyon' },
    isResident: true,
    dateEntree: '2015-09-01',
  },
  {
    id: 'copro-owner-3',
    coproprieteId: 'copro-1',
    nom: 'LAURENT',
    prenom: 'Sophie',
    email: 'sophie.laurent@example.fr',
    adresse: { rue: '12 rue de la Paix', codePostal: '75002', ville: 'Paris' },
    isResident: false,
    dateEntree: '2020-01-10',
  },
  {
    id: 'copro-owner-4',
    coproprieteId: 'copro-1',
    nom: 'MARTIN',
    prenom: 'Jean',
    email: 'jean.martin@example.fr',
    telephone: '06 34 56 78 90',
    adresse: { rue: '25 avenue Victor Hugo', codePostal: '69003', ville: 'Lyon' },
    isResident: true,
    dateEntree: '2010-05-20',
  },
  {
    id: 'copro-owner-5',
    coproprieteId: 'copro-1',
    nom: 'DUBOIS',
    prenom: 'Isabelle',
    email: 'isabelle.dubois@example.fr',
    adresse: { rue: '25 avenue Victor Hugo', codePostal: '69003', ville: 'Lyon' },
    isResident: true,
    dateEntree: '2019-11-01',
  },
  {
    id: 'copro-owner-6',
    coproprieteId: 'copro-1',
    nom: 'BERNARD',
    prenom: 'Claude',
    email: 'claude.bernard@example.fr',
    telephone: '06 45 67 89 01',
    adresse: { rue: '8 place Bellecour', codePostal: '69002', ville: 'Lyon' },
    isResident: false,
    dateEntree: '2017-07-01',
  },
  {
    id: 'copro-owner-7',
    coproprieteId: 'copro-1',
    nom: 'ROUSSEAU',
    prenom: 'Anne',
    email: 'anne.rousseau@example.fr',
    adresse: { rue: '25 avenue Victor Hugo', codePostal: '69003', ville: 'Lyon' },
    isResident: true,
    dateEntree: '2021-04-15',
  },
  {
    id: 'copro-owner-8',
    coproprieteId: 'copro-1',
    nom: 'PETIT',
    prenom: 'Marc',
    email: 'marc.petit@example.fr',
    telephone: '06 56 78 90 12',
    adresse: { rue: '25 avenue Victor Hugo', codePostal: '69003', ville: 'Lyon' },
    isResident: true,
    dateEntree: '2016-02-28',
  },
];

// ============================================
// LOTS
// ============================================

export const MOCK_LOTS: MockLot[] = [
  { id: 'lot-1', coproprieteId: 'copro-1', coproprietaireId: 'copro-owner-1', numero: 'A1', type: LotType.APPARTEMENT, etage: 1, surface: 65, tantiemesGeneraux: 650, tantiemesAscenseur: 100 },
  { id: 'lot-2', coproprieteId: 'copro-1', coproprietaireId: 'copro-owner-1', numero: 'P1', type: LotType.PARKING, tantiemesGeneraux: 50 },
  { id: 'lot-3', coproprieteId: 'copro-1', coproprietaireId: 'copro-owner-2', numero: 'A2', type: LotType.APPARTEMENT, etage: 1, surface: 55, tantiemesGeneraux: 550, tantiemesAscenseur: 100 },
  { id: 'lot-4', coproprieteId: 'copro-1', coproprietaireId: 'copro-owner-3', numero: 'B1', type: LotType.APPARTEMENT, etage: 2, surface: 85, tantiemesGeneraux: 850, tantiemesAscenseur: 150 },
  { id: 'lot-5', coproprieteId: 'copro-1', coproprietaireId: 'copro-owner-3', numero: 'C1', type: LotType.CAVE, tantiemesGeneraux: 30 },
  { id: 'lot-6', coproprieteId: 'copro-1', coproprietaireId: 'copro-owner-4', numero: 'B2', type: LotType.APPARTEMENT, etage: 2, surface: 70, tantiemesGeneraux: 700, tantiemesAscenseur: 150 },
  { id: 'lot-7', coproprieteId: 'copro-1', coproprietaireId: 'copro-owner-4', numero: 'P2', type: LotType.PARKING, tantiemesGeneraux: 50 },
  { id: 'lot-8', coproprieteId: 'copro-1', coproprietaireId: 'copro-owner-5', numero: 'C1', type: LotType.APPARTEMENT, etage: 3, surface: 60, tantiemesGeneraux: 600, tantiemesAscenseur: 200 },
  { id: 'lot-9', coproprieteId: 'copro-1', coproprietaireId: 'copro-owner-6', numero: 'C2', type: LotType.APPARTEMENT, etage: 3, surface: 90, tantiemesGeneraux: 900, tantiemesAscenseur: 200 },
  { id: 'lot-10', coproprieteId: 'copro-1', coproprietaireId: 'copro-owner-6', numero: 'P3', type: LotType.PARKING, tantiemesGeneraux: 50 },
  { id: 'lot-11', coproprieteId: 'copro-1', coproprietaireId: 'copro-owner-7', numero: 'D1', type: LotType.APPARTEMENT, etage: 4, surface: 75, tantiemesGeneraux: 750, tantiemesAscenseur: 250 },
  { id: 'lot-12', coproprieteId: 'copro-1', coproprietaireId: 'copro-owner-8', numero: 'D2', type: LotType.APPARTEMENT, etage: 4, surface: 80, tantiemesGeneraux: 800, tantiemesAscenseur: 250 },
  { id: 'lot-13', coproprieteId: 'copro-1', coproprietaireId: 'copro-owner-8', numero: 'C2', type: LotType.CAVE, tantiemesGeneraux: 20 },
];

// ============================================
// CLES DE REPARTITION
// ============================================

export const MOCK_CLES_REPARTITION: MockCleRepartition[] = [
  {
    id: 'cle-1',
    coproprieteId: 'copro-1',
    nom: 'Charges Générales',
    code: 'CG',
    description: 'Répartition au prorata des tantièmes généraux de copropriété',
    type: 'GENERALE',
    totalTantiemes: 6000,
    tantiemesParLot: [
      { lotId: 'lot-1', tantiemes: 650 },
      { lotId: 'lot-2', tantiemes: 50 },
      { lotId: 'lot-3', tantiemes: 550 },
      { lotId: 'lot-4', tantiemes: 850 },
      { lotId: 'lot-5', tantiemes: 30 },
      { lotId: 'lot-6', tantiemes: 700 },
      { lotId: 'lot-7', tantiemes: 50 },
      { lotId: 'lot-8', tantiemes: 600 },
      { lotId: 'lot-9', tantiemes: 900 },
      { lotId: 'lot-10', tantiemes: 50 },
      { lotId: 'lot-11', tantiemes: 750 },
      { lotId: 'lot-12', tantiemes: 800 },
      { lotId: 'lot-13', tantiemes: 20 },
    ],
  },
  {
    id: 'cle-2',
    coproprieteId: 'copro-1',
    nom: 'Ascenseur',
    code: 'ASC',
    description: 'Charges ascenseur selon étage (exclusion RDC et parkings)',
    type: 'ASCENSEUR',
    totalTantiemes: 1400,
    tantiemesParLot: [
      { lotId: 'lot-1', tantiemes: 100 },
      { lotId: 'lot-3', tantiemes: 100 },
      { lotId: 'lot-4', tantiemes: 150 },
      { lotId: 'lot-6', tantiemes: 150 },
      { lotId: 'lot-8', tantiemes: 200 },
      { lotId: 'lot-9', tantiemes: 200 },
      { lotId: 'lot-11', tantiemes: 250 },
      { lotId: 'lot-12', tantiemes: 250 },
    ],
  },
  {
    id: 'cle-3',
    coproprieteId: 'copro-1',
    nom: 'Chauffage Collectif',
    code: 'CH',
    description: 'Chauffage collectif par surface habitable',
    type: 'CHAUFFAGE',
    totalTantiemes: 580,
    tantiemesParLot: [
      { lotId: 'lot-1', tantiemes: 65 },
      { lotId: 'lot-3', tantiemes: 55 },
      { lotId: 'lot-4', tantiemes: 85 },
      { lotId: 'lot-6', tantiemes: 70 },
      { lotId: 'lot-8', tantiemes: 60 },
      { lotId: 'lot-9', tantiemes: 90 },
      { lotId: 'lot-11', tantiemes: 75 },
      { lotId: 'lot-12', tantiemes: 80 },
    ],
  },
  {
    id: 'cle-4',
    coproprieteId: 'copro-1',
    nom: 'Bâtiment A',
    code: 'BAT-A',
    description: 'Charges spécifiques au bâtiment A (lots A1, A2)',
    type: 'BATIMENT',
    totalTantiemes: 1200,
    tantiemesParLot: [
      { lotId: 'lot-1', tantiemes: 650 },
      { lotId: 'lot-3', tantiemes: 550 },
    ],
  },
  {
    id: 'cle-5',
    coproprieteId: 'copro-1',
    nom: 'Bâtiment B',
    code: 'BAT-B',
    description: 'Charges spécifiques au bâtiment B (lots B1, B2)',
    type: 'BATIMENT',
    totalTantiemes: 1550,
    tantiemesParLot: [
      { lotId: 'lot-4', tantiemes: 850 },
      { lotId: 'lot-6', tantiemes: 700 },
    ],
  },
];

// ============================================
// EXERCICES COMPTABLES
// ============================================

export const MOCK_EXERCICES: MockExercice[] = [
  { id: 'ex-2024', coproprieteId: 'copro-1', annee: 2024, dateDebut: '2024-01-01', dateFin: '2024-12-31', statut: ExerciceStatut.CLOTURE },
  { id: 'ex-2025', coproprieteId: 'copro-1', annee: 2025, dateDebut: '2025-01-01', dateFin: '2025-12-31', statut: ExerciceStatut.ARRETE },
  { id: 'ex-2026', coproprieteId: 'copro-1', annee: 2026, dateDebut: '2026-01-01', dateFin: '2026-12-31', statut: ExerciceStatut.EN_COURS },
];

// ============================================
// BUDGETS
// ============================================

export const MOCK_BUDGETS: MockBudget[] = [
  {
    id: 'budget-2024-courant',
    coproprieteId: 'copro-1',
    exerciceId: 'ex-2024',
    annee: 2024,
    type: 'COURANT',
    nom: 'Budget previsionnel 2024',
    statut: BudgetStatut.CLOTURE,
    montantTotal: 82500,
    cleRepartitionId: 'cle-1',
    resolutionId: 'res-ag-2023-01',
    categories: [
      {
        id: 'cat-2024-1',
        nom: 'Administration',
        postes: [
          { id: 'poste-2024-1', libelle: 'Honoraires syndic', compteComptableId: '622', montantPrevu: 8500, montantN1: 8200, montantRealise: 8500 },
          { id: 'poste-2024-2', libelle: 'Assurance immeuble', compteComptableId: '616', montantPrevu: 4200, montantN1: 3950, montantRealise: 4200 },
          { id: 'poste-2024-3', libelle: 'Frais postaux', compteComptableId: '626', montantPrevu: 600, montantN1: 580, montantRealise: 520 },
        ],
      },
      {
        id: 'cat-2024-2',
        nom: 'Entretien courant',
        postes: [
          { id: 'poste-2024-4', libelle: 'Contrat menage', compteComptableId: '615', montantPrevu: 14400, montantN1: 13800, montantRealise: 14400 },
          { id: 'poste-2024-5', libelle: 'Contrat espaces verts', compteComptableId: '615', montantPrevu: 3600, montantN1: 3400, montantRealise: 3600 },
          { id: 'poste-2024-6', libelle: 'Petites reparations', compteComptableId: '615', montantPrevu: 2500, montantN1: 2200, montantRealise: 2850 },
        ],
      },
      {
        id: 'cat-2024-3',
        nom: 'Fluides',
        postes: [
          { id: 'poste-2024-7', libelle: 'Électricité parties communes', compteComptableId: '606', montantPrevu: 6800, montantN1: 6200, montantRealise: 7100 },
          { id: 'poste-2024-8', libelle: 'Eau parties communes', compteComptableId: '606', montantPrevu: 2400, montantN1: 2300, montantRealise: 2250 },
          { id: 'poste-2024-9', libelle: 'Chauffage collectif', compteComptableId: '606', montantPrevu: 18000, montantN1: 16500, montantRealise: 17200 },
        ],
      },
      {
        id: 'cat-2024-4',
        nom: 'Equipements',
        postes: [
          { id: 'poste-2024-10', libelle: 'Contrat ascenseur', compteComptableId: '615', montantPrevu: 9500, montantN1: 9200, montantRealise: 9500 },
          { id: 'poste-2024-11', libelle: 'Entretien portail/interphone', compteComptableId: '615', montantPrevu: 1200, montantN1: 1100, montantRealise: 1150 },
        ],
      },
      {
        id: 'cat-2024-5',
        nom: 'Provisions',
        postes: [
          { id: 'poste-2024-12', libelle: 'Provision travaux art. 14-2', compteComptableId: '102', montantPrevu: 5000, montantN1: 4500, montantRealise: 5000 },
          { id: 'poste-2024-13', libelle: 'Provisions diverses', compteComptableId: '102', montantPrevu: 5800, montantN1: 5500, montantRealise: 5800 },
        ],
      },
    ],
  },
  {
    id: 'budget-2025-courant',
    coproprieteId: 'copro-1',
    exerciceId: 'ex-2025',
    annee: 2025,
    type: 'COURANT',
    nom: 'Budget previsionnel 2025',
    statut: BudgetStatut.APPROUVE,
    montantTotal: 87500,
    cleRepartitionId: 'cle-1',
    resolutionId: 'res-ag-2024-01',
    categories: [
      {
        id: 'cat-2025-1',
        nom: 'Administration',
        postes: [
          { id: 'poste-2025-1', libelle: 'Honoraires syndic', compteComptableId: '622', montantPrevu: 8900, montantN1: 8500, montantRealise: 0 },
          { id: 'poste-2025-2', libelle: 'Assurance immeuble', compteComptableId: '616', montantPrevu: 4500, montantN1: 4200, montantRealise: 4500 },
          { id: 'poste-2025-3', libelle: 'Frais postaux', compteComptableId: '626', montantPrevu: 650, montantN1: 600, montantRealise: 0 },
        ],
      },
      {
        id: 'cat-2025-2',
        nom: 'Entretien courant',
        postes: [
          { id: 'poste-2025-4', libelle: 'Contrat menage', compteComptableId: '615', montantPrevu: 15000, montantN1: 14400, montantRealise: 1250 },
          { id: 'poste-2025-5', libelle: 'Contrat espaces verts', compteComptableId: '615', montantPrevu: 3800, montantN1: 3600, montantRealise: 0 },
          { id: 'poste-2025-6', libelle: 'Petites reparations', compteComptableId: '615', montantPrevu: 3000, montantN1: 2500, montantRealise: 450 },
        ],
      },
      {
        id: 'cat-2025-3',
        nom: 'Fluides',
        postes: [
          { id: 'poste-2025-7', libelle: 'Électricité parties communes', compteComptableId: '606', montantPrevu: 7200, montantN1: 6800, montantRealise: 0 },
          { id: 'poste-2025-8', libelle: 'Eau parties communes', compteComptableId: '606', montantPrevu: 2600, montantN1: 2400, montantRealise: 0 },
          { id: 'poste-2025-9', libelle: 'Chauffage collectif', compteComptableId: '606', montantPrevu: 19000, montantN1: 18000, montantRealise: 0 },
        ],
      },
      {
        id: 'cat-2025-4',
        nom: 'Equipements',
        postes: [
          { id: 'poste-2025-10', libelle: 'Contrat ascenseur', compteComptableId: '615', montantPrevu: 10000, montantN1: 9500, montantRealise: 0 },
          { id: 'poste-2025-11', libelle: 'Entretien portail/interphone', compteComptableId: '615', montantPrevu: 1350, montantN1: 1200, montantRealise: 0 },
        ],
      },
      {
        id: 'cat-2025-5',
        nom: 'Provisions',
        postes: [
          { id: 'poste-2025-12', libelle: 'Provision travaux art. 14-2', compteComptableId: '102', montantPrevu: 5500, montantN1: 5000, montantRealise: 0 },
          { id: 'poste-2025-13', libelle: 'Provisions diverses', compteComptableId: '102', montantPrevu: 6000, montantN1: 5800, montantRealise: 0 },
        ],
      },
    ],
  },
  {
    id: 'budget-2025-travaux',
    coproprieteId: 'copro-1',
    exerciceId: 'ex-2025',
    annee: 2025,
    type: 'TRAVAUX',
    nom: 'Ravalement facade',
    statut: BudgetStatut.APPROUVE,
    montantTotal: 45000,
    cleRepartitionId: 'cle-1',
    resolutionId: 'res-ag-2024-02',
    categories: [
      {
        id: 'cat-trav-1',
        nom: 'Travaux facade',
        postes: [
          { id: 'poste-trav-1', libelle: 'Echafaudages', compteComptableId: '215', montantPrevu: 8000, montantRealise: 0 },
          { id: 'poste-trav-2', libelle: 'Nettoyage haute pression', compteComptableId: '215', montantPrevu: 5000, montantRealise: 0 },
          { id: 'poste-trav-3', libelle: 'Reparation fissures', compteComptableId: '215', montantPrevu: 12000, montantRealise: 0 },
          { id: 'poste-trav-4', libelle: 'Peinture facade', compteComptableId: '215', montantPrevu: 18000, montantRealise: 0 },
          { id: 'poste-trav-5', libelle: 'Nettoyage final', compteComptableId: '215', montantPrevu: 2000, montantRealise: 0 },
        ],
      },
    ],
  },
];

// ============================================
// APPELS DE FONDS
// ============================================

// Helper to compute owner share based on tantiemes
const computeOwnerShare = (coproprietaireId: ID, montantTotal: number): number => {
  const lots = MOCK_LOTS.filter(l => l.coproprietaireId === coproprietaireId);
  const tantiemes = lots.reduce((sum, l) => sum + l.tantiemesGeneraux, 0);
  return Math.round((montantTotal * tantiemes / MOCK_COPROPRIETE.totalTantiemes) * 100) / 100;
};

// Generate lignes for an appel
const generateLignesAppel = (appelId: ID, montantTotal: number, statut: LigneAppelStatut, paidRatio: number = 0): MockLigneAppel[] => {
  return MOCK_COPROPRIETAIRES.map((owner, idx) => {
    const montantDu = computeOwnerShare(owner.id, montantTotal);
    const montantPaye = Math.round(montantDu * paidRatio * 100) / 100;
    return {
      id: `ligne-${appelId}-${idx + 1}`,
      appelFondsId: appelId,
      coproprietaireId: owner.id,
      lotId: MOCK_LOTS.find(l => l.coproprietaireId === owner.id)?.id || '',
      montantDu,
      montantPaye,
      statut: paidRatio >= 1 ? LigneAppelStatut.SOLDE : paidRatio > 0 ? LigneAppelStatut.PARTIELLEMENT_PAYE : statut,
    };
  });
};

export const MOCK_APPELS_FONDS: MockAppelFonds[] = [
  // 2024 Q1-Q4 - All paid
  {
    id: 'appel-2024-q1',
    coproprieteId: 'copro-1',
    budgetId: 'budget-2024-courant',
    exerciceId: 'ex-2024',
    numero: 1,
    periode: 'T1 2024',
    dateEmission: date(2024, 1, 5),
    dateEcheance: date(2024, 1, 31),
    montantTotal: 20625,
    mode: EcheancierMode.TRIMESTRIEL,
    statut: 'SOLDE',
    lignes: generateLignesAppel('appel-2024-q1', 20625, LigneAppelStatut.SOLDE, 1),
  },
  {
    id: 'appel-2024-q2',
    coproprieteId: 'copro-1',
    budgetId: 'budget-2024-courant',
    exerciceId: 'ex-2024',
    numero: 2,
    periode: 'T2 2024',
    dateEmission: date(2024, 4, 5),
    dateEcheance: date(2024, 4, 30),
    montantTotal: 20625,
    mode: EcheancierMode.TRIMESTRIEL,
    statut: 'SOLDE',
    lignes: generateLignesAppel('appel-2024-q2', 20625, LigneAppelStatut.SOLDE, 1),
  },
  {
    id: 'appel-2024-q3',
    coproprieteId: 'copro-1',
    budgetId: 'budget-2024-courant',
    exerciceId: 'ex-2024',
    numero: 3,
    periode: 'T3 2024',
    dateEmission: date(2024, 7, 5),
    dateEcheance: date(2024, 7, 31),
    montantTotal: 20625,
    mode: EcheancierMode.TRIMESTRIEL,
    statut: 'SOLDE',
    lignes: generateLignesAppel('appel-2024-q3', 20625, LigneAppelStatut.SOLDE, 1),
  },
  {
    id: 'appel-2024-q4',
    coproprieteId: 'copro-1',
    budgetId: 'budget-2024-courant',
    exerciceId: 'ex-2024',
    numero: 4,
    periode: 'T4 2024',
    dateEmission: date(2024, 10, 5),
    dateEcheance: date(2024, 10, 31),
    montantTotal: 20625,
    mode: EcheancierMode.TRIMESTRIEL,
    statut: 'SOLDE',
    lignes: generateLignesAppel('appel-2024-q4', 20625, LigneAppelStatut.SOLDE, 1),
  },
  // 2025 Q1 - Paid
  {
    id: 'appel-2025-q1',
    coproprieteId: 'copro-1',
    budgetId: 'budget-2025-courant',
    exerciceId: 'ex-2025',
    numero: 1,
    periode: 'T1 2025',
    dateEmission: date(2025, 1, 5),
    dateEcheance: date(2025, 1, 31),
    montantTotal: 21875,
    mode: EcheancierMode.TRIMESTRIEL,
    statut: 'SOLDE',
    lignes: generateLignesAppel('appel-2025-q1', 21875, LigneAppelStatut.SOLDE, 1),
  },
  // 2025 Travaux - Appel 1 partially paid
  {
    id: 'appel-2025-trav-1',
    coproprieteId: 'copro-1',
    budgetId: 'budget-2025-travaux',
    exerciceId: 'ex-2025',
    numero: 1,
    periode: 'Travaux 2025 - Appel 1/3',
    dateEmission: date(2025, 1, 10),
    dateEcheance: date(2025, 2, 15),
    montantTotal: 15000,
    mode: EcheancierMode.PERSONNALISE,
    statut: 'PARTIELLEMENT_PAYE',
    lignes: generateLignesAppel('appel-2025-trav-1', 15000, LigneAppelStatut.A_PAYER, 0.7),
  },
];

// ============================================
// PAIEMENTS
// ============================================

export const MOCK_PAIEMENTS: MockPaiement[] = [
  // Some sample payments for Q1 2025
  { id: 'pmt-1', coproprieteId: 'copro-1', coproprietaireId: 'copro-owner-1', appelFondsId: 'appel-2025-q1', montant: 1531.25, datePaiement: date(2025, 1, 15), modePaiement: ModePaiement.VIREMENT, reference: 'VIR-2025-001' },
  { id: 'pmt-2', coproprieteId: 'copro-1', coproprietaireId: 'copro-owner-2', appelFondsId: 'appel-2025-q1', montant: 1203.13, datePaiement: date(2025, 1, 18), modePaiement: ModePaiement.PRELEVEMENT, reference: 'PRLV-2025-002' },
  { id: 'pmt-3', coproprieteId: 'copro-1', coproprietaireId: 'copro-owner-3', appelFondsId: 'appel-2025-q1', montant: 1925.00, datePaiement: date(2025, 1, 20), modePaiement: ModePaiement.VIREMENT, reference: 'VIR-2025-003' },
  { id: 'pmt-4', coproprieteId: 'copro-1', coproprietaireId: 'copro-owner-4', appelFondsId: 'appel-2025-q1', montant: 1640.63, datePaiement: date(2025, 1, 22), modePaiement: ModePaiement.CHEQUE, reference: 'CHQ-2025-004' },
  { id: 'pmt-5', coproprieteId: 'copro-1', coproprietaireId: 'copro-owner-5', appelFondsId: 'appel-2025-q1', montant: 1312.50, datePaiement: date(2025, 1, 25), modePaiement: ModePaiement.PRELEVEMENT, reference: 'PRLV-2025-005' },
  // Travaux payments
  { id: 'pmt-6', coproprieteId: 'copro-1', coproprietaireId: 'copro-owner-1', appelFondsId: 'appel-2025-trav-1', montant: 735.00, datePaiement: date(2025, 1, 18), modePaiement: ModePaiement.VIREMENT, reference: 'VIR-2025-T01' },
  { id: 'pmt-7', coproprieteId: 'copro-1', coproprietaireId: 'copro-owner-2', appelFondsId: 'appel-2025-trav-1', montant: 577.50, datePaiement: date(2025, 1, 20), modePaiement: ModePaiement.VIREMENT, reference: 'VIR-2025-T02' },
];

// ============================================
// FOURNISSEURS
// ============================================

export const MOCK_FOURNISSEURS: MockFournisseur[] = [
  { id: 'fourn-1', coproprieteId: 'copro-1', raisonSociale: 'EDF Entreprises', siret: '55208131766522', email: 'pro@edf.fr', domaine: 'Électricité', iban: 'FR7630004000031234567890143', bic: 'BNPAFRPP' },
  { id: 'fourn-2', coproprieteId: 'copro-1', raisonSociale: 'Veolia Eau', siret: '57202552601091', email: 'contact@veolia.fr', domaine: 'Eau', iban: 'FR7630006000011234567890189', bic: 'AGRIFRPP' },
  { id: 'fourn-3', coproprieteId: 'copro-1', raisonSociale: 'Otis France', siret: '55200001200016', telephone: '01 40 50 60 70', email: 'service@otis.fr', domaine: 'Ascenseur', iban: 'FR7617569000301234567890188', bic: 'CCBPFRPP' },
  { id: 'fourn-4', coproprieteId: 'copro-1', raisonSociale: 'Propreté Services Lyon', siret: '44512345600022', telephone: '04 78 90 12 34', email: 'contact@proprete-lyon.fr', domaine: 'Ménage' },
  { id: 'fourn-5', coproprieteId: 'copro-1', raisonSociale: 'Espaces Verts Rhone', siret: '52398765400011', telephone: '04 72 34 56 78', email: 'devis@ev-rhone.fr', domaine: 'Espaces verts' },
  { id: 'fourn-6', coproprieteId: 'copro-1', raisonSociale: 'AXA Assurances', siret: '57200001500064', email: 'entreprises@axa.fr', domaine: 'Assurance', iban: 'FR7630004028790001234567823', bic: 'BNPAFRPP' },
  { id: 'fourn-7', coproprieteId: 'copro-1', raisonSociale: 'Chauffage Urbain Lyon', siret: '38956723400019', telephone: '04 78 63 25 89', email: 'client@cul.fr', domaine: 'Chauffage' },
  { id: 'fourn-8', coproprieteId: 'copro-1', raisonSociale: 'Ravalement Pro', siret: '89123456700033', telephone: '04 78 45 67 89', email: 'devis@ravalement-pro.fr', domaine: 'Facade' },
];

// ============================================
// FACTURES
// ============================================

export const MOCK_FACTURES: MockFacture[] = [
  // 2024 factures - all paid
  { id: 'fact-2024-01', coproprieteId: 'copro-1', fournisseurId: 'fourn-1', fournisseurNom: 'EDF Entreprises', numero: 'EDF-2024-001', dateFacture: date(2024, 2, 15), dateEcheance: date(2024, 3, 15), montantHT: 1650.00, montantTVA: 330.00, montantTTC: 1980.00, statut: 'PAYEE', compteComptableId: '606' },
  { id: 'fact-2024-02', coproprieteId: 'copro-1', fournisseurId: 'fourn-2', fournisseurNom: 'Veolia Eau', numero: 'VEO-2024-001', dateFacture: date(2024, 3, 10), dateEcheance: date(2024, 4, 10), montantHT: 580.00, montantTVA: 31.90, montantTTC: 611.90, statut: 'PAYEE', compteComptableId: '606' },
  { id: 'fact-2024-03', coproprieteId: 'copro-1', fournisseurId: 'fourn-3', fournisseurNom: 'Otis France', numero: 'OTIS-2024-Q1', dateFacture: date(2024, 3, 31), dateEcheance: date(2024, 4, 30), montantHT: 2375.00, montantTVA: 475.00, montantTTC: 2850.00, statut: 'PAYEE', compteComptableId: '615' },
  { id: 'fact-2024-04', coproprieteId: 'copro-1', fournisseurId: 'fourn-4', fournisseurNom: 'Proprete Services Lyon', numero: 'PSL-2024-001', dateFacture: date(2024, 1, 31), dateEcheance: date(2024, 2, 28), montantHT: 1200.00, montantTVA: 240.00, montantTTC: 1440.00, statut: 'PAYEE', compteComptableId: '615' },
  { id: 'fact-2024-05', coproprieteId: 'copro-1', fournisseurId: 'fourn-6', fournisseurNom: 'AXA Assurances', numero: 'AXA-2024-PRIME', dateFacture: date(2024, 1, 15), dateEcheance: date(2024, 2, 15), montantHT: 4200.00, montantTVA: 0, montantTTC: 4200.00, statut: 'PAYEE', compteComptableId: '616' },

  // 2025 factures
  { id: 'fact-2025-01', coproprieteId: 'copro-1', fournisseurId: 'fourn-6', fournisseurNom: 'AXA Assurances', numero: 'AXA-2025-PRIME', dateFacture: date(2025, 1, 10), dateEcheance: date(2025, 2, 10), montantHT: 4500.00, montantTVA: 0, montantTTC: 4500.00, statut: 'PAYEE', compteComptableId: '616' },
  { id: 'fact-2025-02', coproprieteId: 'copro-1', fournisseurId: 'fourn-4', fournisseurNom: 'Proprete Services Lyon', numero: 'PSL-2025-001', dateFacture: date(2025, 1, 31), dateEcheance: date(2025, 2, 28), montantHT: 1250.00, montantTVA: 250.00, montantTTC: 1500.00, statut: 'A_PAYER', compteComptableId: '615' },
  { id: 'fact-2025-03', coproprieteId: 'copro-1', fournisseurId: 'fourn-3', fournisseurNom: 'Otis France', numero: 'OTIS-2025-Q1', dateFacture: date(2025, 1, 15), dateEcheance: date(2025, 2, 15), montantHT: 2500.00, montantTVA: 500.00, montantTTC: 3000.00, statut: 'A_VALIDER', compteComptableId: '615' },
];

// ============================================
// MOUVEMENTS BANCAIRES
// ============================================

export const MOCK_MOUVEMENTS_BANCAIRES: MockMouvementBancaire[] = [
  // Credits - payments received
  { id: 'mvt-1', coproprieteId: 'copro-1', compteBancaireId: 'cb-1', dateOperation: date(2025, 1, 15), dateValeur: date(2025, 1, 15), libelle: 'VIR LEBLANC MARIE CHARGES T1', montant: 1531.25, sens: 'CREDIT', statut: 'RAPPROCHE', paiementId: 'pmt-1' },
  { id: 'mvt-2', coproprieteId: 'copro-1', compteBancaireId: 'cb-1', dateOperation: date(2025, 1, 18), dateValeur: date(2025, 1, 18), libelle: 'PRLV MOREAU PIERRE CHARGES T1', montant: 1203.13, sens: 'CREDIT', statut: 'RAPPROCHE', paiementId: 'pmt-2' },
  { id: 'mvt-3', coproprieteId: 'copro-1', compteBancaireId: 'cb-1', dateOperation: date(2025, 1, 20), dateValeur: date(2025, 1, 20), libelle: 'VIR LAURENT SOPHIE CHARGES T1', montant: 1925.00, sens: 'CREDIT', statut: 'RAPPROCHE', paiementId: 'pmt-3' },
  { id: 'mvt-4', coproprieteId: 'copro-1', compteBancaireId: 'cb-1', dateOperation: date(2025, 1, 22), dateValeur: date(2025, 1, 24), libelle: 'REM CHQ MARTIN JEAN 004', montant: 1640.63, sens: 'CREDIT', statut: 'RAPPROCHE', paiementId: 'pmt-4' },
  // Debits - payments made
  { id: 'mvt-5', coproprieteId: 'copro-1', compteBancaireId: 'cb-1', dateOperation: date(2025, 1, 12), dateValeur: date(2025, 1, 12), libelle: 'VIR AXA ASSURANCES PRIME 2025', montant: 4500.00, sens: 'DEBIT', statut: 'RAPPROCHE', factureId: 'fact-2025-01' },
  // To reconcile
  { id: 'mvt-6', coproprieteId: 'copro-1', compteBancaireId: 'cb-1', dateOperation: date(2025, 1, 19), dateValeur: date(2025, 1, 19), libelle: 'VIR TRAVAUX LEBLANC', montant: 735.00, sens: 'CREDIT', statut: 'A_RAPPROCHER' },
  { id: 'mvt-7', coproprieteId: 'copro-1', compteBancaireId: 'cb-1', dateOperation: date(2025, 1, 21), dateValeur: date(2025, 1, 21), libelle: 'VIR MOREAU P TRAVAUX', montant: 577.50, sens: 'CREDIT', statut: 'A_RAPPROCHER' },
];

// ============================================
// ECRITURES COMPTABLES
// ============================================

export const MOCK_ECRITURES: MockEcritureComptable[] = [
  // Appel de fonds T1 2025
  { id: 'ecr-1', coproprieteId: 'copro-1', exerciceId: 'ex-2025', dateEcriture: date(2025, 1, 5), journalCode: 'OD', numeroPiece: 'AF-2025-Q1', libelle: 'Appel de fonds T1 2025', compteDebit: '450', compteCredit: '701', montant: 21875.00, origine: 'APPEL_FONDS', origineId: 'appel-2025-q1' },
  // Paiements
  { id: 'ecr-2', coproprieteId: 'copro-1', exerciceId: 'ex-2025', dateEcriture: date(2025, 1, 15), journalCode: 'BQ', numeroPiece: 'VIR-2025-001', libelle: 'Paiement LEBLANC Marie T1 2025', compteDebit: '512', compteCredit: '450', montant: 1531.25, origine: 'PAIEMENT', origineId: 'pmt-1' },
  { id: 'ecr-3', coproprieteId: 'copro-1', exerciceId: 'ex-2025', dateEcriture: date(2025, 1, 18), journalCode: 'BQ', numeroPiece: 'PRLV-2025-002', libelle: 'Paiement MOREAU Pierre T1 2025', compteDebit: '512', compteCredit: '450', montant: 1203.13, origine: 'PAIEMENT', origineId: 'pmt-2' },
  // Facture assurance
  { id: 'ecr-4', coproprieteId: 'copro-1', exerciceId: 'ex-2025', dateEcriture: date(2025, 1, 10), journalCode: 'AC', numeroPiece: 'AXA-2025-PRIME', libelle: 'Prime assurance immeuble 2025', compteDebit: '616', compteCredit: '401', montant: 4500.00, origine: 'FACTURE', origineId: 'fact-2025-01' },
  { id: 'ecr-5', coproprieteId: 'copro-1', exerciceId: 'ex-2025', dateEcriture: date(2025, 1, 12), journalCode: 'BQ', numeroPiece: 'VIR-AXA-2025', libelle: 'Reglement facture AXA assurance', compteDebit: '401', compteCredit: '512', montant: 4500.00, origine: 'FACTURE', origineId: 'fact-2025-01' },
];

// ============================================
// COMPTES COMPTABLES (Plan comptable simplifie)
// ============================================

export const MOCK_COMPTES_COMPTABLES: MockCompteComptable[] = [
  // Classe 1 - Capitaux
  { id: 'cpt-10', coproprieteId: 'copro-1', numero: '102', libelle: 'Provisions pour gros travaux', type: TypeCompte.PASSIF, niveau: 2, soldeDebit: 0, soldeCredit: 25000 },
  { id: 'cpt-11', coproprieteId: 'copro-1', numero: '103', libelle: 'Avances de tresorerie', type: TypeCompte.PASSIF, niveau: 2, soldeDebit: 0, soldeCredit: 5000 },
  // Classe 4 - Tiers
  { id: 'cpt-40', coproprieteId: 'copro-1', numero: '401', libelle: 'Fournisseurs', type: TypeCompte.PASSIF, niveau: 2, soldeDebit: 0, soldeCredit: 4500 },
  { id: 'cpt-45', coproprieteId: 'copro-1', numero: '450', libelle: 'Coproprietaires', type: TypeCompte.ACTIF, niveau: 2, soldeDebit: 8500, soldeCredit: 0 },
  // Classe 5 - Tresorerie
  { id: 'cpt-51', coproprieteId: 'copro-1', numero: '512', libelle: 'Banque compte courant', type: TypeCompte.ACTIF, niveau: 2, soldeDebit: 45750, soldeCredit: 0 },
  { id: 'cpt-53', coproprieteId: 'copro-1', numero: '531', libelle: 'Caisse', type: TypeCompte.ACTIF, niveau: 2, soldeDebit: 150, soldeCredit: 0 },
  // Classe 6 - Charges
  { id: 'cpt-60', coproprieteId: 'copro-1', numero: '606', libelle: 'Achats non stockes', type: TypeCompte.CHARGE, niveau: 2, soldeDebit: 0, soldeCredit: 0 },
  { id: 'cpt-61', coproprieteId: 'copro-1', numero: '615', libelle: 'Entretien et reparations', type: TypeCompte.CHARGE, niveau: 2, soldeDebit: 1700, soldeCredit: 0 },
  { id: 'cpt-62', coproprieteId: 'copro-1', numero: '616', libelle: 'Primes assurances', type: TypeCompte.CHARGE, niveau: 2, soldeDebit: 4500, soldeCredit: 0 },
  { id: 'cpt-63', coproprieteId: 'copro-1', numero: '622', libelle: 'Honoraires', type: TypeCompte.CHARGE, niveau: 2, soldeDebit: 0, soldeCredit: 0 },
  { id: 'cpt-64', coproprieteId: 'copro-1', numero: '626', libelle: 'Frais postaux', type: TypeCompte.CHARGE, niveau: 2, soldeDebit: 0, soldeCredit: 0 },
  // Classe 7 - Produits
  { id: 'cpt-70', coproprieteId: 'copro-1', numero: '701', libelle: 'Provisions pour charges', type: TypeCompte.PRODUIT, niveau: 2, soldeDebit: 0, soldeCredit: 21875 },
  { id: 'cpt-71', coproprieteId: 'copro-1', numero: '702', libelle: 'Provisions pour travaux', type: TypeCompte.PRODUIT, niveau: 2, soldeDebit: 0, soldeCredit: 15000 },
];

// ============================================
// AGGREGATE DATA FUNCTIONS
// ============================================

export const getInitialFinanceData = () => ({
  copropriete: MOCK_COPROPRIETE,
  coproprietaires: [...MOCK_COPROPRIETAIRES],
  lots: [...MOCK_LOTS],
  clesRepartition: [...MOCK_CLES_REPARTITION],
  exercices: [...MOCK_EXERCICES],
  budgets: [...MOCK_BUDGETS],
  appelsFonds: [...MOCK_APPELS_FONDS],
  paiements: [...MOCK_PAIEMENTS],
  factures: [...MOCK_FACTURES],
  fournisseurs: [...MOCK_FOURNISSEURS],
  mouvementsBancaires: [...MOCK_MOUVEMENTS_BANCAIRES],
  ecritures: [...MOCK_ECRITURES],
  comptesComptables: [...MOCK_COMPTES_COMPTABLES],
});

export type FinanceDataStore = ReturnType<typeof getInitialFinanceData>;
