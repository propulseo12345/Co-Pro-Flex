/**
 * Mock Data - Contrats
 *
 * @source Fusionné depuis :
 *   - src/data/mock/index.ts → MOCK_CONTRATS (3 basiques)
 *   - src/data/mock/index.ts → MOCK_CONTRATS_DETAILLES (10 détaillés)
 * @created 2025-01-19
 *
 * Relations:
 * - copropriete_id → coproprietes.id
 * - prestataire_id → prestataires.id (optionnel)
 * - fournisseur_id → fournisseurs.id (optionnel)
 *
 * Notes:
 * - 10 contrats : maintenance, assurances, espaces verts, nettoyage, chauffage, VMC
 * - Inclut planification pour contrats récurrents
 * - Assurances DO avec durée 10 ans
 */

import { BaseEntity } from '../types';
import { COPROPRIETE_IDS } from './coproprietes';
import { PRESTATAIRE_IDS } from './prestataires';
import { FOURNISSEUR_IDS } from './fournisseurs';

// ============================================
// TYPES
// ============================================

export type ContratType =
  | 'maintenance'
  | 'entretien'
  | 'assurance'
  | 'service'
  | 'fourniture';

export type ContratSousType =
  | 'ASCENSEUR'
  | 'CHAUFFAGE'
  | 'ASSURANCE'
  | 'ESPACES_VERTS'
  | 'MENAGE'
  | 'VMC'
  | 'AUTRE';

export type ContratStatut =
  | 'actif'
  | 'expire'
  | 'resilie'
  | 'en_negociation'
  | 'a_renouveler';

export type FrequencePlanification =
  | 'HEBDOMADAIRE'
  | 'MENSUELLE'
  | 'TRIMESTRIELLE'
  | 'SEMESTRIELLE'
  | 'ANNUELLE';

export interface PieceJointeContrat {
  id: string;
  nom: string;
  type: 'CONTRAT_PDF' | 'ATTESTATION' | 'AVENANT' | 'AUTRE';
  url: string;
  date_upload: string;
}

export interface PlanificationContrat {
  frequence: FrequencePlanification;
  jour_prefere?: number; // Jour du mois (1-31)
  heure_prefere?: string; // "09:00"
  delai_generation_jours: number;
  description_intervention: string;
  montant_estime_intervention: number;
  generation_automatique: boolean;
  prochaine_intervention?: string;
}

export interface Contrat extends BaseEntity {
  // FK Relations
  copropriete_id: string;
  prestataire_id?: string;
  fournisseur_id?: string;

  // Identification
  reference: string; // "CTR-2025-001"
  nom: string;
  fournisseur_nom: string; // Nom fournisseur même si pas lié

  // Type et catégorie
  type: ContratType;
  sous_type: ContratSousType;

  // Dates
  date_debut: string;
  date_fin?: string;
  date_alerte?: string; // Date rappel avant expiration

  // Conditions
  is_tacite_reconduction: boolean;
  delai_resiliation_jours?: number;
  conditions_particulieres?: string;

  // Montants
  montant_annuel: number;
  montant_prime_unique?: number; // Pour DO
  periodicite_facturation: 'mensuel' | 'trimestriel' | 'annuel' | 'unique';

  // Statut
  statut: ContratStatut;
  is_reglementaire: boolean; // Obligation légale

  // Objet
  description: string;
  equipement_concerne?: string;

  // Documents
  fichier_pdf?: string;
  date_upload_pdf?: string;
  pieces_jointes: PieceJointeContrat[];

  // Planification (optionnel pour contrats récurrents)
  planification?: PlanificationContrat;

  // Suivi
  intervention_ids: string[];
}

// ============================================
// IDS PRÉGÉNÉRÉS
// ============================================

