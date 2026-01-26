/**
 * Mock Data - Prestataires
 *
 * @source Fusionné depuis :
 *   - src/data/mock/index.ts → MOCK_PRESTATAIRES_SYNDIC (6)
 *   - src/data/mock/index.ts → MOCK_PRESTATAIRES_COPROFLEX (4+)
 *   - src/data/mock/index.ts → MOCK_PRESTATAIRES_COPRO (6)
 * @created 2025-01-19
 *
 * Relations:
 * - fournisseur_id → fournisseurs.id (optionnel, si aussi fournisseur facturé)
 *
 * Notes:
 * - 3 catégories : SYNDIC (carnet syndic), COPROFLEX (marketplace), COPROPRIETE (liés à la copro)
 * - Certains prestataires sont aussi fournisseurs (quand facturés)
 */

import { BaseEntity, Adresse } from '../types';
import { FOURNISSEUR_IDS } from './fournisseurs';

// ============================================
// TYPES
// ============================================

export type DomaineActivite =
  | 'plomberie'
  | 'electricite'
  | 'chauffage'
  | 'climatisation'
  | 'ascenseur'
  | 'serrurerie'
  | 'portail'
  | 'interphone'
  | 'toiture'
  | 'facade'
  | 'peinture'
  | 'menage'
  | 'espaces_verts'
  | 'assurance'
  | 'juridique'
  | 'securite_incendie'
  | 'divers';

export type CategoriePrestataire = 'SYNDIC' | 'COPROFLEX' | 'COPROPRIETE';

export interface Certification {
  nom: string;
  date_obtention?: string;
  date_expiration?: string;
}

export interface AvisPrestataire {
  id: string;
  prestataire_id: string;
  auteur: string;
  note: number; // 1-5
  commentaire?: string;
  date: string;
}

export interface Prestataire extends BaseEntity {
  // Identification
  nom: string;
  siret?: string;
  code_ape?: string;

  // Catégorisation
  categorie: CategoriePrestataire;
  domaines: DomaineActivite[];

  // Contact
  telephone: string;
  telephone_urgence?: string;
  email: string;
  site_web?: string;
  adresse?: Adresse;

  // Contact référent
  contact_nom?: string;
  contact_fonction?: string;

  // Évaluation
  note_moyenne?: number; // 1-5
  nombre_avis?: number;
  nombre_interventions: number;
  derniere_intervention?: string;

  // Certifications
  certifications?: string[];

  // Marketplace (COPROFLEX)
  rayon_intervention_km?: number;
  tarif_indicatif?: string;
  description?: string;
  disponibilite?: string;
  label_coproflex?: boolean;
  delai_intervention?: string;
  annee_creation?: number;
  nombre_salaries?: number;

  // Lien fournisseur (si facturé)
  fournisseur_id?: string;

  // Statut
  is_actif: boolean;
  is_agree: boolean; // Agréé par le syndic
  date_ajout: string;

  // Notes internes
  notes_internes?: string;
}

// ============================================
// IDS PRÉGÉNÉRÉS
// ============================================

export const PRESTATAIRE_IDS = {
  // Syndic
  PLOMBELITE: 'pres_11111111-1111-4111-8111-111111111111',
  ELECPRO: 'pres_22222222-2222-4222-8222-222222222222',
  JARDINS_ESPACES: 'pres_33333333-3333-4333-8333-333333333333',
  SECURHABITAT: 'pres_44444444-4444-4444-8444-444444444444',
  PEINTUREXPERT: 'pres_55555555-5555-4555-8555-555555555555',
  CABINET_JURIDIQUE: 'pres_66666666-6666-4666-8666-666666666666',
  // CoProFlex
  ASCENSEUR_EXPERT: 'pres_77777777-7777-4777-8777-777777777777',
  TOITURE_LYON: 'pres_88888888-8888-4888-8888-888888888888',
  CLIMCONFORT: 'pres_99999999-9999-4999-8999-999999999999',
  AMC_ASSUR: 'pres_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  // Copropriété
  SCHINDLER: 'pres_bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  NETTOYAGE_PRO: 'pres_cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  PROTECTASSUR: 'pres_dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  PAYSAGISTE_EXPERT: 'pres_eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  CHAUFFAGE_EXPERT: 'pres_ffffffff-ffff-4fff-8fff-ffffffffffff',
  TECHELEC: 'pres_10101010-1010-4010-8010-101010101010',
} as const;

