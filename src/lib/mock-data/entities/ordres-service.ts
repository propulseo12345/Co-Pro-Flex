/**
 * Mock Data - Ordres de Service
 *
 * @source Fusionné depuis :
 *   - src/data/mock/index.ts → MOCK_ORDRES_SERVICE (4 OS détaillés maintenance)
 *   - src/components/features/ventes/VenteDetail/constants.ts → MOCK_ORDRES_SERVICE (5 OS ventes)
 * @created 2025-01-19
 *
 * Relations:
 * - copropriete_id → coproprietes.id
 * - prestataire_id → prestataires.id (optionnel)
 * - fournisseur_id → fournisseurs.id (optionnel)
 * - contrat_id → contrats.id (pour OS contractuels)
 * - lot_id → lots.id (pour OS liés à un lot/vente)
 * - vente_id → ventes.id (optionnel)
 *
 * Notes:
 * - 9 ordres de service : 4 maintenance + 5 ventes
 * - 2 types : CLASSIQUE (ponctuel) et CONTRACTUEL (lié à un contrat)
 * - Workflow complet : BROUILLON → ENVOYE → EN_ATTENTE_PRESTATAIRE → INTERVENTION_PROGRAMMEE → INTERVENTION_REALISEE → CLOTURE
 */

import { BaseEntity } from '../types';
import { COPROPRIETE_IDS } from './coproprietes';
import { PRESTATAIRE_IDS } from './prestataires';
import { FOURNISSEUR_IDS } from './fournisseurs';
import { CONTRAT_IDS } from './contrats';
import { LOT_IDS } from './lots';

// ============================================
// TYPES
// ============================================

export type TypeOrdreService = 'CLASSIQUE' | 'CONTRACTUEL';

export type StatutOrdreService =
  | 'BROUILLON'
  | 'ENVOYE'
  | 'EN_ATTENTE_PRESTATAIRE'
  | 'INTERVENTION_PROGRAMMEE'
  | 'INTERVENTION_REALISEE'
  | 'CLOTURE'
  | 'ANNULE';

export type PrioriteOrdreService = 'BASSE' | 'NORMALE' | 'HAUTE' | 'URGENTE';

export interface PieceJointeOS {
  id: string;
  nom: string;
  type: 'IMAGE' | 'PDF' | 'AUTRE';
  taille: string;
  url: string;
  date_ajout: string;
}

export interface HistoriqueOS {
  id: string;
  date: string;
  auteur: string;
  action: string;
  champ_modifie?: string;
  ancienne_valeur?: string;
  nouvelle_valeur?: string;
}

export interface OrdreService extends BaseEntity {
  // FK Relations
  copropriete_id: string;
  prestataire_id?: string;
  fournisseur_id?: string;
  contrat_id?: string; // Pour OS contractuels
  lot_id?: string; // Pour OS liés à un lot
  vente_id?: string; // Pour OS liés à une vente

  // Identification
  reference: string; // "OS-2024-001"
  titre: string;
  description: string;

  // Type et priorité
  type_ordre: TypeOrdreService;
  priorite: PrioriteOrdreService;

  // Prestataire info (même si non lié)
  fournisseur_nom: string;
  fournisseur_email?: string;
  fournisseur_telephone?: string;

  // Contrat info (si contractuel)
  contrat_nom?: string;

  // Statut et dates
  statut: StatutOrdreService;
  date_creation: string;
  date_modification: string;
  date_envoi?: string;
  date_intervention_programmee?: string;
  date_intervention_realisee?: string;
  date_cloture?: string;

  // Email
  email_objet?: string;
  email_corps?: string;

  // Montants
  montant_estime?: number;
  montant_final?: number;
  devis_requis: boolean;

  // Pièces jointes et historique
  pieces_jointes: PieceJointeOS[];
  historique: HistoriqueOS[];

  // Archivage GED
  archive_ged_id?: string;
  archive_ged_url?: string;
}

// ============================================
// IDS PRÉGÉNÉRÉS
// ============================================