export const CONTRAT_IDS = {
  // Maintenance
  ASCENSEUR_SCHINDLER: 'ctr_11111111-1111-4111-8111-111111111111',
  NETTOYAGE_PARTIES_COMMUNES: 'ctr_22222222-2222-4222-8222-222222222222',
  ESPACES_VERTS: 'ctr_33333333-3333-4333-8333-333333333333',
  CHAUFFAGE_COLLECTIF: 'ctr_44444444-4444-4444-8444-444444444444',
  VMC_COLLECTIVE: 'ctr_55555555-5555-4555-8555-555555555555',
  // Assurances
  ASSURANCE_MRI: 'ctr_66666666-6666-4666-8666-666666666666',
  ASSURANCE_RC_SYNDIC: 'ctr_77777777-7777-4777-8777-777777777777',
  ASSURANCE_PJ: 'ctr_88888888-8888-4888-8888-888888888888',
  DO_RAVALEMENT: 'ctr_99999999-9999-4999-8999-999999999999',
  DO_TOITURE: 'ctr_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
} as const;

// ============================================
// DONNÉES MOCK
// ============================================

export const CONTRATS_MOCK: Contrat[] = [
  // ============================================
  // MAINTENANCE & ENTRETIEN
  // ============================================
  {
    id: CONTRAT_IDS.ASCENSEUR_SCHINDLER,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    prestataire_id: PRESTATAIRE_IDS.SCHINDLER,
    fournisseur_id: FOURNISSEUR_IDS.OTIS,
    reference: 'CTR-2025-001',
    nom: 'Maintenance Ascenseur - Contrat annuel',
    fournisseur_nom: 'Schindler Ascenseurs',
    type: 'maintenance',
    sous_type: 'ASCENSEUR',
    date_debut: '2025-01-01',
    date_fin: '2026-03-15',
    date_alerte: '2025-12-15',
    is_tacite_reconduction: true,
    delai_resiliation_jours: 90,
    conditions_particulieres:
      "Intervention sous 4h en cas d'urgence. Pièces détachées incluses.",
    montant_annuel: 9600,
    periodicite_facturation: 'trimestriel',
    statut: 'actif',
    is_reglementaire: true,
    description:
      'Maintenance préventive mensuelle + dépannages illimités 24/7',
    equipement_concerne: 'Ascenseur principal',
    fichier_pdf: 'contrat_schindler_2025.pdf',
    date_upload_pdf: '2024-12-15',
    pieces_jointes: [
      {
        id: 'pj_ctr1_1',
        nom: 'Contrat signé 2025',
        type: 'CONTRAT_PDF',
        url: '#',
        date_upload: '2024-12-15',
      },
      {
        id: 'pj_ctr1_2',
        nom: 'Attestation assurance',
        type: 'ATTESTATION',
        url: '#',
        date_upload: '2025-01-05',
      },
    ],
    planification: {
      frequence: 'MENSUELLE',
      jour_prefere: 15,
      heure_prefere: '09:00',
      delai_generation_jours: 15,
      description_intervention:
        'Maintenance préventive mensuelle : contrôle technique complet, graissage des câbles et vérification des dispositifs de sécurité',
      montant_estime_intervention: 0,
      generation_automatique: true,
      prochaine_intervention: '2025-02-15',
    },
    intervention_ids: ['int1', 'int2', 'int3'],
    created_at: '2024-12-15T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z',
  },
  {
    id: CONTRAT_IDS.NETTOYAGE_PARTIES_COMMUNES,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    prestataire_id: PRESTATAIRE_IDS.NETTOYAGE_PRO,
    fournisseur_id: FOURNISSEUR_IDS.CLEANPRO,
    reference: 'CTR-2025-002',
    nom: 'Nettoyage Parties Communes',
    fournisseur_nom: 'Nettoyage Pro',
    type: 'entretien',
    sous_type: 'MENAGE',
    date_debut: '2025-01-01',
    date_fin: '2026-02-10',
    date_alerte: '2025-12-10',
    is_tacite_reconduction: true,
    delai_resiliation_jours: 60,
    conditions_particulieres: '4 passages par mois. Produits écologiques inclus.',
    montant_annuel: 8400,
    periodicite_facturation: 'mensuel',
    statut: 'actif',
    is_reglementaire: false,
    description:
      'Nettoyage hebdomadaire des parties communes (hall, escaliers, couloirs)',
    equipement_concerne: 'Parties communes (hall, escaliers, couloirs)',
    fichier_pdf: 'contrat_nettoyage_2025.pdf',
    date_upload_pdf: '2024-12-01',
    pieces_jointes: [
      {
        id: 'pj_ctr2_1',
        nom: 'Contrat de nettoyage',
        type: 'CONTRAT_PDF',
        url: '#',
        date_upload: '2024-12-01',
      },
    ],
    planification: {
      frequence: 'MENSUELLE',
      jour_prefere: 5,
      heure_prefere: '07:30',
      delai_generation_jours: 7,
      description_intervention:
        "Nettoyage mensuel des parties communes : hall d'entrée, escaliers, couloirs, locaux poubelles. 4 passages dans le mois.",
      montant_estime_intervention: 700,
      generation_automatique: true,
      prochaine_intervention: '2025-02-05',
    },
    intervention_ids: ['int6', 'int7', 'int8'],
    created_at: '2024-12-01T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z',
  },
  {
    id: CONTRAT_IDS.ESPACES_VERTS,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    prestataire_id: PRESTATAIRE_IDS.PAYSAGISTE_EXPERT,
    fournisseur_id: FOURNISSEUR_IDS.PAYSAGISTE_EXPERT,
    reference: 'CTR-2025-003',
    nom: 'Entretien Espaces Verts',
    fournisseur_nom: 'Paysagiste Expert',
    type: 'entretien',
    sous_type: 'ESPACES_VERTS',
    date_debut: '2025-01-01',
    date_fin: '2025-12-31',
    date_alerte: '2025-11-01',
    is_tacite_reconduction: false,
    delai_resiliation_jours: 30,
    conditions_particulieres:
      '12 passages par an. Intervention supplémentaire sur devis.',
    montant_annuel: 4800,
    periodicite_facturation: 'mensuel',
    statut: 'actif',
    is_reglementaire: false,
    description:
      'Entretien mensuel des espaces verts (tonte, taille, désherbage)',
    equipement_concerne: 'Jardins et espaces extérieurs',
    fichier_pdf: 'contrat_espaces_verts_2025.pdf',
    date_upload_pdf: '2024-12-10',
    pieces_jointes: [
      {
        id: 'pj_ctr3_1',
        nom: 'Contrat 2025',
        type: 'CONTRAT_PDF',
        url: '#',
        date_upload: '2024-12-10',
      },
    ],
    planification: {
      frequence: 'MENSUELLE',
      jour_prefere: 1,
      heure_prefere: '08:00',
      delai_generation_jours: 15,
      description_intervention:
        'Entretien mensuel des espaces verts : tonte pelouses, taille haies, désherbage, ramassage feuilles selon saison',
      montant_estime_intervention: 400,
      generation_automatique: true,
      prochaine_intervention: '2025-02-01',
    },
    intervention_ids: ['int4', 'int5'],
    created_at: '2024-12-10T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z',
  },
  {
    id: CONTRAT_IDS.CHAUFFAGE_COLLECTIF,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    prestataire_id: PRESTATAIRE_IDS.CHAUFFAGE_EXPERT,
    fournisseur_id: FOURNISSEUR_IDS.CHAUFFAGE_EXPERT,
    reference: 'CTR-2025-004',
    nom: 'Entretien Chaudière Collective',
    fournisseur_nom: 'Chauffage Expert',
    type: 'maintenance',
    sous_type: 'CHAUFFAGE',
    date_debut: '2025-09-01',
    date_fin: '2026-08-31',
    date_alerte: '2026-05-01',
    is_tacite_reconduction: true,
    delai_resiliation_jours: 90,
    conditions_particulieres: 'Ramonage inclus. Pièces détachées en sus.',
    montant_annuel: 3200,
    periodicite_facturation: 'annuel',
    statut: 'actif',
    is_reglementaire: true,
    description:
      "Contrat d'entretien chaudière gaz collective (2 visites/an + dépannage)",
    equipement_concerne: 'Chaudière collective gaz',
    fichier_pdf: 'contrat_chauffage_2025.pdf',
    date_upload_pdf: '2025-08-15',
    pieces_jointes: [
      {
        id: 'pj_ctr4_1',
        nom: 'Contrat entretien chaudière',
        type: 'CONTRAT_PDF',
        url: '#',
        date_upload: '2025-08-15',
      },
      {
        id: 'pj_ctr4_2',
        nom: 'Certificat de conformité',
        type: 'ATTESTATION',
        url: '#',
        date_upload: '2025-09-01',
      },
    ],
    planification: {
      frequence: 'SEMESTRIELLE',
      jour_prefere: 15,
      heure_prefere: '09:00',
      delai_generation_jours: 30,
      description_intervention:
        "Visite semestrielle d'entretien chaudière : contrôle combustion, vérification sécurité, nettoyage brûleur, ramonage conduit",
      montant_estime_intervention: 1600,
      generation_automatique: true,
      prochaine_intervention: '2025-09-15',
    },
    intervention_ids: ['int9'],
    created_at: '2025-08-15T00:00:00Z',
    updated_at: '2025-09-01T00:00:00Z',
  },
  {
    id: CONTRAT_IDS.VMC_COLLECTIVE,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    prestataire_id: undefined, // Ventil'Air Services pas dans prestataires
    fournisseur_id: undefined,
    reference: 'CTR-2023-005',
    nom: 'Maintenance VMC Collective',
    fournisseur_nom: "Ventil'Air Services",
    type: 'maintenance',
    sous_type: 'VMC',
    date_debut: '2023-01-01',
    date_fin: '2023-12-31',
    date_alerte: '2023-10-01',
    is_tacite_reconduction: false,
    delai_resiliation_jours: 60,
    conditions_particulieres:
      'Remplacement filtres inclus. Intervention sous 48h en cas de panne.',
    montant_annuel: 2400,
    periodicite_facturation: 'annuel',
    statut: 'a_renouveler',
    is_reglementaire: true,
    description:
      "Contrat d'entretien VMC collective avec 2 visites annuelles et nettoyage des bouches",
    equipement_concerne: 'VMC collective - tous bâtiments',
    fichier_pdf: 'contrat_vmc_2023.pdf',
    date_upload_pdf: '2022-12-15',
    pieces_jointes: [
      {
        id: 'pj_ctr5_1',
        nom: 'Contrat VMC 2023',
        type: 'CONTRAT_PDF',
        url: '#',
        date_upload: '2022-12-15',
      },
    ],
    planification: undefined,
    intervention_ids: [],
    created_at: '2022-12-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  },

  // ============================================
  // ASSURANCES
  // ============================================
  {
    id: CONTRAT_IDS.ASSURANCE_MRI,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    prestataire_id: PRESTATAIRE_IDS.PROTECTASSUR,
    fournisseur_id: FOURNISSEUR_IDS.ALLIANZ,
    reference: 'CTR-2024-ASS-001',
    nom: 'Assurance Multirisque Immeuble',
    fournisseur_nom: 'AXA Assurances',
    type: 'assurance',
    sous_type: 'ASSURANCE',
    date_debut: '2024-01-01',
    date_fin: '2024-12-31',
    date_alerte: '2024-10-01',
    is_tacite_reconduction: true,
    delai_resiliation_jours: 60,
    conditions_particulieres:
      'Franchise 500€ par sinistre. Valeur à neuf garantie.',
    montant_annuel: 12500,
    periodicite_facturation: 'annuel',
    statut: 'actif',
    is_reglementaire: true,
    description:
      'Assurance multirisque immeuble (incendie, dégâts des eaux, catastrophes naturelles)',
    equipement_concerne: 'Immeuble complet',
    fichier_pdf: 'contrat_assurance_axa_2024.pdf',
    date_upload_pdf: '2023-11-20',
    pieces_jointes: [
      {
        id: 'pj_ctr6_1',
        nom: "Contrat d'assurance 2024",
        type: 'CONTRAT_PDF',
        url: '#',
        date_upload: '2023-11-20',
      },
      {
        id: 'pj_ctr6_2',
        nom: "Attestation d'assurance",
        type: 'ATTESTATION',
        url: '#',
        date_upload: '2024-01-02',
      },
    ],
    planification: undefined,
    intervention_ids: [],
    created_at: '2023-11-20T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
  {
    id: CONTRAT_IDS.ASSURANCE_RC_SYNDIC,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    prestataire_id: undefined, // MAIF pas dans prestataires
    fournisseur_id: undefined,
    reference: 'CTR-2024-ASS-002',
    nom: 'Responsabilité Civile Syndicat',
    fournisseur_nom: 'MAIF',
    type: 'assurance',
    sous_type: 'ASSURANCE',
    date_debut: '2024-01-01',
    date_fin: '2024-12-31',
    date_alerte: '2024-10-01',
    is_tacite_reconduction: true,
    delai_resiliation_jours: 60,
    conditions_particulieres: 'Couverture des mandataires sociaux incluse.',
    montant_annuel: 3200,
    periodicite_facturation: 'annuel',
    statut: 'actif',
    is_reglementaire: true,
    description:
      'Responsabilité civile du syndicat des copropriétaires et du syndic',
    equipement_concerne: 'Syndicat des copropriétaires',
    fichier_pdf: 'contrat_rc_maif_2024.pdf',
    date_upload_pdf: '2023-11-15',
    pieces_jointes: [
      {
        id: 'pj_ctr7_1',
        nom: 'Contrat RC 2024',
        type: 'CONTRAT_PDF',
        url: '#',
        date_upload: '2023-11-15',
      },
    ],
    planification: undefined,
    intervention_ids: [],
    created_at: '2023-11-15T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
  {
    id: CONTRAT_IDS.ASSURANCE_PJ,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    prestataire_id: undefined, // Juridica pas dans prestataires
    fournisseur_id: undefined,
    reference: 'CTR-2024-ASS-003',
    nom: 'Protection Juridique Copropriété',
    fournisseur_nom: 'Juridica',
    type: 'assurance',
    sous_type: 'ASSURANCE',
    date_debut: '2024-01-01',
    date_fin: '2024-12-31',
    date_alerte: '2024-10-01',
    is_tacite_reconduction: true,
    delai_resiliation_jours: 60,
    conditions_particulieres:
      'Plafond 50 000€ par litige. Consultation avocat incluse.',
    montant_annuel: 1800,
    periodicite_facturation: 'annuel',
    statut: 'actif',
    is_reglementaire: false,
    description:
      'Protection juridique pour litiges liés à la copropriété (voisinage, travaux, impayés)',
    equipement_concerne: 'Copropriété - aspects juridiques',
    fichier_pdf: 'contrat_pj_juridica_2024.pdf',
    date_upload_pdf: '2023-11-18',
    pieces_jointes: [
      {
        id: 'pj_ctr8_1',
        nom: 'Contrat PJ 2024',
        type: 'CONTRAT_PDF',
        url: '#',
        date_upload: '2023-11-18',
      },
    ],
    planification: undefined,
    intervention_ids: [],
    created_at: '2023-11-18T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },

  // ============================================
  // ASSURANCES DOMMAGES-OUVRAGE (10 ans)
  // ============================================
  {
    id: CONTRAT_IDS.DO_RAVALEMENT,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    prestataire_id: undefined, // SMABTP pas dans prestataires
    fournisseur_id: undefined,
    reference: 'CTR-DO-2023-001',
    nom: 'Dommages-Ouvrage - Ravalement façade',
    fournisseur_nom: 'SMABTP',
    type: 'assurance',
    sous_type: 'ASSURANCE',
    date_debut: '2023-03-15',
    date_fin: '2033-03-15',
    date_alerte: '2032-03-15',
    is_tacite_reconduction: false,
    delai_resiliation_jours: 0,
    conditions_particulieres:
      'Garantie décennale. Travaux réalisés par Ravalement Express SARL. Date réception: 15/03/2023.',
    montant_annuel: 0,
    montant_prime_unique: 15000,
    periodicite_facturation: 'unique',
    statut: 'actif',
    is_reglementaire: true,
    description:
      'Assurance dommages-ouvrage couvrant le ravalement des façades nord et sud (Bâtiments A et B). Prime unique de 15 000€ payée à la souscription.',
    equipement_concerne: 'Façades nord et sud - Bâtiments A et B',
    fichier_pdf: 'contrat_do_facade.pdf',
    date_upload_pdf: '2023-03-10',
    pieces_jointes: [
      {
        id: 'pj_ctr9_1',
        nom: 'Contrat Dommages-Ouvrage Façade',
        type: 'CONTRAT_PDF',
        url: '#',
        date_upload: '2023-03-10',
      },
      {
        id: 'pj_ctr9_2',
        nom: 'Attestation DO Façade',
        type: 'ATTESTATION',
        url: '#',
        date_upload: '2023-03-15',
      },
      {
        id: 'pj_ctr9_3',
        nom: 'PV réception travaux façade',
        type: 'AUTRE',
        url: '#',
        date_upload: '2023-03-15',
      },
    ],
    planification: undefined,
    intervention_ids: [],
    created_at: '2023-03-10T00:00:00Z',
    updated_at: '2023-03-15T00:00:00Z',
  },
  {
    id: CONTRAT_IDS.DO_TOITURE,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    prestataire_id: undefined, // SMABTP pas dans prestataires
    fournisseur_id: undefined,
    reference: 'CTR-DO-2021-002',
    nom: 'Dommages-Ouvrage - Réfection toiture',
    fournisseur_nom: 'SMABTP',
    type: 'assurance',
    sous_type: 'ASSURANCE',
    date_debut: '2021-09-01',
    date_fin: '2031-09-01',
    date_alerte: '2030-09-01',
    is_tacite_reconduction: false,
    delai_resiliation_jours: 0,
    conditions_particulieres:
      'Garantie décennale. Travaux réalisés par Toiture Lyon Métropole. Date réception: 01/09/2021.',
    montant_annuel: 0,
    montant_prime_unique: 22000,
    periodicite_facturation: 'unique',
    statut: 'actif',
    is_reglementaire: true,
    description:
      'Assurance dommages-ouvrage couvrant la réfection complète de la toiture terrasse du Bâtiment C. Prime unique de 22 000€ payée à la souscription.',
    equipement_concerne: 'Toiture terrasse Bâtiment C',
    fichier_pdf: 'contrat_do_toiture.pdf',
    date_upload_pdf: '2021-08-25',
    pieces_jointes: [
      {
        id: 'pj_ctr10_1',
        nom: 'Contrat Dommages-Ouvrage Toiture',
        type: 'CONTRAT_PDF',
        url: '#',
        date_upload: '2021-08-25',
      },
      {
        id: 'pj_ctr10_2',
        nom: 'Attestation DO Toiture',
        type: 'ATTESTATION',
        url: '#',
        date_upload: '2021-09-01',
      },
    ],
    planification: undefined,
    intervention_ids: [],
    created_at: '2021-08-25T00:00:00Z',
    updated_at: '2021-09-01T00:00:00Z',
  },
];

// ============================================
// STATISTIQUES
// ============================================

export const CONTRATS_STATS = {
  total: CONTRATS_MOCK.length,
  par_type: {
    maintenance: CONTRATS_MOCK.filter((c) => c.type === 'maintenance').length,
    entretien: CONTRATS_MOCK.filter((c) => c.type === 'entretien').length,
    assurance: CONTRATS_MOCK.filter((c) => c.type === 'assurance').length,
    service: CONTRATS_MOCK.filter((c) => c.type === 'service').length,
    fourniture: CONTRATS_MOCK.filter((c) => c.type === 'fourniture').length,
  },
  par_statut: {
    actif: CONTRATS_MOCK.filter((c) => c.statut === 'actif').length,
    a_renouveler: CONTRATS_MOCK.filter((c) => c.statut === 'a_renouveler')
      .length,
    expire: CONTRATS_MOCK.filter((c) => c.statut === 'expire').length,
    resilie: CONTRATS_MOCK.filter((c) => c.statut === 'resilie').length,
    en_negociation: CONTRATS_MOCK.filter((c) => c.statut === 'en_negociation')
      .length,
  },
  reglementaires: CONTRATS_MOCK.filter((c) => c.is_reglementaire).length,
  avec_planification: CONTRATS_MOCK.filter((c) => c.planification).length,
  cout_annuel_total: CONTRATS_MOCK.reduce((sum, c) => sum + c.montant_annuel, 0),
  primes_do_total: CONTRATS_MOCK.reduce(
    (sum, c) => sum + (c.montant_prime_unique || 0),
    0
  ),
};

// ============================================
// TABLE DE CORRESPONDANCE (migration)
// ============================================

export const CONTRAT_ID_MAP: Record<string, string> = {
  ct1: CONTRAT_IDS.ASCENSEUR_SCHINDLER,
  ct2: CONTRAT_IDS.ASSURANCE_MRI,
  ct2b: CONTRAT_IDS.ASSURANCE_RC_SYNDIC,
  ct2c: CONTRAT_IDS.ASSURANCE_PJ,
  ct2d: CONTRAT_IDS.DO_RAVALEMENT,
  ct2e: CONTRAT_IDS.DO_TOITURE,
  ct3: CONTRAT_IDS.ESPACES_VERTS,
  ct4: CONTRAT_IDS.NETTOYAGE_PARTIES_COMMUNES,
  ct5: CONTRAT_IDS.CHAUFFAGE_COLLECTIF,
  ct6: CONTRAT_IDS.VMC_COLLECTIVE,
  // Anciens IDs basiques
  '1': CONTRAT_IDS.ASSURANCE_MRI, // "Assurance Habitation Collective" → MRI
  '2': CONTRAT_IDS.ASCENSEUR_SCHINDLER, // "Maintenance Ascenseur"
  '3': CONTRAT_IDS.ESPACES_VERTS, // "Entretien Espaces Verts"
};

// ============================================
// HELPERS
// ============================================

export function getContratById(id: string): Contrat | undefined {
  return CONTRATS_MOCK.find((c) => c.id === id);
}

export function getContratsByCopropriete(coproprieteId: string): Contrat[] {
  return CONTRATS_MOCK.filter((c) => c.copropriete_id === coproprieteId);
}

export function getContratsByPrestataire(prestataireId: string): Contrat[] {
  return CONTRATS_MOCK.filter((c) => c.prestataire_id === prestataireId);
}

export function getContratsActifs(): Contrat[] {
  return CONTRATS_MOCK.filter((c) => c.statut === 'actif');
}

export function getContratsARenouveler(): Contrat[] {
  return CONTRATS_MOCK.filter((c) => c.statut === 'a_renouveler');
}

export function getContratsExpirantBientot(joursAvant: number = 90): Contrat[] {
  const today = new Date();
  const limite = new Date(today.getTime() + joursAvant * 24 * 60 * 60 * 1000);
  return CONTRATS_MOCK.filter((c) => {
    if (!c.date_fin || c.statut !== 'actif') return false;
    const dateFin = new Date(c.date_fin);
    return dateFin <= limite;
  });
}

export function getContratsReglementaires(): Contrat[] {
  return CONTRATS_MOCK.filter((c) => c.is_reglementaire);
}

export function getContratsByType(type: ContratType): Contrat[] {
  return CONTRATS_MOCK.filter((c) => c.type === type);
}

export function getContratsAvecPlanification(): Contrat[] {
  return CONTRATS_MOCK.filter((c) => c.planification);
}

export function calculerCoutAnnuelParType(): Record<ContratType, number> {
  const result: Record<ContratType, number> = {
    maintenance: 0,
    entretien: 0,
    assurance: 0,
    service: 0,
    fourniture: 0,
  };
  CONTRATS_MOCK.forEach((c) => {
    result[c.type] += c.montant_annuel;
  });
  return result;
}