// ============================================
// DONNÉES MOCK
// ============================================

export const PRESTATAIRES_MOCK: Prestataire[] = [
  // ============================================
  // CATÉGORIE SYNDIC (Carnet d'adresses syndic)
  // ============================================
  {
    id: PRESTATAIRE_IDS.PLOMBELITE,
    nom: 'PlombElite Services',
    categorie: 'SYNDIC',
    domaines: ['plomberie', 'chauffage'],
    telephone: '01 45 67 89 12',
    telephone_urgence: '06 12 34 56 78',
    email: 'contact@plombelite.fr',
    adresse: { ligne1: '25 rue des Artisans', codePostal: '69003', ville: 'Lyon' },
    siret: '123456789',
    contact_nom: 'Jean-Pierre Martin',
    contact_fonction: 'Responsable interventions',
    nombre_interventions: 0,
    is_actif: true,
    is_agree: true,
    date_ajout: '2020-01-15',
    notes_internes: 'Très réactif, tarifs corrects. Intervient souvent en urgence.',
    created_at: '2020-01-15T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z',
  },
  {
    id: PRESTATAIRE_IDS.ELECPRO,
    nom: 'ElecPro Lyon',
    categorie: 'SYNDIC',
    domaines: ['electricite', 'interphone'],
    telephone: '04 72 11 22 33',
    email: 'contact@elecpro-lyon.fr',
    adresse: { ligne1: '12 avenue de la République', codePostal: '69002', ville: 'Lyon' },
    nombre_interventions: 0,
    is_actif: true,
    is_agree: true,
    date_ajout: '2019-05-10',
    notes_internes: 'Excellent pour les interphones. Prix un peu élevés mais qualité au rendez-vous.',
    created_at: '2019-05-10T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z',
  },
  {
    id: PRESTATAIRE_IDS.JARDINS_ESPACES,
    nom: 'Jardins & Espaces',
    categorie: 'SYNDIC',
    domaines: ['espaces_verts'],
    telephone: '04 78 45 67 89',
    email: 'contact@jardins-espaces.fr',
    adresse: { ligne1: '8 route de Grenoble', codePostal: '69005', ville: 'Lyon' },
    siret: '987654321',
    nombre_interventions: 0,
    is_actif: true,
    is_agree: true,
    date_ajout: '2021-03-20',
    notes_internes: 'Contrats annuels avantageux. Ponctuel.',
    created_at: '2021-03-20T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z',
  },
  {
    id: PRESTATAIRE_IDS.SECURHABITAT,
    nom: 'SecurHabitat',
    categorie: 'SYNDIC',
    domaines: ['serrurerie', 'portail'],
    telephone: '04 78 90 12 34',
    telephone_urgence: '06 12 34 56 78',
    email: 'urgence@securhabitat.fr',
    adresse: { ligne1: '45 boulevard Vivier Merle', codePostal: '69003', ville: 'Lyon' },
    contact_nom: 'Marc Dupont',
    contact_fonction: 'Astreinte 24h/24',
    nombre_interventions: 0,
    is_actif: true,
    is_agree: true,
    date_ajout: '2022-07-10',
    notes_internes: "Dépannages d'urgence 24/7. Fiable.",
    created_at: '2022-07-10T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z',
  },
  {
    id: PRESTATAIRE_IDS.PEINTUREXPERT,
    nom: 'PeintureXpert',
    categorie: 'SYNDIC',
    domaines: ['peinture', 'facade'],
    telephone: '04 78 89 01 23',
    email: 'devis@peinturexpert.fr',
    adresse: { ligne1: '67 rue de la Guillotière', codePostal: '69007', ville: 'Lyon' },
    nombre_interventions: 0,
    is_actif: true,
    is_agree: true,
    date_ajout: '2020-11-05',
    notes_internes: 'Bons devis pour grands travaux. Délais respectés.',
    created_at: '2020-11-05T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z',
  },
  {
    id: PRESTATAIRE_IDS.CABINET_JURIDIQUE,
    nom: 'Cabinet Juridique Immobilier Lyon',
    categorie: 'SYNDIC',
    domaines: ['juridique'],
    telephone: '04 72 00 11 22',
    email: 'cabinet@cjil.fr',
    adresse: { ligne1: '15 cours Gambetta', codePostal: '69003', ville: 'Lyon' },
    nombre_interventions: 0,
    is_actif: true,
    is_agree: true,
    date_ajout: '2018-09-01',
    notes_internes: 'Spécialisé en droit de la copropriété. Honoraires élevés mais expertise reconnue.',
    created_at: '2018-09-01T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z',
  },

  // ============================================
  // CATÉGORIE COPROFLEX (Marketplace)
  // ============================================
  {
    id: PRESTATAIRE_IDS.ASCENSEUR_EXPERT,
    nom: 'AscenseurExpert Pro',
    categorie: 'COPROFLEX',
    domaines: ['ascenseur'],
    telephone: '0800 123 456',
    telephone_urgence: '06 12 34 56 78',
    email: 'contact@ascenseurexpert.fr',
    adresse: { ligne1: '5 boulevard Industriel', codePostal: '69100', ville: 'Villeurbanne' },
    note_moyenne: 4.7,
    nombre_avis: 142,
    certifications: ['Qualibat', 'ISO 9001', 'APSAD'],
    nombre_interventions: 0,
    rayon_intervention_km: 50,
    tarif_indicatif: 'Contrat annuel 2 500-4 500€',
    description:
      "Spécialiste ascenseurs toutes marques. Maintenance préventive et curative, mise aux normes, modernisation.",
    disponibilite: '7j/7 - Astreinte 24h/24',
    label_coproflex: true,
    delai_intervention: '2h (urgence) / 48h (planifié)',
    annee_creation: 1998,
    nombre_salaries: 45,
    site_web: 'www.ascenseurexpert-pro.fr',
    is_actif: true,
    is_agree: false,
    date_ajout: '2023-03-20',
    created_at: '2023-03-20T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z',
  },
  {
    id: PRESTATAIRE_IDS.TOITURE_LYON,
    nom: 'Toiture & Étanchéité Lyon',
    categorie: 'COPROFLEX',
    domaines: ['toiture', 'facade'],
    telephone: '04 78 88 99 00',
    email: 'devis@toiture-lyon.fr',
    adresse: { ligne1: '18 rue des Couvreurs', codePostal: '69007', ville: 'Lyon' },
    note_moyenne: 4.9,
    nombre_avis: 87,
    certifications: ['Qualibat', 'RGE', 'Garantie décennale'],
    nombre_interventions: 0,
    rayon_intervention_km: 60,
    tarif_indicatif: '45-75€/m² selon travaux',
    description:
      "Entreprise spécialisée dans la réfection de toitures et l'étanchéité. Couverture, zinguerie, isolation.",
    disponibilite: 'Lun-Ven 7h-18h / Sam 8h-12h',
    label_coproflex: true,
    delai_intervention: '48-72h (devis) / 1 semaine (travaux)',
    annee_creation: 2005,
    nombre_salaries: 22,
    site_web: 'www.toiture-etancheite-lyon.fr',
    is_actif: true,
    is_agree: false,
    date_ajout: '2023-06-15',
    created_at: '2023-06-15T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z',
  },
  {
    id: PRESTATAIRE_IDS.CLIMCONFORT,
    nom: 'ClimConfort Solutions',
    categorie: 'COPROFLEX',
    domaines: ['climatisation', 'chauffage'],
    telephone: '04 72 55 66 77',
    telephone_urgence: '06 55 66 77 88',
    email: 'contact@climconfort.fr',
    adresse: { ligne1: '30 avenue Tony Garnier', codePostal: '69007', ville: 'Lyon' },
    note_moyenne: 4.5,
    nombre_avis: 65,
    certifications: ['RGE', 'QualiPAC', 'Qualibat'],
    nombre_interventions: 0,
    rayon_intervention_km: 40,
    tarif_indicatif: '55-85€/h',
    description:
      "Installation et maintenance de systèmes de chauffage collectif et climatisation. PAC, chaudières gaz, VMC.",
    disponibilite: 'Lun-Ven 8h-18h',
    label_coproflex: true,
    delai_intervention: '24-48h',
    annee_creation: 2010,
    nombre_salaries: 18,
    site_web: 'www.climconfort-solutions.fr',
    is_actif: true,
    is_agree: false,
    date_ajout: '2023-04-10',
    created_at: '2023-04-10T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z',
  },
  {
    id: PRESTATAIRE_IDS.AMC_ASSUR,
    nom: 'Assurances Multirisques Copro',
    categorie: 'COPROFLEX',
    domaines: ['assurance'],
    telephone: '04 78 11 22 33',
    telephone_urgence: '0 800 123 456',
    email: 'devis@amc-assur.fr',
    adresse: { ligne1: '100 cours Lafayette', codePostal: '69003', ville: 'Lyon' },
    contact_nom: 'Sophie Leroy',
    contact_fonction: 'Gestionnaire sinistres',
    note_moyenne: 4.3,
    nombre_avis: 198,
    certifications: ['ORIAS', 'Courtier agréé'],
    nombre_interventions: 0,
    rayon_intervention_km: 200,
    tarif_indicatif: 'Devis gratuit personnalisé',
    description:
      'Courtier spécialisé copropriétés. MRI, RC syndic, DO, protection juridique. Accompagnement sinistres.',
    disponibilite: 'Lun-Ven 9h-18h',
    label_coproflex: true,
    is_actif: true,
    is_agree: false,
    date_ajout: '2023-01-05',
    created_at: '2023-01-05T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z',
  },

  // ============================================
  // CATÉGORIE COPROPRIÉTÉ (Liés à la copro)
  // ============================================
  {
    id: PRESTATAIRE_IDS.SCHINDLER,
    nom: 'Schindler Ascenseurs',
    categorie: 'COPROPRIETE',
    domaines: ['ascenseur'],
    telephone: '0800 234 567',
    telephone_urgence: '0 800 987 654',
    email: 'service@schindler.fr',
    adresse: { ligne1: '10 avenue des Ascenseurs', codePostal: '69003', ville: 'Lyon' },
    contact_nom: 'François Berger',
    contact_fonction: 'Technicien référent secteur',
    fournisseur_id: FOURNISSEUR_IDS.OTIS, // Lien fournisseur (ascensoriste facturé)
    nombre_interventions: 12,
    derniere_intervention: '2025-01-15',
    is_actif: true,
    is_agree: true,
    date_ajout: '2022-01-10',
    notes_internes: 'Contrat maintenance en cours. Très professionnel.',
    created_at: '2022-01-10T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z',
  },
  {
    id: PRESTATAIRE_IDS.NETTOYAGE_PRO,
    nom: 'Nettoyage Pro',
    categorie: 'COPROPRIETE',
    domaines: ['menage'],
    telephone: '04 72 33 44 55',
    email: 'contact@nettoyagepro.fr',
    adresse: { ligne1: '8 rue du Nettoyage', codePostal: '69006', ville: 'Lyon' },
    fournisseur_id: FOURNISSEUR_IDS.CLEANPRO,
    nombre_interventions: 48,
    derniere_intervention: '2025-01-17',
    is_actif: true,
    is_agree: true,
    date_ajout: '2021-03-15',
    notes_internes: 'Contrat mensuel. Excellent travail, équipe stable.',
    created_at: '2021-03-15T00:00:00Z',
    updated_at: '2025-01-17T00:00:00Z',
  },
  {
    id: PRESTATAIRE_IDS.PROTECTASSUR,
    nom: 'ProtectAssur',
    categorie: 'COPROPRIETE',
    domaines: ['assurance'],
    telephone: '04 78 99 00 11',
    telephone_urgence: '01 40 50 60 70',
    email: 'copro@protectassur.fr',
    adresse: { ligne1: '50 cours Charlemagne', codePostal: '69002', ville: 'Lyon' },
    contact_nom: 'Marie Fontaine',
    contact_fonction: 'Chargée de clientèle syndic',
    fournisseur_id: FOURNISSEUR_IDS.ALLIANZ,
    nombre_interventions: 0,
    is_actif: true,
    is_agree: true,
    date_ajout: '2020-06-01',
    notes_internes: 'Assureur actuel. Bon rapport qualité/prix.',
    created_at: '2020-06-01T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z',
  },
  {
    id: PRESTATAIRE_IDS.PAYSAGISTE_EXPERT,
    nom: 'Paysagiste Expert',
    categorie: 'COPROPRIETE',
    domaines: ['espaces_verts'],
    telephone: '04 78 55 66 77',
    email: 'contact@paysagiste-expert.fr',
    adresse: { ligne1: '33 chemin des Jardiniers', codePostal: '69005', ville: 'Lyon' },
    fournisseur_id: FOURNISSEUR_IDS.PAYSAGISTE_EXPERT,
    nombre_interventions: 24,
    derniere_intervention: '2025-01-10',
    is_actif: true,
    is_agree: true,
    date_ajout: '2021-04-20',
    notes_internes: 'Contrat annuel. Travail soigné, ponctuel.',
    created_at: '2021-04-20T00:00:00Z',
    updated_at: '2025-01-10T00:00:00Z',
  },
  {
    id: PRESTATAIRE_IDS.CHAUFFAGE_EXPERT,
    nom: 'Chauffage Expert',
    categorie: 'COPROPRIETE',
    domaines: ['chauffage', 'plomberie'],
    telephone: '04 72 88 99 00',
    email: 'intervention@chauffage-expert.fr',
    adresse: { ligne1: '15 rue du Chauffage', codePostal: '69007', ville: 'Lyon' },
    fournisseur_id: FOURNISSEUR_IDS.CHAUFFAGE_EXPERT,
    nombre_interventions: 3,
    derniere_intervention: '2024-11-20',
    is_actif: true,
    is_agree: true,
    date_ajout: '2022-09-10',
    notes_internes: 'Intervenu pour la chaudière principale. Compétent.',
    created_at: '2022-09-10T00:00:00Z',
    updated_at: '2024-11-20T00:00:00Z',
  },
  {
    id: PRESTATAIRE_IDS.TECHELEC,
    nom: 'TechElec Services',
    categorie: 'COPROPRIETE',
    domaines: ['electricite', 'interphone'],
    telephone: '04 78 12 34 56',
    email: 'contact@techelec.fr',
    adresse: { ligne1: '28 rue de la Part-Dieu', codePostal: '69003', ville: 'Lyon' },
    nombre_interventions: 5,
    derniere_intervention: '2024-10-30',
    is_actif: true,
    is_agree: true,
    date_ajout: '2022-02-14',
    notes_internes: 'Réparations interphone et tableau électrique. Réactif.',
    created_at: '2022-02-14T00:00:00Z',
    updated_at: '2024-10-30T00:00:00Z',
  },
];