export const ORDRE_SERVICE_IDS = {
  // Maintenance (source: index.ts)
  PORTAIL_AUTOMATIQUE: 'os_11111111-1111-4111-8111-111111111111',
  MAINTENANCE_ASCENSEUR_T4: 'os_22222222-2222-4222-8222-222222222222',
  FUITE_EAU_PARKING: 'os_33333333-3333-4333-8333-333333333333',
  ENTRETIEN_ESPACES_VERTS_AUTOMNE: 'os_44444444-4444-4444-8444-444444444444',
  // Ventes (source: VenteDetail/constants.ts)
  REPARATION_TOITURE_LOT15: 'os_55555555-5555-4555-8555-555555555555',
  PLOMBERIE_SDB_LOT15: 'os_66666666-6666-4666-8666-666666666666',
  ELECTRICITE_LOT10: 'os_77777777-7777-4777-8777-777777777777',
  SERRURE_CAVE_LOT12: 'os_88888888-8888-4888-8888-888888888888',
  PEINTURE_PARTIES_COMMUNES: 'os_99999999-9999-4999-8999-999999999999',
} as const;

// ============================================
// DONNÉES MOCK
// ============================================

const ADRESSE_COPRO = '50 Route La Carrière au Loup, 75002 Paris';

export const ORDRES_SERVICE_MOCK: OrdreService[] = [
  // ============================================
  // MAINTENANCE (source: index.ts)
  // ============================================
  {
    id: ORDRE_SERVICE_IDS.PORTAIL_AUTOMATIQUE,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    prestataire_id: PRESTATAIRE_IDS.TECHELEC,
    fournisseur_id: FOURNISSEUR_IDS.TECHELEC,
    contrat_id: undefined,
    lot_id: undefined,
    vente_id: undefined,
    reference: 'OS-2024-001',
    titre: 'Réparation portail automatique',
    description:
      "Le portail automatique est bloqué en position ouverte depuis hier. Nécessite intervention rapide pour des raisons de sécurité.",
    type_ordre: 'CLASSIQUE',
    priorite: 'HAUTE',
    fournisseur_nom: 'TechElec Services',
    fournisseur_email: 'contact@techelec.fr',
    fournisseur_telephone: '04 72 11 22 33',
    statut: 'EN_ATTENTE_PRESTATAIRE',
    date_creation: '2024-10-30T09:15:00',
    date_modification: '2024-10-30T14:22:00',
    date_envoi: '2024-10-30T14:22:00',
    email_objet: 'Ordre de service - Réparation portail automatique',
    email_corps: `Bonjour,

En qualité de syndic de la copropriété située au ${ADRESSE_COPRO}, nous vous remercions de bien vouloir intervenir pour la demande suivante :

Le portail automatique est bloqué en position ouverte depuis hier. Nécessite intervention rapide pour des raisons de sécurité.

Facturation :
À l'ordre de : SDC – ${ADRESSE_COPRO}
Adresse : ${ADRESSE_COPRO}
Taux de TVA applicable : 10 %
Si le montant de la prestation dépasse 300 €, merci d'établir un devis préalable.

Nous vous remercions par avance de nous informer de la date d'intervention.
Cordialement,
Le syndic de la copropriété`,
    montant_estime: 280,
    devis_requis: false,
    pieces_jointes: [
      {
        id: 'pj_os1_1',
        nom: 'photo-portail.jpg',
        type: 'IMAGE',
        taille: '2.4 Mo',
        url: '#',
        date_ajout: '2024-10-30T09:20:00',
      },
    ],
    historique: [
      {
        id: 'h_os1_1',
        date: '2024-10-30T09:15:00',
        auteur: 'Syndic Admin',
        action: "Création de l'ordre de service",
      },
      {
        id: 'h_os1_2',
        date: '2024-10-30T14:22:00',
        auteur: 'Syndic Admin',
        action: "Envoi de l'ordre de service",
        champ_modifie: 'statut',
        ancienne_valeur: 'BROUILLON',
        nouvelle_valeur: 'EN_ATTENTE_PRESTATAIRE',
      },
    ],
    created_at: '2024-10-30T09:15:00Z',
    updated_at: '2024-10-30T14:22:00Z',
  },
  {
    id: ORDRE_SERVICE_IDS.MAINTENANCE_ASCENSEUR_T4,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    prestataire_id: PRESTATAIRE_IDS.SCHINDLER,
    fournisseur_id: FOURNISSEUR_IDS.OTIS,
    contrat_id: CONTRAT_IDS.ASCENSEUR_SCHINDLER,
    lot_id: undefined,
    vente_id: undefined,
    reference: 'OS-2024-002',
    titre: 'Maintenance ascenseur trimestrielle',
    description:
      'Maintenance trimestrielle prévue au contrat - Contrôle technique complet et graissage des câbles',
    type_ordre: 'CONTRACTUEL',
    priorite: 'NORMALE',
    fournisseur_nom: 'Schindler',
    fournisseur_email: 'service@schindler.fr',
    fournisseur_telephone: '0800 234 567',
    contrat_nom: 'Maintenance Ascenseur',
    statut: 'BROUILLON',
    date_creation: '2024-10-25T11:30:00',
    date_modification: '2024-10-25T11:30:00',
    email_objet: 'Ordre de service contractuel - Maintenance ascenseur trimestrielle',
    email_corps: `Bonjour,

En qualité de syndic de la copropriété située au ${ADRESSE_COPRO}, et conformément au contrat en cours avec votre entreprise, nous vous remercions de bien vouloir intervenir pour la demande suivante :

Demande :
Maintenance trimestrielle prévue au contrat - Contrôle technique complet et graissage des câbles

Nous vous remercions par avance de nous informer de la date d'intervention.
Cordialement,
Le syndic de la copropriété`,
    devis_requis: false,
    pieces_jointes: [],
    historique: [
      {
        id: 'h_os2_1',
        date: '2024-10-25T11:30:00',
        auteur: 'Syndic Admin',
        action: "Création de l'ordre de service",
      },
    ],
    created_at: '2024-10-25T11:30:00Z',
    updated_at: '2024-10-25T11:30:00Z',
  },
  {
    id: ORDRE_SERVICE_IDS.FUITE_EAU_PARKING,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    prestataire_id: PRESTATAIRE_IDS.CHAUFFAGE_EXPERT,
    fournisseur_id: FOURNISSEUR_IDS.CHAUFFAGE_EXPERT,
    contrat_id: undefined,
    lot_id: undefined,
    vente_id: undefined,
    reference: 'OS-2024-003',
    titre: "Dépannage fuite d'eau parking",
    description:
      'Fuite importante détectée au niveau du parking souterrain. Intervention urgente requise.',
    type_ordre: 'CLASSIQUE',
    priorite: 'URGENTE',
    fournisseur_nom: 'Chauffage Expert',
    fournisseur_email: 'devis@chauffage-expert.fr',
    fournisseur_telephone: '06 45 67 89 01',
    statut: 'INTERVENTION_REALISEE',
    date_creation: '2024-11-01T10:00:00',
    date_modification: '2024-11-05T16:30:00',
    date_envoi: '2024-11-01T10:30:00',
    date_intervention_programmee: '2024-11-02T14:00:00',
    date_intervention_realisee: '2024-11-02T16:45:00',
    email_objet: "Ordre de service urgent - Dépannage fuite d'eau parking",
    email_corps: `Bonjour,

En qualité de syndic de la copropriété située au ${ADRESSE_COPRO}, nous vous remercions de bien vouloir intervenir pour la demande suivante :

Fuite importante détectée au niveau du parking souterrain. Intervention urgente requise.

Facturation :
À l'ordre de : SDC – ${ADRESSE_COPRO}
Adresse : ${ADRESSE_COPRO}
Taux de TVA applicable : 10 %
Si le montant de la prestation dépasse 300 €, merci d'établir un devis préalable.

Nous vous remercions par avance de nous informer de la date d'intervention.
Cordialement,
Le syndic de la copropriété`,
    montant_estime: 450,
    montant_final: 520,
    devis_requis: true,
    pieces_jointes: [
      {
        id: 'pj_os3_1',
        nom: 'photo-fuite-1.jpg',
        type: 'IMAGE',
        taille: '1.8 Mo',
        url: '#',
        date_ajout: '2024-11-01T10:05:00',
      },
      {
        id: 'pj_os3_2',
        nom: 'photo-fuite-2.jpg',
        type: 'IMAGE',
        taille: '2.1 Mo',
        url: '#',
        date_ajout: '2024-11-01T10:06:00',
      },
    ],
    historique: [
      {
        id: 'h_os3_1',
        date: '2024-11-01T10:00:00',
        auteur: 'Syndic Admin',
        action: "Création de l'ordre de service",
      },
      {
        id: 'h_os3_2',
        date: '2024-11-01T10:30:00',
        auteur: 'Syndic Admin',
        action: "Envoi de l'ordre de service",
      },
      {
        id: 'h_os3_3',
        date: '2024-11-02T09:00:00',
        auteur: 'Syndic Admin',
        action: "Programmation de l'intervention",
        champ_modifie: 'statut',
        ancienne_valeur: 'EN_ATTENTE_PRESTATAIRE',
        nouvelle_valeur: 'INTERVENTION_PROGRAMMEE',
      },
      {
        id: 'h_os3_4',
        date: '2024-11-02T16:45:00',
        auteur: 'Syndic Admin',
        action: 'Intervention réalisée',
        champ_modifie: 'statut',
        ancienne_valeur: 'INTERVENTION_PROGRAMMEE',
        nouvelle_valeur: 'INTERVENTION_REALISEE',
      },
    ],
    created_at: '2024-11-01T10:00:00Z',
    updated_at: '2024-11-05T16:30:00Z',
  },
  {
    id: ORDRE_SERVICE_IDS.ENTRETIEN_ESPACES_VERTS_AUTOMNE,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    prestataire_id: PRESTATAIRE_IDS.PAYSAGISTE_EXPERT,
    fournisseur_id: FOURNISSEUR_IDS.PAYSAGISTE_EXPERT,
    contrat_id: CONTRAT_IDS.ESPACES_VERTS,
    lot_id: undefined,
    vente_id: undefined,
    reference: 'OS-2024-004',
    titre: 'Entretien espaces verts - Automne',
    description:
      'Taille des haies, ramassage des feuilles mortes et tonte générale des pelouses',
    type_ordre: 'CONTRACTUEL',
    priorite: 'NORMALE',
    fournisseur_nom: 'Paysagiste Expert',
    fournisseur_email: 'contact@paysagiste-expert.fr',
    fournisseur_telephone: '04 78 55 66 77',
    contrat_nom: 'Entretien Espaces Verts',
    statut: 'CLOTURE',
    date_creation: '2024-09-15T14:20:00',
    date_modification: '2024-09-30T10:00:00',
    date_envoi: '2024-09-15T15:00:00',
    date_intervention_programmee: '2024-09-20T08:00:00',
    date_intervention_realisee: '2024-09-20T17:30:00',
    date_cloture: '2024-09-30T10:00:00',
    email_objet: 'Ordre de service contractuel - Entretien espaces verts Automne',
    email_corps: `Bonjour,

En qualité de syndic de la copropriété située au ${ADRESSE_COPRO}, et conformément au contrat en cours avec votre entreprise, nous vous remercions de bien vouloir intervenir pour la demande suivante :

Demande :
Taille des haies, ramassage des feuilles mortes et tonte générale des pelouses

Nous vous remercions par avance de nous informer de la date d'intervention.
Cordialement,
Le syndic de la copropriété`,
    montant_final: 380,
    devis_requis: false,
    pieces_jointes: [],
    historique: [
      {
        id: 'h_os4_1',
        date: '2024-09-15T14:20:00',
        auteur: 'Syndic Admin',
        action: "Création de l'ordre de service",
      },
      {
        id: 'h_os4_2',
        date: '2024-09-15T15:00:00',
        auteur: 'Syndic Admin',
        action: "Envoi de l'ordre de service",
      },
      {
        id: 'h_os4_3',
        date: '2024-09-18T09:30:00',
        auteur: 'Syndic Admin',
        action: 'Intervention programmée pour le 20/09',
      },
      {
        id: 'h_os4_4',
        date: '2024-09-20T17:30:00',
        auteur: 'Syndic Admin',
        action: 'Intervention réalisée avec succès',
      },
      {
        id: 'h_os4_5',
        date: '2024-09-30T10:00:00',
        auteur: 'Syndic Admin',
        action: "Clôture de l'ordre de service et archivage",
      },
    ],
    archive_ged_id: 'ged-os-4-1696064400000',
    archive_ged_url: '#',
    created_at: '2024-09-15T14:20:00Z',
    updated_at: '2024-09-30T10:00:00Z',
  },

  // ============================================
  // VENTES (source: VenteDetail/constants.ts)
  // ============================================
  {
    id: ORDRE_SERVICE_IDS.REPARATION_TOITURE_LOT15,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    prestataire_id: PRESTATAIRE_IDS.TOITURE_LYON,
    fournisseur_id: undefined,
    contrat_id: undefined,
    lot_id: LOT_IDS.LOT_15, // Lot 15 - équivalent
    vente_id: undefined, // Sera lié à la vente
    reference: 'OS-2025-001',
    titre: 'Réparation toiture - Lot 15',
    description: 'Réparation urgente de la toiture au-dessus du lot 15',
    type_ordre: 'CLASSIQUE',
    priorite: 'HAUTE',
    fournisseur_nom: 'Toiture Express',
    statut: 'CLOTURE',
    date_creation: '2025-10-15T09:00:00',
    date_modification: '2025-10-25T17:00:00',
    date_cloture: '2025-10-25T17:00:00',
    devis_requis: true,
    pieces_jointes: [],
    historique: [
      {
        id: 'h_os5_1',
        date: '2025-10-15T09:00:00',
        auteur: 'Syndic Admin',
        action: "Création de l'ordre de service",
      },
    ],
    created_at: '2025-10-15T09:00:00Z',
    updated_at: '2025-10-25T17:00:00Z',
  },
  {
    id: ORDRE_SERVICE_IDS.PLOMBERIE_SDB_LOT15,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    prestataire_id: PRESTATAIRE_IDS.PLOMBELITE,
    fournisseur_id: undefined,
    contrat_id: undefined,
    lot_id: LOT_IDS.LOT_15, // Lot 15
    vente_id: undefined,
    reference: 'OS-2025-002',
    titre: 'Plomberie salle de bain - Lot 15',
    description: 'Réparation fuite salle de bain du lot 15',
    type_ordre: 'CLASSIQUE',
    priorite: 'NORMALE',
    fournisseur_nom: 'Plomberie Martin',
    statut: 'INTERVENTION_REALISEE',
    date_creation: '2025-09-20T10:00:00',
    date_modification: '2025-09-25T16:00:00',
    date_intervention_realisee: '2025-09-25T16:00:00',
    devis_requis: false,
    pieces_jointes: [],
    historique: [
      {
        id: 'h_os6_1',
        date: '2025-09-20T10:00:00',
        auteur: 'Syndic Admin',
        action: "Création de l'ordre de service",
      },
    ],
    created_at: '2025-09-20T10:00:00Z',
    updated_at: '2025-09-25T16:00:00Z',
  },
  {
    id: ORDRE_SERVICE_IDS.ELECTRICITE_LOT10,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    prestataire_id: PRESTATAIRE_IDS.ELECPRO,
    fournisseur_id: undefined,
    contrat_id: undefined,
    lot_id: LOT_IDS.LOT_10, // Lot 10 - équivalent
    vente_id: undefined,
    reference: 'OS-2025-003',
    titre: 'Électricité tableau - Lot 10',
    description: 'Mise aux normes tableau électrique lot 10',
    type_ordre: 'CLASSIQUE',
    priorite: 'NORMALE',
    fournisseur_nom: 'Elec Pro',
    statut: 'CLOTURE',
    date_creation: '2025-08-10T08:00:00',
    date_modification: '2025-08-20T17:00:00',
    date_cloture: '2025-08-20T17:00:00',
    devis_requis: true,
    pieces_jointes: [],
    historique: [
      {
        id: 'h_os7_1',
        date: '2025-08-10T08:00:00',
        auteur: 'Syndic Admin',
        action: "Création de l'ordre de service",
      },
    ],
    created_at: '2025-08-10T08:00:00Z',
    updated_at: '2025-08-20T17:00:00Z',
  },
  {
    id: ORDRE_SERVICE_IDS.SERRURE_CAVE_LOT12,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    prestataire_id: PRESTATAIRE_IDS.SECURHABITAT,
    fournisseur_id: undefined,
    contrat_id: undefined,
    lot_id: LOT_IDS.CAVE_01, // Cave - Lot 12 équivalent
    vente_id: undefined,
    reference: 'OS-2025-004',
    titre: 'Serrure porte cave - Lot 12',
    description: 'Remplacement serrure porte cave lot 12',
    type_ordre: 'CLASSIQUE',
    priorite: 'BASSE',
    fournisseur_nom: 'Serrurerie 2000',
    statut: 'EN_ATTENTE_PRESTATAIRE',
    date_creation: '2025-11-05T14:00:00',
    date_modification: '2025-11-05T14:00:00',
    devis_requis: false,
    pieces_jointes: [],
    historique: [
      {
        id: 'h_os8_1',
        date: '2025-11-05T14:00:00',
        auteur: 'Syndic Admin',
        action: "Création de l'ordre de service",
      },
    ],
    created_at: '2025-11-05T14:00:00Z',
    updated_at: '2025-11-05T14:00:00Z',
  },
  {
    id: ORDRE_SERVICE_IDS.PEINTURE_PARTIES_COMMUNES,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    prestataire_id: PRESTATAIRE_IDS.PEINTUREXPERT,
    fournisseur_id: undefined,
    contrat_id: undefined,
    lot_id: undefined, // Parties communes
    vente_id: undefined,
    reference: 'OS-2025-005',
    titre: 'Peinture parties communes',
    description: 'Rafraîchissement peinture cage d\'escalier et hall d\'entrée',
    type_ordre: 'CLASSIQUE',
    priorite: 'BASSE',
    fournisseur_nom: 'Peintures Pro',
    statut: 'BROUILLON',
    date_creation: '2025-11-20T10:00:00',
    date_modification: '2025-11-20T10:00:00',
    devis_requis: true,
    pieces_jointes: [],
    historique: [
      {
        id: 'h_os9_1',
        date: '2025-11-20T10:00:00',
        auteur: 'Syndic Admin',
        action: "Création de l'ordre de service (brouillon)",
      },
    ],
    created_at: '2025-11-20T10:00:00Z',
    updated_at: '2025-11-20T10:00:00Z',
  },
];

