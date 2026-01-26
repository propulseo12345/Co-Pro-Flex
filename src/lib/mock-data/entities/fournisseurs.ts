/**
 * Mock Data - Fournisseurs
 *
 * @source Fusionné depuis :
 *   - src/data/mock/index.ts → MOCK_FOURNISSEURS (6 entrées : TechElec, SecurMax, etc.)
 *   - src/components/features/finance/Factures/data.ts → MOCK_FOURNISSEURS (6 entrées : EDF, Veolia, etc.)
 * @created 2025-01-19
 *
 * Déduplication:
 * - Aucun doublon détecté (fournisseurs différents dans les 2 sources)
 * - Total après fusion : 12 fournisseurs uniques
 *
 * Relations:
 * - Aucune FK (entité de référence)
 *
 * Notes:
 * - Catégories standardisées pour filtrage
 * - Données bancaires pour les paiements
 * - Notes internes pour le syndic
 */

import { BaseEntity, Adresse, DomaineActivite } from '../types';

// ============================================
// TYPES
// ============================================

export type CategorieFournisseur =
  | 'energie'
  | 'eau'
  | 'maintenance'
  | 'assurance'
  | 'nettoyage'
  | 'travaux'
  | 'ascenseur'
  | 'securite'
  | 'espaces_verts'
  | 'autre';

export interface Fournisseur extends BaseEntity {
  // Identification
  nom: string;
  siret?: string;
  tva_intracommunautaire?: string;
  code_fournisseur?: string; // Code interne

  // Contact
  adresse?: Adresse;
  telephone?: string;
  telephone_urgence?: string;
  email?: string;
  site_web?: string;

  // Contact référent
  contact_nom?: string;
  contact_fonction?: string;

  // Bancaire
  iban?: string;
  bic?: string;

  // Catégorisation
  categorie: CategorieFournisseur;
  domaines?: DomaineActivite[];
  services?: string[];

  // Évaluation
  note?: number; // 0-5
  nombre_interventions?: number;
  derniere_intervention?: string;

  // Statut
  is_actif: boolean;
  notes_internes?: string;
}

// ============================================
// IDS PRÉGÉNÉRÉS
// ============================================

export const FOURNISSEUR_IDS = {
  // Source 1 : index.ts
  TECHELEC: 'four_11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  SECURMAX: 'four_22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  CHAUFFAGE_EXPERT: 'four_33333333-cccc-4ccc-8ccc-cccccccccccc',
  SCHINDLER: 'four_44444444-dddd-4ddd-8ddd-dddddddddddd',
  PROTECTASSUR: 'four_55555555-eeee-4eee-8eee-eeeeeeeeeeee',
  PAYSAGISTE_EXPERT: 'four_66666666-ffff-4fff-8fff-ffffffffffff',
  // Source 2 : Factures/data.ts
  EDF: 'four_77777777-1111-4111-8111-111111111111',
  VEOLIA: 'four_88888888-2222-4222-8222-222222222222',
  ALLIANZ: 'four_99999999-3333-4333-8333-333333333333',
  MARTIN_BTP: 'four_aaaaaaaa-4444-4444-8444-444444444444',
  CLEANPRO: 'four_bbbbbbbb-5555-4555-8555-555555555555',
  OTIS: 'four_cccccccc-6666-4666-8666-666666666666',
} as const;

// ============================================
// DONNÉES MOCK
// ============================================

