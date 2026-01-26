/**
 * Mock Data - Copropriétaires
 *
 * @source Fusionné depuis :
 *   - src/data/mock/index.ts (données standard)
 *   - src/hooks/modules/useBudget.ts (données ALUR)
 * @created 2025-01-19
 *
 * Relations:
 * - copropriete_id → coproprietes.id
 * - user_id → users.id (optionnel, si compte utilisateur lié)
 *
 * Notes:
 * - Fusion des copropriétaires standard et ALUR
 * - Le champ fonds_alur contient les infos spécifiques au fonds travaux
 * - Les tantièmes spéciaux permettent les clés de répartition multiples
 */

import { BaseEntity, Adresse } from '../types';
import { COPROPRIETE_IDS } from './coproprietes';
import { USER_IDS } from './users';

// ============================================
// TYPES
// ============================================

export type Civilite = 'M.' | 'Mme' | 'M. et Mme';
export type TypePersonne = 'physique' | 'morale';

export interface TantiemesSpeciaux {
  ascenseur?: number;
  chauffage?: number;
  eau_froide?: number;
  eau_chaude?: number;
  parking?: number;
}

export interface FondsALUR {
  cotisation_annuelle: number;
  total_contributions: number;
  historique_contributions: ContributionALUR[];
  historique_proprietaires?: HistoriqueProprietaire[];
}

export interface ContributionALUR {
  id: string;
  date: string;
  montant: number;
  periode: string;
  statut: 'PAYEE' | 'EN_ATTENTE' | 'EN_RETARD';
}

export interface HistoriqueProprietaire {
  proprietaire: string;
  date_debut: string;
  date_fin?: string;
  contributions_cumulees: number;
}

export interface Coproprietaire extends BaseEntity {
  // Relations
  copropriete_id: string;
  user_id?: string;

  // Identification
  civilite: Civilite;
  nom: string;
  prenom?: string;
  raison_sociale?: string; // Pour les personnes morales (SCI, etc.)
  type: TypePersonne;

  // Contact
  email?: string;
  telephone?: string;
  telephone_secondaire?: string;

  // Propriété
  lot_principal_id?: string; // Référence au lot principal
  tantiemes_generaux: number;
  tantiemes_speciaux?: TantiemesSpeciaux;

  // Financier
  solde: number; // Positif = crédit copropriétaire, Négatif = dette
  fonds_alur?: FondsALUR;

  // Adresse de correspondance
  adresse_correspondance?: Adresse;

  // Statut
  is_actif: boolean;
  date_entree?: string;
  date_sortie?: string;

  // Notes
  notes_internes?: string;
}

// ============================================
// IDS PRÉGÉNÉRÉS
// ============================================

export const COPROPRIETAIRE_IDS = {
  LEBLANC_MARIE: 'cpro_11111111-1111-4111-8111-111111111111',
  MOREAU_PIERRE: 'cpro_22222222-2222-4222-8222-222222222222',
  LAURENT_SOPHIE: 'cpro_33333333-3333-4333-8333-333333333333',
  DUBOIS_JEAN: 'cpro_44444444-4444-4444-8444-444444444444',
  MARTIN_ANNE: 'cpro_55555555-5555-4555-8555-555555555555',
  DUPONT_MARTIN: 'cpro_66666666-6666-4666-8666-666666666666',
  BERNARD_FRANCOIS: 'cpro_77777777-7777-4777-8777-777777777777',
  SCI_LES_ORMES: 'cpro_88888888-8888-4888-8888-888888888888',
  RODRIGUEZ_CARLOS: 'cpro_99999999-9999-4999-8999-999999999999',
  SIMON_M: 'cpro_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  GARCIA_MME: 'cpro_bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  THOMAS_M: 'cpro_cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  LOPEZ_MME: 'cpro_dddddddd-dddd-4ddd-8ddd-dddddddddddd',
} as const;