// ============================================
// STATISTIQUES
// ============================================

export const ORDRES_SERVICE_STATS = {
  total: ORDRES_SERVICE_MOCK.length,
  par_statut: {
    BROUILLON: ORDRES_SERVICE_MOCK.filter((o) => o.statut === 'BROUILLON').length,
    ENVOYE: ORDRES_SERVICE_MOCK.filter((o) => o.statut === 'ENVOYE').length,
    EN_ATTENTE_PRESTATAIRE: ORDRES_SERVICE_MOCK.filter(
      (o) => o.statut === 'EN_ATTENTE_PRESTATAIRE'
    ).length,
    INTERVENTION_PROGRAMMEE: ORDRES_SERVICE_MOCK.filter(
      (o) => o.statut === 'INTERVENTION_PROGRAMMEE'
    ).length,
    INTERVENTION_REALISEE: ORDRES_SERVICE_MOCK.filter(
      (o) => o.statut === 'INTERVENTION_REALISEE'
    ).length,
    CLOTURE: ORDRES_SERVICE_MOCK.filter((o) => o.statut === 'CLOTURE').length,
    ANNULE: ORDRES_SERVICE_MOCK.filter((o) => o.statut === 'ANNULE').length,
  },
  par_type: {
    CLASSIQUE: ORDRES_SERVICE_MOCK.filter((o) => o.type_ordre === 'CLASSIQUE')
      .length,
    CONTRACTUEL: ORDRES_SERVICE_MOCK.filter((o) => o.type_ordre === 'CONTRACTUEL')
      .length,
  },
  par_priorite: {
    BASSE: ORDRES_SERVICE_MOCK.filter((o) => o.priorite === 'BASSE').length,
    NORMALE: ORDRES_SERVICE_MOCK.filter((o) => o.priorite === 'NORMALE').length,
    HAUTE: ORDRES_SERVICE_MOCK.filter((o) => o.priorite === 'HAUTE').length,
    URGENTE: ORDRES_SERVICE_MOCK.filter((o) => o.priorite === 'URGENTE').length,
  },
  avec_lot: ORDRES_SERVICE_MOCK.filter((o) => o.lot_id).length,
  avec_contrat: ORDRES_SERVICE_MOCK.filter((o) => o.contrat_id).length,
  montant_total_estime: ORDRES_SERVICE_MOCK.reduce(
    (sum, o) => sum + (o.montant_estime || 0),
    0
  ),
  montant_total_final: ORDRES_SERVICE_MOCK.reduce(
    (sum, o) => sum + (o.montant_final || 0),
    0
  ),
};