export const FOURNISSEURS_MOCK: Fournisseur[] = [
  // ============================================
  // SOURCE 1 : index.ts - Fournisseurs maintenance/services
  // ============================================
  {
    id: FOURNISSEUR_IDS.TECHELEC,
    nom: 'TechElec Services',
    siret: '12345678900012',
    adresse: {
      ligne1: '15 boulevard de la République',
      codePostal: '69002',
      ville: 'Lyon',
    },
    telephone: '04 72 11 22 33',
    email: 'contact@techelec.fr',
    categorie: 'maintenance',
    domaines: [DomaineActivite.ELECTRICITE],
    services: ['Électricité', 'Dépannage électrique', 'Mise aux normes'],
    note: 4.8,
    is_actif: true,
    notes_internes: 'Très réactif pour les urgences',
    created_at: '2020-01-15T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: FOURNISSEUR_IDS.SECURMAX,
    nom: 'SecurMax',
    siret: '23456789000034',
    adresse: {
      ligne1: '28 rue de la Sécurité',
      codePostal: '69006',
      ville: 'Lyon',
    },
    telephone: '04 78 99 88 77',
    email: 'info@securmax.fr',
    categorie: 'securite',
    domaines: [DomaineActivite.SECURITE_INCENDIE],
    services: ['Sécurité Incendie', 'Extincteurs', 'Contrôles réglementaires'],
    note: 4.9,
    is_actif: true,
    notes_internes: 'Excellent pour les contrôles annuels',
    created_at: '2019-06-10T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: FOURNISSEUR_IDS.CHAUFFAGE_EXPERT,
    nom: 'Chauffage Expert',
    siret: '34567890000056',
    adresse: {
      ligne1: '42 avenue du Chauffage',
      codePostal: '69100',
      ville: 'Villeurbanne',
    },
    telephone: '06 45 67 89 01',
    telephone_urgence: '06 45 67 89 01',
    email: 'devis@chauffage-expert.fr',
    categorie: 'maintenance',
    domaines: [DomaineActivite.PLOMBERIE, DomaineActivite.CHAUFFAGE],
    services: ['Plomberie', 'Chauffage', 'Dépannage'],
    note: 4.6,
    is_actif: true,
    notes_internes: 'Disponible 7j/7 pour urgences',
    created_at: '2021-03-20T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: FOURNISSEUR_IDS.SCHINDLER,
    nom: 'Schindler',
    siret: '45678901200078',
    adresse: {
      ligne1: 'Tour Schindler',
      codePostal: '69003',
      ville: 'Lyon',
    },
    telephone: '0800 234 567',
    telephone_urgence: '0800 234 567',
    email: 'service@schindler.fr',
    site_web: 'www.schindler.fr',
    categorie: 'ascenseur',
    domaines: [DomaineActivite.ASCENSEUR],
    services: ['Ascenseur', 'Maintenance', 'Modernisation'],
    note: 4.5,
    is_actif: true,
    notes_internes: 'Contrat de maintenance annuel',
    created_at: '2018-01-01T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: FOURNISSEUR_IDS.PROTECTASSUR,
    nom: 'ProtectAssur',
    siret: '56789012300090',
    adresse: {
      ligne1: '100 cours Lafayette',
      codePostal: '69003',
      ville: 'Lyon',
    },
    telephone: '04 26 33 44 55',
    email: 'sinistre@protectassur.fr',
    categorie: 'assurance',
    domaines: [DomaineActivite.ASSURANCE],
    services: ['Assurance', 'Sinistres', 'RC Syndic'],
    note: 4.1,
    is_actif: true,
    notes_internes: 'Assureur principal de la copropriété',
    created_at: '2017-06-01T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: FOURNISSEUR_IDS.PAYSAGISTE_EXPERT,
    nom: 'Paysagiste Expert',
    siret: '67890123400012',
    adresse: {
      ligne1: '33 chemin des Jardiniers',
      codePostal: '69005',
      ville: 'Lyon',
    },
    telephone: '04 78 55 66 77',
    email: 'contact@paysagiste-expert.fr',
    categorie: 'espaces_verts',
    domaines: [DomaineActivite.ESPACES_VERTS],
    services: ['Espaces verts', 'Tonte', 'Taille haies', 'Entretien saisonnier'],
    note: 4.7,
    is_actif: true,
    notes_internes: 'Contrat annuel avantageux',
    created_at: '2020-04-15T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },

  // ============================================
  // SOURCE 2 : Factures/data.ts - Fournisseurs factures
  // ============================================
  {
    id: FOURNISSEUR_IDS.EDF,
    nom: 'EDF',
    siret: '55208131766522',
    tva_intracommunautaire: 'FR03552081317',
    adresse: {
      ligne1: '22-30 Avenue de Wagram',
      codePostal: '75008',
      ville: 'Paris',
    },
    telephone: '+33 9 69 32 15 15',
    email: 'contact@edf.fr',
    site_web: 'www.edf.fr',
    iban: 'FR76 1234 5678 9012 3456 7890 123',
    bic: 'EDFLFR21XXX',
    categorie: 'energie',
    domaines: [DomaineActivite.ELECTRICITE],
    services: ['Électricité'],
    is_actif: true,
    notes_internes: 'Fournisseur électricité parties communes',
    created_at: '2015-01-01T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: FOURNISSEUR_IDS.VEOLIA,
    nom: 'Veolia Eau',
    siret: '57202552600022',
    tva_intracommunautaire: 'FR33572025526',
    adresse: {
      ligne1: '21 Rue La Boétie',
      codePostal: '75008',
      ville: 'Paris',
    },
    telephone: '+33 1 71 75 00 00',
    email: 'contact@veolia.fr',
    site_web: 'www.veolia.fr',
    iban: 'FR76 9876 5432 1098 7654 3210 987',
    bic: 'VEOLIAFR1XXX',
    categorie: 'eau',
    domaines: [DomaineActivite.PLOMBERIE],
    services: ['Eau'],
    is_actif: true,
    notes_internes: 'Distribution eau parties communes',
    created_at: '2015-01-01T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: FOURNISSEUR_IDS.ALLIANZ,
    nom: 'Allianz Assurances',
    siret: '54210765100044',
    tva_intracommunautaire: 'FR19542107651',
    adresse: {
      ligne1: 'Tour Allianz, 1 Cours Michelet',
      codePostal: '92800',
      ville: 'Puteaux',
    },
    telephone: '+33 1 44 86 20 00',
    email: 'contact@allianz.fr',
    site_web: 'www.allianz.fr',
    iban: 'FR76 1111 2222 3333 4444 5555 666',
    bic: 'ALLZFR21XXX',
    categorie: 'assurance',
    domaines: [DomaineActivite.ASSURANCE],
    services: ['Assurance', 'MRI'],
    is_actif: true,
    notes_internes: 'Assurance multirisque immeuble',
    created_at: '2018-01-01T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: FOURNISSEUR_IDS.MARTIN_BTP,
    nom: 'Entreprise Martin BTP',
    siret: '44567891200034',
    adresse: {
      ligne1: '15 Rue des Artisans',
      codePostal: '92100',
      ville: 'Boulogne-Billancourt',
    },
    telephone: '+33 1 45 67 89 10',
    email: 'contact@martin-btp.fr',
    iban: 'FR76 7777 8888 9999 0000 1111 222',
    bic: 'CMBRFR2BXXX',
    categorie: 'travaux',
    domaines: [DomaineActivite.FACADE, DomaineActivite.TOITURE],
    services: ['Travaux', 'Entretien', 'Ravalement', 'Toiture'],
    is_actif: true,
    notes_internes: 'Entreprise générale bâtiment',
    created_at: '2019-06-01T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: FOURNISSEUR_IDS.CLEANPRO,
    nom: 'CleanPro Services',
    siret: '33456789100056',
    adresse: {
      ligne1: '8 Avenue des Entrepreneurs',
      codePostal: '75015',
      ville: 'Paris',
    },
    telephone: '+33 1 40 55 66 77',
    email: 'contact@cleanpro.fr',
    iban: 'FR76 3333 4444 5555 6666 7777 888',
    bic: 'CLPNFR21XXX',
    categorie: 'nettoyage',
    domaines: [DomaineActivite.MENAGE],
    services: ['Ménage', 'Nettoyage parties communes'],
    is_actif: true,
    notes_internes: 'Contrat ménage hebdomadaire',
    created_at: '2020-03-01T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: FOURNISSEUR_IDS.OTIS,
    nom: 'Otis Ascenseurs',
    siret: '62204567800078',
    adresse: {
      ligne1: '3 Place de la Pyramide',
      codePostal: '92800',
      ville: 'Puteaux',
    },
    telephone: '+33 1 55 23 33 00',
    telephone_urgence: '0800 378 379',
    email: 'contact@otis.fr',
    site_web: 'www.otis.com/fr',
    iban: 'FR76 9999 0000 1111 2222 3333 444',
    bic: 'OTISFR21XXX',
    categorie: 'ascenseur',
    domaines: [DomaineActivite.ASCENSEUR],
    services: ['Ascenseur', 'Entretien', 'Dépannage 24h/24'],
    is_actif: true,
    notes_internes: 'Alternative à Schindler - Devis comparatif',
    created_at: '2022-01-01T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
];

// ============================================
// STATISTIQUES
// ============================================

export const FOURNISSEURS_STATS = {
  total: FOURNISSEURS_MOCK.length,
  actifs: FOURNISSEURS_MOCK.filter((f) => f.is_actif).length,
  par_categorie: {
    energie: FOURNISSEURS_MOCK.filter((f) => f.categorie === 'energie').length,
    eau: FOURNISSEURS_MOCK.filter((f) => f.categorie === 'eau').length,
    maintenance: FOURNISSEURS_MOCK.filter((f) => f.categorie === 'maintenance').length,
    assurance: FOURNISSEURS_MOCK.filter((f) => f.categorie === 'assurance').length,
    nettoyage: FOURNISSEURS_MOCK.filter((f) => f.categorie === 'nettoyage').length,
    travaux: FOURNISSEURS_MOCK.filter((f) => f.categorie === 'travaux').length,
    ascenseur: FOURNISSEURS_MOCK.filter((f) => f.categorie === 'ascenseur').length,
    securite: FOURNISSEURS_MOCK.filter((f) => f.categorie === 'securite').length,
    espaces_verts: FOURNISSEURS_MOCK.filter((f) => f.categorie === 'espaces_verts').length,
  },
  avec_iban: FOURNISSEURS_MOCK.filter((f) => f.iban).length,
  avec_note: FOURNISSEURS_MOCK.filter((f) => f.note !== undefined).length,
  note_moyenne:
    FOURNISSEURS_MOCK.filter((f) => f.note).reduce((acc, f) => acc + (f.note || 0), 0) /
    FOURNISSEURS_MOCK.filter((f) => f.note).length,
  sources: {
    'index.ts': 6,
    'Factures/data.ts': 6,
  },
};

// ============================================
// TABLE DE CORRESPONDANCE
// ============================================

export const FOURNISSEURS_ID_MAP: Record<string, string> = {
  // Source 1 : index.ts (anciens IDs numériques)
  '1': FOURNISSEUR_IDS.TECHELEC,
  '2': FOURNISSEUR_IDS.SECURMAX,
  '3': FOURNISSEUR_IDS.CHAUFFAGE_EXPERT,
  '4': FOURNISSEUR_IDS.SCHINDLER,
  '5': FOURNISSEUR_IDS.PROTECTASSUR,
  '6': FOURNISSEUR_IDS.PAYSAGISTE_EXPERT,
  // Source 2 : Factures/data.ts (anciens IDs numériques)
  // Note: Les IDs '1' à '6' de Factures/data.ts correspondent à d'autres fournisseurs
  // Mapping par nom pour éviter les conflits
  EDF: FOURNISSEUR_IDS.EDF,
  'Veolia Eau': FOURNISSEUR_IDS.VEOLIA,
  'Allianz Assurances': FOURNISSEUR_IDS.ALLIANZ,
  'Entreprise Martin BTP': FOURNISSEUR_IDS.MARTIN_BTP,
  'CleanPro Services': FOURNISSEUR_IDS.CLEANPRO,
  'Otis Ascenseurs': FOURNISSEUR_IDS.OTIS,
  // Noms alternatifs
  Veolia: FOURNISSEUR_IDS.VEOLIA,
  Allianz: FOURNISSEUR_IDS.ALLIANZ,
  Otis: FOURNISSEUR_IDS.OTIS,
  'Martin BTP': FOURNISSEUR_IDS.MARTIN_BTP,
  CleanPro: FOURNISSEUR_IDS.CLEANPRO,
  TechElec: FOURNISSEUR_IDS.TECHELEC,
  Schindler: FOURNISSEUR_IDS.SCHINDLER,
};

// ============================================
// HELPERS
// ============================================

export function getFournisseurById(id: string): Fournisseur | undefined {
  return FOURNISSEURS_MOCK.find((f) => f.id === id);
}

export function getFournisseurByNom(nom: string): Fournisseur | undefined {
  const normalizedNom = nom.toLowerCase().trim();
  return FOURNISSEURS_MOCK.find((f) => f.nom.toLowerCase().includes(normalizedNom));
}

export function getFournisseursByCategorie(categorie: CategorieFournisseur): Fournisseur[] {
  return FOURNISSEURS_MOCK.filter((f) => f.categorie === categorie);
}

export function getFournisseursByDomaine(domaine: DomaineActivite): Fournisseur[] {
  return FOURNISSEURS_MOCK.filter((f) => f.domaines?.includes(domaine));
}

export function getFournisseursActifs(): Fournisseur[] {
  return FOURNISSEURS_MOCK.filter((f) => f.is_actif);
}

export function getFournisseursAvecIBAN(): Fournisseur[] {
  return FOURNISSEURS_MOCK.filter((f) => f.iban);
}

export function searchFournisseurs(query: string): Fournisseur[] {
  const q = query.toLowerCase().trim();
  return FOURNISSEURS_MOCK.filter(
    (f) =>
      f.nom.toLowerCase().includes(q) ||
      f.services?.some((s) => s.toLowerCase().includes(q)) ||
      f.categorie.toLowerCase().includes(q)
  );
}

/**
 * Résout un ID de fournisseur (ancien ou nouveau format)
 */
export function resolveFournisseurId(idOrName: string): string | undefined {
  // Essayer d'abord la table de correspondance
  if (FOURNISSEURS_ID_MAP[idOrName]) {
    return FOURNISSEURS_ID_MAP[idOrName];
  }
  // Sinon chercher par ID direct
  const found = FOURNISSEURS_MOCK.find((f) => f.id === idOrName);
  if (found) return found.id;
  // Sinon chercher par nom
  const byName = getFournisseurByNom(idOrName);
  return byName?.id;
}
