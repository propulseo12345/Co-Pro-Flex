/**
 * Mock Data - Résolutions d'Assemblées Générales
 *
 * @source Créé à partir des structures AG et références existantes
 * @created 2025-01-19
 *
 * Relations:
 * - assemblee_id → assemblees.id
 * - budget_id → budgets.id (optionnel)
 *
 * Notes:
 * - Résolutions pour AG 2024 et AGE Ravalement 2023
 * - Types de majorité selon la loi française :
 *   - Article 24 : Majorité simple (présents/représentés)
 *   - Article 25 : Majorité absolue (tous copropriétaires)
 *   - Article 25-1 : Passerelle si 1/3 des voix à l'art. 25
 *   - Article 26 : Double majorité (2/3 tantièmes)
 *   - Unanimité : 100% des tantièmes
 */

import { BaseEntity } from '../types';
import { ASSEMBLEE_IDS, TOTAL_TANTIEMES } from './assemblees';
import { BUDGET_IDS } from './budgets';

// ============================================
// TYPES
// ============================================

export type TypeMajorite =
  | 'article_24' // Majorité simple
  | 'article_25' // Majorité absolue
  | 'article_25_1' // Passerelle 25→24
  | 'article_26' // Double majorité
  | 'article_26_1' // Passerelle 26→25
  | 'unanimite';

export type ResolutionStatut =
  | 'en_attente'
  | 'adoptee'
  | 'rejetee'
  | 'ajournee'
  | 'sans_objet';

export type CategorieResolution =
  | 'budget'
  | 'travaux'
  | 'contrat'
  | 'syndic'
  | 'reglement'
  | 'divers';

export interface Resolution extends BaseEntity {
  // FK Relations
  assemblee_id: string;
  budget_id?: string;

  // Identification
  numero: number; // Ordre dans l'AG
  reference: string; // "RES-2024-AG-001"

  // Contenu
  titre: string;
  description: string;
  categorie: CategorieResolution;

  // Majorité
  type_majorite: TypeMajorite;
  article_loi: string; // "Article 24", "Article 25", etc.

  // Résultat
  statut: ResolutionStatut;
  votes_pour: number; // En tantièmes
  votes_contre: number;
  abstentions: number;
  non_votants: number;

  // Montant concerné si applicable
  montant_concerne?: number;

  // Exécution
  date_execution_prevue?: string;
  responsable_execution?: string;
  commentaire_execution?: string;

  // Observations
  observations?: string;
}

// ============================================
// IDS PRÉGÉNÉRÉS
// ============================================

export const RESOLUTION_IDS = {
  // AG 2024 - Budget et gestion
  BUDGET_2025: 'res_11111111-1111-4111-8111-111111111111',
  TRAVAUX_ISOLATION: 'res_22222222-2222-4222-8222-222222222222',
  ALUR_2025: 'res_33333333-3333-4333-8333-333333333333',
  APPRO_COMPTES_2024: 'res_44444444-4444-4444-8444-444444444444',
  QUITUS_SYNDIC: 'res_55555555-5555-4555-8555-555555555555',
  RENOUV_SYNDIC: 'res_66666666-6666-4666-8666-666666666666',
  ELECTION_CS: 'res_77777777-7777-4777-8777-777777777777',
  HONORAIRES_SYNDIC: 'res_88888888-8888-4888-8888-888888888888',
  // AGE Ravalement 2023
  TRAVAUX_RAVALEMENT: 'res_99999999-9999-4999-8999-999999999999',
  APPEL_FONDS_RAVALEMENT: 'res_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  // AG 2024 - Divers
  MODIFICATION_REGLEMENT: 'res_bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  QUESTIONS_DIVERSES: 'res_cccccccc-cccc-4ccc-8ccc-cccccccccccc',
} as const;

// ============================================
// CONSTANTES DE CALCUL
// ============================================

// Tantièmes votants AG 2024: 1218 présents + 440 représentés + 160 correspondance = 1818 (100%)
const TANTIEMES_VOTANTS_AG_2024 = 1818;