// ============================================
// DONNÉES MOCK
// ============================================

export const COPROPRIETAIRES_MOCK: Coproprietaire[] = [
  // === Copropriétaires principaux (avec données ALUR complètes) ===
  {
    id: COPROPRIETAIRE_IDS.LEBLANC_MARIE,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    user_id: undefined,
    civilite: 'Mme',
    nom: 'LEBLANC',
    prenom: 'Marie',
    type: 'physique',
    email: 'marie.leblanc@email.fr',
    telephone: '06 11 22 33 44',
    tantiemes_generaux: 150,
    tantiemes_speciaux: { ascenseur: 120, chauffage: 140 },
    solde: 0,
    fonds_alur: {
      cotisation_annuelle: 637.50,
      total_contributions: 3825.00,
      historique_contributions: [
        { id: 'ca-1', date: '2024-01-15', montant: 159.38, periode: 'T1 2024', statut: 'PAYEE' },
        { id: 'ca-2', date: '2024-04-15', montant: 159.38, periode: 'T2 2024', statut: 'PAYEE' },
        { id: 'ca-3', date: '2024-07-15', montant: 159.38, periode: 'T3 2024', statut: 'PAYEE' },
        { id: 'ca-4', date: '2024-10-15', montant: 159.38, periode: 'T4 2024', statut: 'EN_ATTENTE' },
      ],
      historique_proprietaires: [
        { proprietaire: 'LEBLANC Marie', date_debut: '2020-03-01', contributions_cumulees: 3825.00 },
      ],
    },
    is_actif: true,
    date_entree: '2020-03-01',
    created_at: '2020-03-01T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: COPROPRIETAIRE_IDS.MOREAU_PIERRE,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    user_id: undefined,
    civilite: 'M.',
    nom: 'MOREAU',
    prenom: 'Pierre',
    type: 'physique',
    email: 'pierre.moreau@email.fr',
    telephone: '06 22 33 44 55',
    tantiemes_generaux: 120,
    tantiemes_speciaux: { ascenseur: 100, chauffage: 110 },
    solde: -250.00, // Dette de 250€
    fonds_alur: {
      cotisation_annuelle: 510.00,
      total_contributions: 4080.00,
      historique_contributions: [
        { id: 'ca-5', date: '2024-01-15', montant: 127.50, periode: 'T1 2024', statut: 'PAYEE' },
        { id: 'ca-6', date: '2024-04-15', montant: 127.50, periode: 'T2 2024', statut: 'PAYEE' },
        { id: 'ca-7', date: '2024-07-15', montant: 127.50, periode: 'T3 2024', statut: 'PAYEE' },
        { id: 'ca-8', date: '2024-10-15', montant: 127.50, periode: 'T4 2024', statut: 'EN_ATTENTE' },
      ],
      historique_proprietaires: [
        { proprietaire: 'BERNARD Jean', date_debut: '2019-01-01', date_fin: '2023-06-15', contributions_cumulees: 2295.00 },
        { proprietaire: 'MOREAU Pierre', date_debut: '2023-06-15', contributions_cumulees: 1785.00 },
      ],
    },
    is_actif: true,
    date_entree: '2023-06-15',
    created_at: '2023-06-15T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: COPROPRIETAIRE_IDS.LAURENT_SOPHIE,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    user_id: undefined,
    civilite: 'Mme',
    nom: 'LAURENT',
    prenom: 'Sophie',
    type: 'physique',
    email: 'sophie.laurent@email.fr',
    telephone: '06 33 44 55 66',
    tantiemes_generaux: 200,
    tantiemes_speciaux: { ascenseur: 180, chauffage: 190 },
    solde: 150.00, // Crédit de 150€
    fonds_alur: {
      cotisation_annuelle: 850.00,
      total_contributions: 5100.00,
      historique_contributions: [
        { id: 'ca-9', date: '2024-01-15', montant: 212.50, periode: 'T1 2024', statut: 'PAYEE' },
        { id: 'ca-10', date: '2024-04-15', montant: 212.50, periode: 'T2 2024', statut: 'PAYEE' },
        { id: 'ca-11', date: '2024-07-15', montant: 212.50, periode: 'T3 2024', statut: 'PAYEE' },
        { id: 'ca-12', date: '2024-10-15', montant: 212.50, periode: 'T4 2024', statut: 'EN_RETARD' },
      ],
      historique_proprietaires: [
        { proprietaire: 'LAURENT Sophie', date_debut: '2018-09-01', contributions_cumulees: 5100.00 },
      ],
    },
    is_actif: true,
    date_entree: '2018-09-01',
    created_at: '2018-09-01T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: COPROPRIETAIRE_IDS.DUBOIS_JEAN,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    user_id: undefined,
    civilite: 'M.',
    nom: 'DUBOIS',
    prenom: 'Jean',
    type: 'physique',
    email: 'jean.dubois@email.fr',
    telephone: '06 44 55 66 77',
    tantiemes_generaux: 98,
    tantiemes_speciaux: { ascenseur: 80 },
    solde: 0,
    is_actif: true,
    date_entree: '2021-01-15',
    created_at: '2021-01-15T00:00:00Z',
    updated_at: '2025-01-10T14:30:00Z',
  },
  {
    id: COPROPRIETAIRE_IDS.MARTIN_ANNE,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    user_id: undefined,
    civilite: 'Mme',
    nom: 'MARTIN',
    prenom: 'Anne',
    type: 'physique',
    email: 'anne.martin@email.fr',
    telephone: '06 55 66 77 88',
    tantiemes_generaux: 135,
    tantiemes_speciaux: { ascenseur: 120, chauffage: 130 },
    solde: 0,
    is_actif: true,
    date_entree: '2019-06-01',
    created_at: '2019-06-01T00:00:00Z',
    updated_at: '2025-01-12T09:00:00Z',
  },
  {
    id: COPROPRIETAIRE_IDS.DUPONT_MARTIN,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    user_id: USER_IDS.PRESIDENT_CS, // Lié au compte utilisateur Président CS
    civilite: 'M.',
    nom: 'DUPONT',
    prenom: 'Martin',
    type: 'physique',
    email: 'martin.dupont@example.com',
    telephone: '06 12 34 56 78',
    tantiemes_generaux: 180,
    tantiemes_speciaux: { ascenseur: 160, chauffage: 170 },
    solde: 0,
    is_actif: true,
    date_entree: '2015-03-01',
    notes_internes: 'Président du Conseil Syndical',
    created_at: '2015-03-01T00:00:00Z',
    updated_at: '2025-01-18T14:30:00Z',
  },
  // === Personne morale (SCI) ===
  {
    id: COPROPRIETAIRE_IDS.SCI_LES_ORMES,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    user_id: undefined,
    civilite: 'M.',
    nom: 'SCI Les Ormes',
    raison_sociale: 'SCI Les Ormes',
    type: 'morale',
    email: 'contact@sci-les-ormes.fr',
    telephone: '01 45 67 89 00',
    tantiemes_generaux: 300,
    tantiemes_speciaux: { ascenseur: 0 }, // Commerce RDC, pas d'ascenseur
    solde: 0,
    fonds_alur: {
      cotisation_annuelle: 1275.00,
      total_contributions: 7650.00,
      historique_contributions: [
        { id: 'ca-13', date: '2024-01-15', montant: 318.75, periode: 'T1 2024', statut: 'PAYEE' },
        { id: 'ca-14', date: '2024-04-15', montant: 318.75, periode: 'T2 2024', statut: 'PAYEE' },
        { id: 'ca-15', date: '2024-07-15', montant: 318.75, periode: 'T3 2024', statut: 'PAYEE' },
        { id: 'ca-16', date: '2024-10-15', montant: 318.75, periode: 'T4 2024', statut: 'PAYEE' },
      ],
      historique_proprietaires: [
        { proprietaire: 'SCI Les Ormes', date_debut: '2017-01-01', contributions_cumulees: 7650.00 },
      ],
    },
    adresse_correspondance: {
      ligne1: '100 Avenue des Champs-Élysées',
      codePostal: '75008',
      ville: 'Paris',
    },
    is_actif: true,
    date_entree: '2017-01-01',
    notes_internes: 'Commerce RDC - Local commercial',
    created_at: '2017-01-01T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: COPROPRIETAIRE_IDS.RODRIGUEZ_CARLOS,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    user_id: undefined,
    civilite: 'M.',
    nom: 'RODRIGUEZ',
    prenom: 'Carlos',
    type: 'physique',
    email: 'carlos.rodriguez@email.fr',
    telephone: '06 66 77 88 99',
    tantiemes_generaux: 130,
    tantiemes_speciaux: { ascenseur: 110, chauffage: 120 },
    solde: 0,
    fonds_alur: {
      cotisation_annuelle: 552.50,
      total_contributions: 552.50,
      historique_contributions: [
        { id: 'ca-17', date: '2024-01-15', montant: 138.13, periode: 'T1 2024', statut: 'PAYEE' },
        { id: 'ca-18', date: '2024-04-15', montant: 138.13, periode: 'T2 2024', statut: 'PAYEE' },
        { id: 'ca-19', date: '2024-07-15', montant: 138.13, periode: 'T3 2024', statut: 'PAYEE' },
        { id: 'ca-20', date: '2024-10-15', montant: 138.13, periode: 'T4 2024', statut: 'EN_ATTENTE' },
      ],
      historique_proprietaires: [
        { proprietaire: 'MOREAU Alice', date_debut: '2018-01-01', date_fin: '2021-03-01', contributions_cumulees: 1657.50 },
        { proprietaire: 'PETIT François', date_debut: '2021-03-01', date_fin: '2024-01-15', contributions_cumulees: 1657.50 },
        { proprietaire: 'RODRIGUEZ Carlos', date_debut: '2024-01-15', contributions_cumulees: 552.50 },
      ],
    },
    is_actif: true,
    date_entree: '2024-01-15',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  // === Copropriétaires avec impayés ===
  {
    id: COPROPRIETAIRE_IDS.SIMON_M,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    user_id: undefined,
    civilite: 'M.',
    nom: 'SIMON',
    prenom: 'Patrick',
    type: 'physique',
    email: 'patrick.simon@email.fr',
    telephone: '06 77 88 99 00',
    tantiemes_generaux: 110,
    solde: -1850.00, // Impayé
    is_actif: true,
    date_entree: '2020-09-01',
    notes_internes: 'Impayé en cours - Relance 2 envoyée',
    created_at: '2020-09-01T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: COPROPRIETAIRE_IDS.GARCIA_MME,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    user_id: undefined,
    civilite: 'Mme',
    nom: 'GARCIA',
    prenom: 'Elena',
    type: 'physique',
    email: 'elena.garcia@email.fr',
    telephone: '06 88 99 00 11',
    tantiemes_generaux: 95,
    solde: -1120.00, // Impayé
    is_actif: true,
    date_entree: '2022-03-01',
    notes_internes: 'Impayé en cours - Relance 1 envoyée',
    created_at: '2022-03-01T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: COPROPRIETAIRE_IDS.THOMAS_M,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    user_id: undefined,
    civilite: 'M.',
    nom: 'THOMAS',
    prenom: 'Julien',
    type: 'physique',
    email: 'julien.thomas@email.fr',
    telephone: '06 99 00 11 22',
    tantiemes_generaux: 140,
    solde: -2750.00, // Impayé
    is_actif: true,
    date_entree: '2019-11-01',
    notes_internes: 'Impayé en cours - En retard simple',
    created_at: '2019-11-01T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: COPROPRIETAIRE_IDS.LOPEZ_MME,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    user_id: undefined,
    civilite: 'Mme',
    nom: 'LOPEZ',
    prenom: 'Maria',
    type: 'physique',
    email: 'maria.lopez@email.fr',
    telephone: '06 00 11 22 33',
    tantiemes_generaux: 160,
    solde: -4200.00, // Impayé contentieux
    is_actif: true,
    date_entree: '2018-05-01',
    notes_internes: 'CONTENTIEUX - Procédure en cours',
    created_at: '2018-05-01T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
];

// ============================================
// STATISTIQUES
// ============================================

export const COPROPRIETAIRES_STATS = {
  total: COPROPRIETAIRES_MOCK.length,
  actifs: COPROPRIETAIRES_MOCK.filter((c) => c.is_actif).length,
  par_type: {
    physique: COPROPRIETAIRES_MOCK.filter((c) => c.type === 'physique').length,
    morale: COPROPRIETAIRES_MOCK.filter((c) => c.type === 'morale').length,
  },
  total_tantiemes: COPROPRIETAIRES_MOCK.reduce((acc, c) => acc + c.tantiemes_generaux, 0),
  avec_compte_utilisateur: COPROPRIETAIRES_MOCK.filter((c) => c.user_id).length,
  avec_impaye: COPROPRIETAIRES_MOCK.filter((c) => c.solde < 0).length,
  total_impayes: COPROPRIETAIRES_MOCK.filter((c) => c.solde < 0).reduce((acc, c) => acc + Math.abs(c.solde), 0),
  avec_fonds_alur: COPROPRIETAIRES_MOCK.filter((c) => c.fonds_alur).length,
};

// ============================================
// TABLE DE CORRESPONDANCE
// ============================================

export const COPROPRIETAIRES_ID_MAP: Record<string, string> = {
  '1': COPROPRIETAIRE_IDS.LEBLANC_MARIE,
  '2': COPROPRIETAIRE_IDS.MOREAU_PIERRE,
  '3': COPROPRIETAIRE_IDS.LAURENT_SOPHIE,
  '4': COPROPRIETAIRE_IDS.SCI_LES_ORMES,
  '5': COPROPRIETAIRE_IDS.RODRIGUEZ_CARLOS,
  // IDs ventes/impayés
  'Isabelle DUBOIS': COPROPRIETAIRE_IDS.LAURENT_SOPHIE, // Mapping par nom
  'Pierre MOREAU': COPROPRIETAIRE_IDS.MOREAU_PIERRE,
};

// ============================================
// HELPERS
// ============================================

export function getCoproprietaireById(id: string): Coproprietaire | undefined {
  return COPROPRIETAIRES_MOCK.find((c) => c.id === id);
}

export function getCoproprietairesByCopropriete(coproprieteId: string): Coproprietaire[] {
  return COPROPRIETAIRES_MOCK.filter((c) => c.copropriete_id === coproprieteId);
}

export function getCoproprietairesAvecImpayes(): Coproprietaire[] {
  return COPROPRIETAIRES_MOCK.filter((c) => c.solde < 0);
}

export function getCoproprietairesAvecFondsALUR(): Coproprietaire[] {
  return COPROPRIETAIRES_MOCK.filter((c) => c.fonds_alur);
}

export function calculerQuotePartCoproprietaire(
  coproprietaireId: string,
  totalTantiemes: number
): number {
  const copro = getCoproprietaireById(coproprietaireId);
  if (!copro) return 0;
  return (copro.tantiemes_generaux / totalTantiemes) * 100;
}

export function formatNomComplet(copro: Coproprietaire): string {
  if (copro.type === 'morale') {
    return copro.raison_sociale || copro.nom;
  }
  return `${copro.civilite} ${copro.prenom || ''} ${copro.nom}`.trim();
}