// ============================================
// STATISTIQUES
// ============================================

export const PRESTATAIRES_STATS = {
  total: PRESTATAIRES_MOCK.length,
  par_categorie: {
    SYNDIC: PRESTATAIRES_MOCK.filter((p) => p.categorie === 'SYNDIC').length,
    COPROFLEX: PRESTATAIRES_MOCK.filter((p) => p.categorie === 'COPROFLEX').length,
    COPROPRIETE: PRESTATAIRES_MOCK.filter((p) => p.categorie === 'COPROPRIETE').length,
  },
  agrees: PRESTATAIRES_MOCK.filter((p) => p.is_agree).length,
  actifs: PRESTATAIRES_MOCK.filter((p) => p.is_actif).length,
  avec_fournisseur: PRESTATAIRES_MOCK.filter((p) => p.fournisseur_id).length,
  par_domaine: (() => {
    const domaines: Record<string, number> = {};
    PRESTATAIRES_MOCK.forEach((p) => {
      p.domaines.forEach((d) => {
        domaines[d] = (domaines[d] || 0) + 1;
      });
    });
    return domaines;
  })(),
};

// ============================================
// TABLE DE CORRESPONDANCE
// ============================================

export const PRESTATAIRES_ID_MAP: Record<string, string> = {
  ps1: PRESTATAIRE_IDS.PLOMBELITE,
  ps2: PRESTATAIRE_IDS.ELECPRO,
  ps3: PRESTATAIRE_IDS.JARDINS_ESPACES,
  ps4: PRESTATAIRE_IDS.SECURHABITAT,
  ps5: PRESTATAIRE_IDS.PEINTUREXPERT,
  ps6: PRESTATAIRE_IDS.CABINET_JURIDIQUE,
  pcf1: PRESTATAIRE_IDS.ASCENSEUR_EXPERT,
  pcf2: PRESTATAIRE_IDS.TOITURE_LYON,
  pcf3: PRESTATAIRE_IDS.CLIMCONFORT,
  pcf4: PRESTATAIRE_IDS.AMC_ASSUR,
  pc1: PRESTATAIRE_IDS.SCHINDLER,
  pc2: PRESTATAIRE_IDS.NETTOYAGE_PRO,
  pc3: PRESTATAIRE_IDS.PROTECTASSUR,
  pc4: PRESTATAIRE_IDS.PAYSAGISTE_EXPERT,
  pc5: PRESTATAIRE_IDS.CHAUFFAGE_EXPERT,
  pc6: PRESTATAIRE_IDS.TECHELEC,
};