// Seuils de majorité AG 2024
const SEUIL_ART_24_AG_2024 = Math.floor(TANTIEMES_VOTANTS_AG_2024 / 2) + 1; // 910
const SEUIL_ART_25 = Math.floor(TOTAL_TANTIEMES / 2) + 1; // 910
const SEUIL_ART_26 = Math.floor((TOTAL_TANTIEMES * 2) / 3) + 1; // 1213

// ============================================
// DONNÉES MOCK
// ============================================

export const RESOLUTIONS_MOCK: Resolution[] = [
  // ============================================
  // AG ORDINAIRE 2024 - Résolutions obligatoires
  // ============================================
  {
    id: RESOLUTION_IDS.APPRO_COMPTES_2024,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    budget_id: undefined,
    numero: 1,
    reference: 'RES-2024-001',
    titre: "Approbation des comptes de l'exercice 2023",
    description:
      "Approbation des comptes de l'exercice clos le 31 décembre 2023, tels que présentés par le syndic",
    categorie: 'budget',
    type_majorite: 'article_24',
    article_loi: 'Article 24',
    statut: 'adoptee',
    votes_pour: 1700,
    votes_contre: 68,
    abstentions: 50,
    non_votants: 0,
    observations: 'Comptes approuvés à la quasi-unanimité',
    created_at: '2024-06-15T00:00:00Z',
    updated_at: '2024-06-15T00:00:00Z',
  },
  {
    id: RESOLUTION_IDS.QUITUS_SYNDIC,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    budget_id: undefined,
    numero: 2,
    reference: 'RES-2024-002',
    titre: 'Quitus au syndic pour sa gestion 2023',
    description:
      "Donner quitus au syndic pour sa gestion de l'exercice 2023",
    categorie: 'syndic',
    type_majorite: 'article_24',
    article_loi: 'Article 24',
    statut: 'adoptee',
    votes_pour: 1650,
    votes_contre: 118,
    abstentions: 50,
    non_votants: 0,
    observations: 'Quitus accordé',
    created_at: '2024-06-15T00:00:00Z',
    updated_at: '2024-06-15T00:00:00Z',
  },
  {
    id: RESOLUTION_IDS.BUDGET_2025,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    budget_id: BUDGET_IDS.FONCTIONNEMENT_2025,
    numero: 3,
    reference: 'RES-2024-003',
    titre: 'Adoption du budget prévisionnel 2025',
    description:
      "Adoption du budget prévisionnel pour l'exercice 2025, d'un montant total de 76 800 €",
    categorie: 'budget',
    type_majorite: 'article_24',
    article_loi: 'Article 24',
    statut: 'adoptee',
    votes_pour: 1580,
    votes_contre: 138,
    abstentions: 100,
    non_votants: 0,
    montant_concerne: 76800,
    observations: 'Budget adopté - Hausse de 3% par rapport à 2024',
    created_at: '2024-06-15T00:00:00Z',
    updated_at: '2024-06-15T00:00:00Z',
  },
  {
    id: RESOLUTION_IDS.ALUR_2025,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    budget_id: BUDGET_IDS.ALUR_2025,
    numero: 4,
    reference: 'RES-2024-004',
    titre: 'Cotisation annuelle au fonds travaux ALUR 2025',
    description:
      "Fixation de la cotisation annuelle au fonds de travaux (loi ALUR) à 5% du budget prévisionnel, soit 4 250 €",
    categorie: 'budget',
    type_majorite: 'article_24',
    article_loi: 'Article 24',
    statut: 'adoptee',
    votes_pour: 1700,
    votes_contre: 68,
    abstentions: 50,
    non_votants: 0,
    montant_concerne: 4250,
    observations: 'Cotisation ALUR maintenue à 5%',
    created_at: '2024-06-15T00:00:00Z',
    updated_at: '2024-06-15T00:00:00Z',
  },
  {
    id: RESOLUTION_IDS.RENOUV_SYNDIC,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    budget_id: undefined,
    numero: 5,
    reference: 'RES-2024-005',
    titre: 'Renouvellement du mandat de syndic bénévole',
    description:
      "Renouvellement du mandat de syndic bénévole de M. DUPONT Martin pour une durée de 3 ans (2024-2027)",
    categorie: 'syndic',
    type_majorite: 'article_25',
    article_loi: 'Article 25',
    statut: 'adoptee',
    votes_pour: 1400,
    votes_contre: 268,
    abstentions: 150,
    non_votants: 0,
    date_execution_prevue: '2024-06-15',
    responsable_execution: 'Président CS',
    observations: 'Mandat renouvelé pour 3 ans - Majorité absolue atteinte',
    created_at: '2024-06-15T00:00:00Z',
    updated_at: '2024-06-15T00:00:00Z',
  },
  {
    id: RESOLUTION_IDS.HONORAIRES_SYNDIC,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    budget_id: undefined,
    numero: 6,
    reference: 'RES-2024-006',
    titre: 'Fixation des honoraires du syndic bénévole',
    description:
      "Fixation des honoraires du syndic bénévole à 0 € (bénévolat) avec remboursement des frais réels sur justificatifs (plafond 500 €/an)",
    categorie: 'syndic',
    type_majorite: 'article_24',
    article_loi: 'Article 24',
    statut: 'adoptee',
    votes_pour: 1750,
    votes_contre: 18,
    abstentions: 50,
    non_votants: 0,
    montant_concerne: 500,
    observations: 'Syndic bénévole - Frais plafonnés à 500€/an',
    created_at: '2024-06-15T00:00:00Z',
    updated_at: '2024-06-15T00:00:00Z',
  },
  {
    id: RESOLUTION_IDS.ELECTION_CS,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    budget_id: undefined,
    numero: 7,
    reference: 'RES-2024-007',
    titre: 'Élection des membres du Conseil Syndical',
    description:
      "Élection des membres du Conseil Syndical pour 3 ans : M. DUPONT (Président), Mme LAURENT (Vice-Présidente), M. MOREAU (Trésorier), Mme MARTIN (Secrétaire), M. DUBOIS (Membre)",
    categorie: 'divers',
    type_majorite: 'article_25',
    article_loi: 'Article 25',
    statut: 'adoptee',
    votes_pour: 1500,
    votes_contre: 168,
    abstentions: 150,
    non_votants: 0,
    date_execution_prevue: '2024-06-15',
    observations: 'CS renouvelé - 5 membres élus',
    created_at: '2024-06-15T00:00:00Z',
    updated_at: '2024-06-15T00:00:00Z',
  },

  // ============================================
  // AG ORDINAIRE 2024 - Travaux
  // ============================================
  {
    id: RESOLUTION_IDS.TRAVAUX_ISOLATION,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    budget_id: BUDGET_IDS.TRAVAUX_ISOLATION,
    numero: 8,
    reference: 'RES-2024-008',
    titre: 'Travaux d\'isolation thermique des combles',
    description:
      "Adoption des travaux d'isolation thermique des combles pour un montant de 45 000 € TTC, avec appel de fonds exceptionnel",
    categorie: 'travaux',
    type_majorite: 'article_25',
    article_loi: 'Article 25',
    statut: 'adoptee',
    votes_pour: 1350,
    votes_contre: 318,
    abstentions: 150,
    non_votants: 0,
    montant_concerne: 45000,
    date_execution_prevue: '2024-09-01',
    responsable_execution: 'Syndic',
    commentaire_execution: 'Travaux prévus automne 2024',
    observations: 'Majorité absolue atteinte - Entreprise à sélectionner',
    created_at: '2024-06-15T00:00:00Z',
    updated_at: '2024-06-15T00:00:00Z',
  },
  {
    id: RESOLUTION_IDS.MODIFICATION_REGLEMENT,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    budget_id: undefined,
    numero: 9,
    reference: 'RES-2024-009',
    titre: 'Modification du règlement intérieur - Vélos électriques',
    description:
      "Modification du règlement intérieur pour autoriser le stationnement des vélos électriques dans le local vélos avec installation de prises de recharge",
    categorie: 'reglement',
    type_majorite: 'article_24',
    article_loi: 'Article 24',
    statut: 'adoptee',
    votes_pour: 1600,
    votes_contre: 118,
    abstentions: 100,
    non_votants: 0,
    montant_concerne: 2500,
    date_execution_prevue: '2024-09-01',
    observations: 'Installation de 4 prises de recharge prévue',
    created_at: '2024-06-15T00:00:00Z',
    updated_at: '2024-06-15T00:00:00Z',
  },
  {
    id: RESOLUTION_IDS.QUESTIONS_DIVERSES,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2024,
    budget_id: undefined,
    numero: 10,
    reference: 'RES-2024-010',
    titre: 'Questions diverses',
    description:
      "Discussion des questions diverses soulevées par les copropriétaires (bruit, propreté, etc.)",
    categorie: 'divers',
    type_majorite: 'article_24',
    article_loi: 'Article 24',
    statut: 'sans_objet',
    votes_pour: 0,
    votes_contre: 0,
    abstentions: 0,
    non_votants: 1818,
    observations: 'Point d\'information - Pas de vote requis',
    created_at: '2024-06-15T00:00:00Z',
    updated_at: '2024-06-15T00:00:00Z',
  },

  // ============================================
  // AGE RAVALEMENT 2023
  // ============================================
  {
    id: RESOLUTION_IDS.TRAVAUX_RAVALEMENT,
    assemblee_id: ASSEMBLEE_IDS.AGE_RAVALEMENT_2023,
    budget_id: undefined,
    numero: 1,
    reference: 'RES-2023-AGE-001',
    titre: 'Travaux de ravalement de façade',
    description:
      "Adoption des travaux de ravalement de façade du bâtiment principal pour un montant de 85 000 € TTC (entreprise Ravalement Express SARL)",
    categorie: 'travaux',
    type_majorite: 'article_25',
    article_loi: 'Article 25',
    statut: 'adoptee',
    votes_pour: 1200,
    votes_contre: 458,
    abstentions: 160,
    non_votants: 0,
    montant_concerne: 85000,
    date_execution_prevue: '2024-03-15',
    responsable_execution: 'Syndic',
    commentaire_execution: 'Travaux terminés le 15/11/2024 - PV réception signé',
    observations: 'Majorité absolue atteinte - Travaux planifiés pour printemps 2024',
    created_at: '2023-10-15T00:00:00Z',
    updated_at: '2024-11-15T00:00:00Z',
  },
  {
    id: RESOLUTION_IDS.APPEL_FONDS_RAVALEMENT,
    assemblee_id: ASSEMBLEE_IDS.AGE_RAVALEMENT_2023,
    budget_id: undefined,
    numero: 2,
    reference: 'RES-2023-AGE-002',
    titre: 'Appel de fonds exceptionnel travaux ravalement',
    description:
      "Adoption de l'appel de fonds exceptionnel de 85 000 € pour financer les travaux de ravalement, appelé en 3 fois (30% à la commande, 40% au démarrage, 30% à la réception)",
    categorie: 'budget',
    type_majorite: 'article_24',
    article_loi: 'Article 24',
    statut: 'adoptee',
    votes_pour: 1400,
    votes_contre: 258,
    abstentions: 160,
    non_votants: 0,
    montant_concerne: 85000,
    observations: 'Échéancier: 25 500€ / 34 000€ / 25 500€',
    created_at: '2023-10-15T00:00:00Z',
    updated_at: '2023-10-15T00:00:00Z',
  },
];

