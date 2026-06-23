/**
 * Fixture « copro golden » de la campagne de test E2E (Acte 1 = onboarding riche).
 *
 * Données volontairement RICHES (2 bâtiments, 18 lots de natures variées, 10 propriétaires
 * dont une SCI, 5 clés spéciales + la clé générale, budget multi-postes) pour exercer le
 * VRAI wizard d'onboarding de bout en bout et asserter ensuite la structure + la compta.
 *
 * Tout est typé explicitement (aucun `any`) et figé ici : `onboardGolden` est purement
 * data-driven sur cette fixture, et la spec assertive recalcule ses attendus depuis elle.
 *
 * NB display_name : la vue `v_coproprietaires_overview` construit le nom affiché ainsi —
 *   - personne : `trim(first_name + ' ' + last_name)`
 *   - société  : `company_name`
 * Comme l'étape 2 du wizard ne sait créer que des PERSONNES (pas de toggle société), on
 * découpe chaque libellé `owner` en first_name = 1er mot, last_name = le reste. Le
 * display_name reconstruit est alors STRICTEMENT égal au libellé d'origine (ex.
 * « SCI Les Tilleuls » → first « SCI » / last « Les Tilleuls » → display « SCI Les Tilleuls »).
 * On peut donc cibler une ligne / une option <select> par le libellé brut de la fixture.
 */

/** Nature d'un lot — valeurs de l'enum SQL `lot_type` (cf. 0003_enums_domaines / lots/api). */
export type GoldenLotType =
  | 'appartement'
  | 'studio'
  | 'commerce'
  | 'bureau'
  | 'cave'
  | 'parking'
  | 'garage'
  | 'local_technique'
  | 'autre';

/** Base de calcul d'une clé de répartition (cf. `RepartitionBasis`). */
export type GoldenKeyBasis = 'tantiemes' | 'surface' | 'custom';

/** Portée d'une clé (cf. `CoverageMode`). Toutes les clés golden spéciales sont `subset`. */
export type GoldenKeyCoverage = 'subset' | 'all_lots';

export interface GoldenLot {
  /** Référence métier du lot (ex. « A-101 »). Unique dans la copro. */
  ref: string;
  type: GoldenLotType;
  /** Étage (RDC = 0, sous-sol négatif). */
  floor: number;
  /** Surface en m². */
  surface: number;
  /** Tantièmes généraux (clé générale « Charges générales »). */
  tantieme: number;
  /** Propriétaire — libellé brut, égal au display_name (voir en-tête). */
  owner: string;
  /** Code du bâtiment de rattachement (« A » / « B »). */
  building: string;
}

export interface GoldenBuilding {
  /** Code court interne (« A », « B ») — sert à relier lots ↔ bâtiment dans la fixture. */
  code: string;
  /** Nom saisi dans le wizard (ex. « Bâtiment A »). */
  name: string;
  /** Nombre d'étages. */
  floors: number;
}

export interface GoldenKey {
  /** Nom de la clé spéciale (ex. « Ascenseur Bât A »). */
  name: string;
  basis: GoldenKeyBasis;
  coverage: GoldenKeyCoverage;
  /** Poids par référence de lot. Les lots absents ne font PAS partie de la clé. */
  weights: Record<string, number>;
}

export interface GoldenBudgetPoste {
  /** Libellé du poste (saisi en poste personnalisé dans l'étape 5). */
  libelle: string;
  /** Compte de charge comptable « cible » (info métier ; l'UI ne le saisit pas). */
  account: string;
  /** Nom de la clé de répartition rattachée (clé générale ou spéciale). */
  key: string;
  /** Montant annuel en euros. */
  montant: number;
}

export interface GoldenBudget {
  /** Total par clé (somme des postes rattachés à chaque clé). */
  perKeyTotals: Record<string, number>;
  /** Total général du budget. */
  total: number;
  postes: GoldenBudgetPoste[];
}

export interface GoldenData {
  /** Préfixe purgeable du nom de copro (isolation campagne, cf. purge_test_copros.sql). */
  coproNamePrefix: string;
  address: string;
  postal: string;
  city: string;
  /** Libellés bruts des propriétaires (= display_name attendu). */
  owners: string[];
  lots: GoldenLot[];
  /** Clés SPÉCIALES (la clé générale « Charges générales » est auto-créée par le wizard). */
  keys: GoldenKey[];
  buildings: GoldenBuilding[];
  budget: GoldenBudget;
  /** Échéancier des appels (trimestriel = 4 appels). */
  schedule: 'trimestriel' | 'semestriel' | 'annuel';
  /** Date de l'AG ayant voté le budget (format ISO YYYY-MM-DD). */
  agDate: string;
  /** Année de l'exercice ciblé. */
  exerciceYear: number;
}