// ============================================
// HELPERS
// ============================================

export function getPrestataireById(id: string): Prestataire | undefined {
  return PRESTATAIRES_MOCK.find((p) => p.id === id);
}

export function getPrestatairesByCategorie(categorie: CategoriePrestataire): Prestataire[] {
  return PRESTATAIRES_MOCK.filter((p) => p.categorie === categorie);
}

export function getPrestatairesByDomaine(domaine: DomaineActivite): Prestataire[] {
  return PRESTATAIRES_MOCK.filter((p) => p.domaines.includes(domaine));
}

export function getPrestatairesAgrees(): Prestataire[] {
  return PRESTATAIRES_MOCK.filter((p) => p.is_agree);
}

export function getPrestatairesCoproflex(): Prestataire[] {
  return PRESTATAIRES_MOCK.filter((p) => p.categorie === 'COPROFLEX');
}

export function getPrestatairesByCopropriete(): Prestataire[] {
  return PRESTATAIRES_MOCK.filter((p) => p.categorie === 'COPROPRIETE');
}

export function searchPrestataires(query: string): Prestataire[] {
  const q = query.toLowerCase();
  return PRESTATAIRES_MOCK.filter(
    (p) =>
      p.nom.toLowerCase().includes(q) ||
      p.domaines.some((d) => d.includes(q)) ||
      p.email.toLowerCase().includes(q)
  );
}