// ============================================
// STATISTIQUES
// ============================================

export const RESOLUTIONS_STATS = {
  total: RESOLUTIONS_MOCK.length,
  par_statut: {
    adoptee: RESOLUTIONS_MOCK.filter((r) => r.statut === 'adoptee').length,
    rejetee: RESOLUTIONS_MOCK.filter((r) => r.statut === 'rejetee').length,
    ajournee: RESOLUTIONS_MOCK.filter((r) => r.statut === 'ajournee').length,
    en_attente: RESOLUTIONS_MOCK.filter((r) => r.statut === 'en_attente').length,
    sans_objet: RESOLUTIONS_MOCK.filter((r) => r.statut === 'sans_objet').length,
  },
  par_majorite: {
    article_24: RESOLUTIONS_MOCK.filter((r) => r.type_majorite === 'article_24')
      .length,
    article_25: RESOLUTIONS_MOCK.filter((r) => r.type_majorite === 'article_25')
      .length,
    article_26: RESOLUTIONS_MOCK.filter((r) => r.type_majorite === 'article_26')
      .length,
    unanimite: RESOLUTIONS_MOCK.filter((r) => r.type_majorite === 'unanimite')
      .length,
  },
  par_categorie: {
    budget: RESOLUTIONS_MOCK.filter((r) => r.categorie === 'budget').length,
    travaux: RESOLUTIONS_MOCK.filter((r) => r.categorie === 'travaux').length,
    syndic: RESOLUTIONS_MOCK.filter((r) => r.categorie === 'syndic').length,
    contrat: RESOLUTIONS_MOCK.filter((r) => r.categorie === 'contrat').length,
    reglement: RESOLUTIONS_MOCK.filter((r) => r.categorie === 'reglement').length,
    divers: RESOLUTIONS_MOCK.filter((r) => r.categorie === 'divers').length,
  },
  montant_total_vote: RESOLUTIONS_MOCK.reduce(
    (sum, r) => sum + (r.montant_concerne || 0),
    0
  ),
};