export const GOLDEN: GoldenData = {
  coproNamePrefix: 'E2E-GOLDEN',
  address: '10 allée des Tilleuls',
  postal: '69000',
  city: 'Lyon',
  owners: [
    'SCI Les Tilleuls',
    'Martin Dupont',
    'Pierre Moreau',
    'Sophie Laurent',
    'Hugo Lefebvre',
    'Claire Petit',
    'Jean Bernard',
    'Lucie Girard',
    'Thomas Roux',
    'Emma Fontaine',
  ],
  lots: [
    { ref: 'A-RDC-C1', type: 'commerce', floor: 0, surface: 80, tantieme: 900, owner: 'SCI Les Tilleuls', building: 'A' },
    { ref: 'A-RDC-C2', type: 'commerce', floor: 0, surface: 60, tantieme: 650, owner: 'SCI Les Tilleuls', building: 'A' },
    { ref: 'A-101', type: 'appartement', floor: 1, surface: 65, tantieme: 800, owner: 'Martin Dupont', building: 'A' },
    { ref: 'A-102', type: 'appartement', floor: 1, surface: 75, tantieme: 950, owner: 'Sophie Laurent', building: 'A' },
    { ref: 'A-201', type: 'appartement', floor: 2, surface: 65, tantieme: 800, owner: 'Hugo Lefebvre', building: 'A' },
    { ref: 'A-202', type: 'appartement', floor: 2, surface: 75, tantieme: 950, owner: 'Pierre Moreau', building: 'A' },
    { ref: 'A-301', type: 'appartement', floor: 3, surface: 90, tantieme: 1100, owner: 'Pierre Moreau', building: 'A' },
    { ref: 'A-302', type: 'appartement', floor: 3, surface: 90, tantieme: 1150, owner: 'Claire Petit', building: 'A' },
    { ref: 'A-CAVE-1', type: 'cave', floor: -1, surface: 6, tantieme: 30, owner: 'Martin Dupont', building: 'A' },
    { ref: 'A-CAVE-2', type: 'cave', floor: -1, surface: 6, tantieme: 30, owner: 'Martin Dupont', building: 'A' },
    { ref: 'A-CAVE-3', type: 'cave', floor: -1, surface: 6, tantieme: 30, owner: 'Pierre Moreau', building: 'A' },
    { ref: 'A-CAVE-4', type: 'cave', floor: -1, surface: 6, tantieme: 30, owner: 'Pierre Moreau', building: 'A' },
    { ref: 'A-PK-1', type: 'parking', floor: 0, surface: 12, tantieme: 50, owner: 'Martin Dupont', building: 'A' },
    { ref: 'A-PK-2', type: 'parking', floor: 0, surface: 12, tantieme: 50, owner: 'Pierre Moreau', building: 'A' },
    { ref: 'B-RDC-1', type: 'appartement', floor: 0, surface: 55, tantieme: 640, owner: 'Jean Bernard', building: 'B' },
    { ref: 'B-RDC-2', type: 'appartement', floor: 0, surface: 55, tantieme: 640, owner: 'Lucie Girard', building: 'B' },
    { ref: 'B-101', type: 'appartement', floor: 1, surface: 60, tantieme: 600, owner: 'Thomas Roux', building: 'B' },
    { ref: 'B-102', type: 'appartement', floor: 1, surface: 60, tantieme: 600, owner: 'Emma Fontaine', building: 'B' },
  ],
  keys: [
    {
      name: 'Ascenseur Bât A',
      basis: 'custom',
      coverage: 'subset',
      weights: { 'A-101': 100, 'A-102': 100, 'A-201': 200, 'A-202': 200, 'A-301': 300, 'A-302': 300 },
    },
    {
      name: 'Charges Bât A',
      basis: 'tantiemes',
      coverage: 'subset',
      weights: {
        'A-RDC-C1': 900, 'A-RDC-C2': 650, 'A-101': 800, 'A-102': 950, 'A-201': 800, 'A-202': 950,
        'A-301': 1100, 'A-302': 1150, 'A-CAVE-1': 30, 'A-CAVE-2': 30, 'A-CAVE-3': 30, 'A-CAVE-4': 30,
        'A-PK-1': 50, 'A-PK-2': 50,
      },
    },
    {
      name: 'Charges Bât B',
      basis: 'tantiemes',
      coverage: 'subset',
      weights: { 'B-RDC-1': 640, 'B-RDC-2': 640, 'B-101': 600, 'B-102': 600 },
    },
    {
      name: 'Eau froide',
      basis: 'surface',
      coverage: 'subset',
      weights: {
        'A-RDC-C1': 80, 'A-RDC-C2': 60, 'A-101': 65, 'A-102': 75, 'A-201': 65, 'A-202': 75,
        'A-301': 90, 'A-302': 90, 'B-RDC-1': 55, 'B-RDC-2': 55, 'B-101': 60, 'B-102': 60,
      },
    },
    {
      name: 'Chauffage collectif',
      basis: 'tantiemes',
      coverage: 'subset',
      weights: { 'A-101': 800, 'A-102': 950, 'A-201': 800, 'A-202': 950, 'A-301': 1100, 'A-302': 1150 },
    },
  ],
  buildings: [
    { code: 'A', name: 'Bâtiment A', floors: 4 },
    { code: 'B', name: 'Bâtiment B', floors: 2 },
  ],
  budget: {
    perKeyTotals: {
      'Charges générales': 25750,
      'Ascenseur Bât A': 3600,
      'Charges Bât A': 3760,
      'Charges Bât B': 1240,
      'Eau froide': 4150,
      'Chauffage collectif': 11500,
    },
    total: 50000,
    postes: [
      { libelle: 'Assurance', account: '616', key: 'Charges générales', montant: 10000 },
      { libelle: 'Honoraires syndic', account: '622', key: 'Charges générales', montant: 8000 },
      { libelle: 'Nettoyage parties communes', account: '615', key: 'Charges générales', montant: 7000 },
      { libelle: 'Honoraires conseil syndical', account: '618', key: 'Charges générales', montant: 750 },
      { libelle: 'Entretien ascenseur', account: '615', key: 'Ascenseur Bât A', montant: 3600 },
      { libelle: 'Eau froide', account: '602', key: 'Eau froide', montant: 4150 },
      { libelle: 'Chauffage collectif', account: '606', key: 'Chauffage collectif', montant: 11500 },
      { libelle: 'Espaces verts bât A', account: '615', key: 'Charges Bât A', montant: 3760 },
      { libelle: 'Entretien bât B', account: '615', key: 'Charges Bât B', montant: 1240 },
    ],
  },
  schedule: 'trimestriel',
  agDate: '2026-01-15',
  exerciceYear: 2026,
};