// ============================================
// TABLE DE CORRESPONDANCE (migration)
// ============================================

export const ORDRE_SERVICE_ID_MAP: Record<string, string> = {
  // Source index.ts
  '1': ORDRE_SERVICE_IDS.PORTAIL_AUTOMATIQUE,
  '2': ORDRE_SERVICE_IDS.MAINTENANCE_ASCENSEUR_T4,
  '3': ORDRE_SERVICE_IDS.FUITE_EAU_PARKING,
  '4': ORDRE_SERVICE_IDS.ENTRETIEN_ESPACES_VERTS_AUTOMNE,
  // Source VenteDetail (préfixé pour éviter collision)
  'vente_1': ORDRE_SERVICE_IDS.REPARATION_TOITURE_LOT15,
  'vente_2': ORDRE_SERVICE_IDS.PLOMBERIE_SDB_LOT15,
  'vente_3': ORDRE_SERVICE_IDS.ELECTRICITE_LOT10,
  'vente_4': ORDRE_SERVICE_IDS.SERRURE_CAVE_LOT12,
  'vente_5': ORDRE_SERVICE_IDS.PEINTURE_PARTIES_COMMUNES,
};

// ============================================
// HELPERS
// ============================================

export function getOrdreServiceById(id: string): OrdreService | undefined {
  return ORDRES_SERVICE_MOCK.find((o) => o.id === id);
}