// ============================================
// TABLE DE CORRESPONDANCE (migration)
// ============================================

export const RESOLUTION_ID_MAP: Record<string, string> = {
  '2024-AG-001': RESOLUTION_IDS.BUDGET_2025,
  '2024-AG-002': RESOLUTION_IDS.TRAVAUX_ISOLATION,
  '2024-AG-003': RESOLUTION_IDS.ALUR_2025,
};

// ============================================
// HELPERS
// ============================================

export function getResolutionById(id: string): Resolution | undefined {
  return RESOLUTIONS_MOCK.find((r) => r.id === id);
}

export function getResolutionsByAssemblee(assembleeId: string): Resolution[] {
  return RESOLUTIONS_MOCK.filter((r) => r.assemblee_id === assembleeId).sort(
    (a, b) => a.numero - b.numero
  );
}

export function getResolutionsAdoptees(): Resolution[] {
  return RESOLUTIONS_MOCK.filter((r) => r.statut === 'adoptee');
}

export function getResolutionsRejetees(): Resolution[] {
  return RESOLUTIONS_MOCK.filter((r) => r.statut === 'rejetee');
}

export function getResolutionsByCategorie(
  categorie: CategorieResolution
): Resolution[] {
  return RESOLUTIONS_MOCK.filter((r) => r.categorie === categorie);
}