/**
 * Somme attendue des POIDS de chaque clé spéciale (vérifiée en base via
 * repartition_key_lines). Dérivée de la fixture pour éviter toute valeur magique.
 *
 * Valeurs : Ascenseur = 1200, Charges Bât A = 7520, Charges Bât B = 2480,
 *           Eau froide = 830, Chauffage collectif = 5750.
 */
export function expectedKeyWeightSums(): Record<string, number> {
  const sums: Record<string, number> = {};
  for (const key of GOLDEN.keys) {
    sums[key.name] = Object.values(key.weights).reduce((acc, w) => acc + w, 0);
  }
  return sums;
}

/**
 * Somme attendue des tantièmes généraux (clé générale « Charges générales »).
 * = somme des `tantieme` de tous les lots.
 */
export function expectedGeneralTantiemeSum(): number {
  return GOLDEN.lots.reduce((acc, lot) => acc + lot.tantieme, 0);
}

/**
 * Découpe un libellé propriétaire en { first_name, last_name } pour l'étape 2 du wizard.
 * 1er mot = prénom, le reste = nom — de sorte que display_name reconstruit == libellé.
 */
export function splitOwnerName(owner: string): { firstName: string; lastName: string } {
  const parts = owner.trim().split(/\s+/);
  const firstName = parts[0] ?? owner;
  const lastName = parts.slice(1).join(' ') || firstName;
  return { firstName, lastName };
}

/**
 * Ordre des propriétaires tel que le wizard les présente / les amorce à l'étape 3.
 * L'amorçage (1 lot « Lot N » par propriétaire) ET le tri des <select> suivent
 * `listCoproprietaires` ordonné par display_name ASC. On reproduit ce tri ici pour
 * savoir quel lot auto-créé correspond à quel propriétaire.
 */
export function ownersSortedByDisplayName(): string[] {
  return [...GOLDEN.owners].sort((a, b) => a.localeCompare(b, 'fr'));
}