export function getOrdresServiceByCopropriete(
  coproprieteId: string
): OrdreService[] {
  return ORDRES_SERVICE_MOCK.filter((o) => o.copropriete_id === coproprieteId);
}

export function getOrdresServiceByPrestataire(
  prestataireId: string
): OrdreService[] {
  return ORDRES_SERVICE_MOCK.filter((o) => o.prestataire_id === prestataireId);
}

export function getOrdresServiceByContrat(contratId: string): OrdreService[] {
  return ORDRES_SERVICE_MOCK.filter((o) => o.contrat_id === contratId);
}

export function getOrdresServiceByLot(lotId: string): OrdreService[] {
  return ORDRES_SERVICE_MOCK.filter((o) => o.lot_id === lotId);
}

export function getOrdresServiceByStatut(
  statut: StatutOrdreService
): OrdreService[] {
  return ORDRES_SERVICE_MOCK.filter((o) => o.statut === statut);
}

export function getOrdresServiceEnCours(): OrdreService[] {
  const statutsEnCours: StatutOrdreService[] = [
    'ENVOYE',
    'EN_ATTENTE_PRESTATAIRE',
    'INTERVENTION_PROGRAMMEE',
  ];
  return ORDRES_SERVICE_MOCK.filter((o) => statutsEnCours.includes(o.statut));
}

export function getOrdresServiceUrgents(): OrdreService[] {
  return ORDRES_SERVICE_MOCK.filter(
    (o) =>
      (o.priorite === 'URGENTE' || o.priorite === 'HAUTE') &&
      o.statut !== 'CLOTURE' &&
      o.statut !== 'ANNULE'
  );
}

export function getOrdresServiceContractuels(): OrdreService[] {
  return ORDRES_SERVICE_MOCK.filter((o) => o.type_ordre === 'CONTRACTUEL');
}

export function getOrdresServiceClassiques(): OrdreService[] {
  return ORDRES_SERVICE_MOCK.filter((o) => o.type_ordre === 'CLASSIQUE');
}

export function searchOrdresService(query: string): OrdreService[] {
  const q = query.toLowerCase();
  return ORDRES_SERVICE_MOCK.filter(
    (o) =>
      o.titre.toLowerCase().includes(q) ||
      o.description.toLowerCase().includes(q) ||
      o.fournisseur_nom.toLowerCase().includes(q) ||
      o.reference.toLowerCase().includes(q)
  );
}