export function calculerResultatResolution(resolution: Resolution): {
  total_exprime: number;
  pourcentage_pour: number;
  pourcentage_contre: number;
  est_adoptee: boolean;
  seuil_requis: number;
} {
  const totalExprime =
    resolution.votes_pour + resolution.votes_contre + resolution.abstentions;
  const pourcentagePour =
    totalExprime > 0
      ? Math.round((resolution.votes_pour / totalExprime) * 10000) / 100
      : 0;
  const pourcentageContre =
    totalExprime > 0
      ? Math.round((resolution.votes_contre / totalExprime) * 10000) / 100
      : 0;

  let seuilRequis: number;
  switch (resolution.type_majorite) {
    case 'article_24':
      seuilRequis = Math.floor(totalExprime / 2) + 1;
      break;
    case 'article_25':
    case 'article_25_1':
      seuilRequis = SEUIL_ART_25;
      break;
    case 'article_26':
    case 'article_26_1':
      seuilRequis = SEUIL_ART_26;
      break;
    case 'unanimite':
      seuilRequis = TOTAL_TANTIEMES;
      break;
    default:
      seuilRequis = Math.floor(totalExprime / 2) + 1;
  }

  return {
    total_exprime: totalExprime,
    pourcentage_pour: pourcentagePour,
    pourcentage_contre: pourcentageContre,
    est_adoptee: resolution.votes_pour >= seuilRequis,
    seuil_requis: seuilRequis,
  };
}

export function verifierPasserelle25_1(resolution: Resolution): boolean {
  // Article 25-1 : Si l'art. 25 n'est pas atteint mais 1/3 des voix ont voté pour
  if (resolution.type_majorite !== 'article_25') return false;
  if (resolution.votes_pour >= SEUIL_ART_25) return false; // Déjà adopté

  const seuilPasserelle = Math.floor(TOTAL_TANTIEMES / 3);
  return resolution.votes_pour >= seuilPasserelle;
}
