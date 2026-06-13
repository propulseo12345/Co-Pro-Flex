/**
 * Mock Data - Interventions (Carnet d'entretien)
 *
 * @source src/data/mock/index.ts → MOCK_INTERVENTIONS_DETAILLEES (11 entrées)
 * @created 2025-01-19
 *
 * Relations:
 * - copropriete_id → coproprietes.id
 * - prestataire_id → prestataires.id
 * - contrat_id → contrats.id (optionnel)
 * - ordre_service_id → ordres-service.id (optionnel)
 * - facture_id → factures.id (optionnel)
 *
 * Notes:
 * - 11 interventions pour le carnet d'entretien
 * - Types : ENTRETIEN, REPARATION, AMELIORATION, CONTROLE
 * - Domaines : ASCENSEUR, ESPACES_VERTS, MENAGE, CHAUFFAGE, INTERPHONE, AUTRE
 */

import { BaseEntity } from '../types';
import { COPROPRIETE_IDS } from './coproprietes';
import { PRESTATAIRE_IDS } from './prestataires';
import { CONTRAT_IDS } from './contrats';

// ============================================
// TYPES
// ============================================

export type TypeIntervention =
  | 'ENTRETIEN'
  | 'REPARATION'
  | 'AMELIORATION'
  | 'CONTROLE'
  | 'INSTALLATION'
  | 'MISE_AUX_NORMES';

export type DomaineIntervention =
  | 'ASCENSEUR'
  | 'CHAUFFAGE'
  | 'CLIMATISATION'
  | 'ELECTRICITE'
  | 'PLOMBERIE'
  | 'ESPACES_VERTS'
  | 'MENAGE'
  | 'SECURITE_INCENDIE'
  | 'INTERPHONE'
  | 'PORTAIL'
  | 'TOITURE'
  | 'FACADE'
  | 'VMC'
  | 'AUTRE';

export type StatutIntervention =
  | 'PLANIFIEE'
  | 'EN_COURS'
  | 'TERMINEE'
  | 'ANNULEE'
  | 'REPORTEE';

export interface Intervention extends BaseEntity {
  // FK Relations
  copropriete_id: string;
  prestataire_id?: string;
  contrat_id?: string;
  ordre_service_id?: string;
  facture_id?: string;

  // Identification
  reference?: string; // "INT-2024-001"
  titre: string;
  description: string;

  // Dates
  date: string; // Date de l'intervention
  date_planifiee?: string;
  date_realisation?: string;

  // Type et domaine
  type: TypeIntervention;
  domaine: DomaineIntervention;

  // Intervenant
  intervenant_nom: string;

  // Statut
  statut: StatutIntervention;

  // Montant
  montant: number;
  est_inclus_contrat: boolean;

  // Suivi
  commentaires?: string;
  pieces_jointes: string[];

  // Carnet d'entretien
  est_reglementaire: boolean;
  periodicite?: 'MENSUELLE' | 'TRIMESTRIELLE' | 'SEMESTRIELLE' | 'ANNUELLE' | 'PONCTUELLE';
}

// ============================================
// IDS PRÉGÉNÉRÉS
// ============================================

export const INTERVENTION_IDS = {
  // Ascenseur
  MAINTENANCE_ASC_NOV: 'int_11111111-1111-4111-8111-111111111111',
  DEPANNAGE_ASC_OCT: 'int_22222222-2222-4222-8222-222222222222',
  MAINTENANCE_ASC_SEPT: 'int_33333333-3333-4333-8333-333333333333',
  // Espaces verts
  ENTRETIEN_EV_NOV: 'int_44444444-4444-4444-8444-444444444444',
  ENTRETIEN_EV_OCT: 'int_55555555-5555-4555-8555-555555555555',
  // Nettoyage
  NETTOYAGE_S48: 'int_66666666-6666-4666-8666-666666666666',
  NETTOYAGE_S47: 'int_77777777-7777-4777-8777-777777777777',
  NETTOYAGE_S46_DECAPAGE: 'int_88888888-8888-4888-8888-888888888888',
  // Chauffage
  REPARATION_CHAUDIERE: 'int_99999999-9999-4999-8999-999999999999',
  // Interphone
  REPARATION_INTERPHONE: 'int_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  // Sécurité incendie
  INSPECTION_SECURITE: 'int_bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
} as const;

// ============================================
// DONNÉES MOCK
// ============================================

export const INTERVENTIONS_MOCK: Intervention[] = [
  // ============================================
  // ASCENSEUR
  // ============================================
  {
    id: INTERVENTION_IDS.MAINTENANCE_ASC_NOV,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    prestataire_id: PRESTATAIRE_IDS.SCHINDLER,
    contrat_id: CONTRAT_IDS.ASCENSEUR_SCHINDLER,
    ordre_service_id: undefined,
    facture_id: undefined,
    reference: 'INT-2024-001',
    titre: 'Maintenance préventive ascenseur',
    description: 'Contrôle mensuel, graissage, vérification sécurité',
    date: '2024-11-15',
    type: 'ENTRETIEN',
    domaine: 'ASCENSEUR',
    intervenant_nom: 'Schindler Ascenseurs',
    statut: 'TERMINEE',
    montant: 0,
    est_inclus_contrat: true,
    commentaires: 'RAS. Ascenseur en bon état.',
    pieces_jointes: [],
    est_reglementaire: true,
    periodicite: 'MENSUELLE',
    created_at: '2024-11-15T00:00:00Z',
    updated_at: '2024-11-15T00:00:00Z',
  },
  {
    id: INTERVENTION_IDS.DEPANNAGE_ASC_OCT,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    prestataire_id: PRESTATAIRE_IDS.SCHINDLER,
    contrat_id: CONTRAT_IDS.ASCENSEUR_SCHINDLER,
    ordre_service_id: undefined,
    facture_id: undefined,
    reference: 'INT-2024-002',
    titre: 'Dépannage ascenseur - Porte bloquée',
    description: 'Intervention urgente pour porte cabine bloquée étage 2',
    date: '2024-10-12',
    type: 'REPARATION',
    domaine: 'ASCENSEUR',
    intervenant_nom: 'Schindler Ascenseurs',
    statut: 'TERMINEE',
    montant: 0,
    est_inclus_contrat: true,
    commentaires: 'Intervention sous 2h. Réglage porte effectué.',
    pieces_jointes: [],
    est_reglementaire: false,
    periodicite: 'PONCTUELLE',
    created_at: '2024-10-12T00:00:00Z',
    updated_at: '2024-10-12T00:00:00Z',
  },
  {
    id: INTERVENTION_IDS.MAINTENANCE_ASC_SEPT,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    prestataire_id: PRESTATAIRE_IDS.SCHINDLER,
    contrat_id: CONTRAT_IDS.ASCENSEUR_SCHINDLER,
    ordre_service_id: undefined,
    facture_id: undefined,
    reference: 'INT-2024-003',
    titre: 'Maintenance préventive ascenseur',
    description: 'Contrôle mensuel, test alarme, nettoyage cabine',
    date: '2024-09-18',
    type: 'ENTRETIEN',
    domaine: 'ASCENSEUR',
    intervenant_nom: 'Schindler Ascenseurs',
    statut: 'TERMINEE',
    montant: 0,
    est_inclus_contrat: true,
    pieces_jointes: [],
    est_reglementaire: true,
    periodicite: 'MENSUELLE',
    created_at: '2024-09-18T00:00:00Z',
    updated_at: '2024-09-18T00:00:00Z',
  },

  // ============================================
  // ESPACES VERTS
  // ============================================
  {
    id: INTERVENTION_IDS.ENTRETIEN_EV_NOV,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    prestataire_id: PRESTATAIRE_IDS.PAYSAGISTE_EXPERT,
    contrat_id: CONTRAT_IDS.ESPACES_VERTS,
    ordre_service_id: undefined,
    facture_id: undefined,
    reference: 'INT-2024-004',
    titre: 'Entretien espaces verts - Novembre',
    description: 'Tonte pelouse, taille haies, ramassage feuilles mortes',
    date: '2024-11-25',
    type: 'ENTRETIEN',
    domaine: 'ESPACES_VERTS',
    intervenant_nom: 'Paysagiste Expert',
    statut: 'TERMINEE',
    montant: 400,
    est_inclus_contrat: true,
    pieces_jointes: [],
    est_reglementaire: false,
    periodicite: 'MENSUELLE',
    created_at: '2024-11-25T00:00:00Z',
    updated_at: '2024-11-25T00:00:00Z',
  },
  {
    id: INTERVENTION_IDS.ENTRETIEN_EV_OCT,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    prestataire_id: PRESTATAIRE_IDS.PAYSAGISTE_EXPERT,
    contrat_id: CONTRAT_IDS.ESPACES_VERTS,
    ordre_service_id: undefined,
    facture_id: undefined,
    reference: 'INT-2024-005',
    titre: 'Entretien espaces verts - Octobre',
    description: 'Tonte pelouse, désherbage allées, plantation bulbes',
    date: '2024-10-20',
    type: 'ENTRETIEN',
    domaine: 'ESPACES_VERTS',
    intervenant_nom: 'Paysagiste Expert',
    statut: 'TERMINEE',
    montant: 400,
    est_inclus_contrat: true,
    pieces_jointes: [],
    est_reglementaire: false,
    periodicite: 'MENSUELLE',
    created_at: '2024-10-20T00:00:00Z',
    updated_at: '2024-10-20T00:00:00Z',
  },

  // ============================================
  // NETTOYAGE
  // ============================================
  {
    id: INTERVENTION_IDS.NETTOYAGE_S48,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    prestataire_id: PRESTATAIRE_IDS.NETTOYAGE_PRO,
    contrat_id: CONTRAT_IDS.NETTOYAGE_PARTIES_COMMUNES,
    ordre_service_id: undefined,
    facture_id: undefined,
    reference: 'INT-2024-006',
    titre: 'Nettoyage parties communes - Semaine 48',
    description: 'Nettoyage complet hall, escaliers, couloirs (4 étages)',
    date: '2024-12-01',
    type: 'ENTRETIEN',
    domaine: 'MENAGE',
    intervenant_nom: 'Nettoyage Pro',
    statut: 'TERMINEE',
    montant: 0,
    est_inclus_contrat: true,
    pieces_jointes: [],
    est_reglementaire: false,
    periodicite: 'MENSUELLE',
    created_at: '2024-12-01T00:00:00Z',
    updated_at: '2024-12-01T00:00:00Z',
  },
  {
    id: INTERVENTION_IDS.NETTOYAGE_S47,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    prestataire_id: PRESTATAIRE_IDS.NETTOYAGE_PRO,
    contrat_id: CONTRAT_IDS.NETTOYAGE_PARTIES_COMMUNES,
    ordre_service_id: undefined,
    facture_id: undefined,
    reference: 'INT-2024-007',
    titre: 'Nettoyage parties communes - Semaine 47',
    description: 'Nettoyage complet + lavage vitres entrée',
    date: '2024-11-24',
    type: 'ENTRETIEN',
    domaine: 'MENAGE',
    intervenant_nom: 'Nettoyage Pro',
    statut: 'TERMINEE',
    montant: 0,
    est_inclus_contrat: true,
    pieces_jointes: [],
    est_reglementaire: false,
    periodicite: 'MENSUELLE',
    created_at: '2024-11-24T00:00:00Z',
    updated_at: '2024-11-24T00:00:00Z',
  },
  {
    id: INTERVENTION_IDS.NETTOYAGE_S46_DECAPAGE,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    prestataire_id: PRESTATAIRE_IDS.NETTOYAGE_PRO,
    contrat_id: CONTRAT_IDS.NETTOYAGE_PARTIES_COMMUNES,
    ordre_service_id: undefined,
    facture_id: undefined,
    reference: 'INT-2024-008',
    titre: 'Nettoyage parties communes - Semaine 46',
    description: "Nettoyage complet + décapage sol hall d'entrée",
    date: '2024-11-17',
    type: 'AMELIORATION',
    domaine: 'MENAGE',
    intervenant_nom: 'Nettoyage Pro',
    statut: 'TERMINEE',
    montant: 150,
    est_inclus_contrat: false,
    commentaires: 'Décapage supplémentaire facturé en extra.',
    pieces_jointes: [],
    est_reglementaire: false,
    periodicite: 'PONCTUELLE',
    created_at: '2024-11-17T00:00:00Z',
    updated_at: '2024-11-17T00:00:00Z',
  },

  // ============================================
  // CHAUFFAGE
  // ============================================
  {
    id: INTERVENTION_IDS.REPARATION_CHAUDIERE,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    prestataire_id: PRESTATAIRE_IDS.CHAUFFAGE_EXPERT,
    contrat_id: CONTRAT_IDS.CHAUFFAGE_COLLECTIF,
    ordre_service_id: undefined,
    facture_id: undefined,
    reference: 'INT-2024-009',
    titre: 'Réparation chaudière - Fuite circuit',
    description: 'Intervention urgente pour fuite sur circuit chauffage principal',
    date: '2024-11-10',
    type: 'REPARATION',
    domaine: 'CHAUFFAGE',
    intervenant_nom: 'Chauffage Expert',
    statut: 'TERMINEE',
    montant: 350,
    est_inclus_contrat: false,
    commentaires: 'Pièce de rechange facturée (joint défectueux). Garantie 1 an.',
    pieces_jointes: ['facture_chauffage_nov24.pdf'],
    est_reglementaire: false,
    periodicite: 'PONCTUELLE',
    created_at: '2024-11-10T00:00:00Z',
    updated_at: '2024-11-10T00:00:00Z',
  },

  // ============================================
  // INTERPHONE / ÉLECTRICITÉ
  // ============================================
  {
    id: INTERVENTION_IDS.REPARATION_INTERPHONE,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    prestataire_id: PRESTATAIRE_IDS.TECHELEC,
    contrat_id: undefined,
    ordre_service_id: undefined,
    facture_id: 'f123',
    reference: 'INT-2024-010',
    titre: 'Réparation interphone bâtiment A',
    description: 'Remplacement module défaillant interphone entrée principale',
    date: '2024-10-08',
    type: 'REPARATION',
    domaine: 'INTERPHONE',
    intervenant_nom: 'TechElec Services',
    statut: 'TERMINEE',
    montant: 450,
    est_inclus_contrat: false,
    commentaires: 'Module remplacé. Garantie 2 ans.',
    pieces_jointes: ['facture_interphone_oct24.pdf'],
    est_reglementaire: false,
    periodicite: 'PONCTUELLE',
    created_at: '2024-10-08T00:00:00Z',
    updated_at: '2024-10-08T00:00:00Z',
  },

  // ============================================
  // SÉCURITÉ INCENDIE
  // ============================================
  {
    id: INTERVENTION_IDS.INSPECTION_SECURITE,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    prestataire_id: PRESTATAIRE_IDS.SECURHABITAT, // SecurMax → utilise SECURHABITAT
    contrat_id: undefined,
    ordre_service_id: undefined,
    facture_id: undefined,
    reference: 'INT-2024-011',
    titre: 'Inspection sécurité incendie',
    description: 'Contrôle réglementaire annuel extincteurs et système alarme',
    date: '2024-12-10',
    type: 'CONTROLE',
    domaine: 'SECURITE_INCENDIE',
    intervenant_nom: 'SecurMax',
    statut: 'PLANIFIEE',
    montant: 280,
    est_inclus_contrat: false,
    pieces_jointes: [],
    est_reglementaire: true,
    periodicite: 'ANNUELLE',
    created_at: '2024-12-01T00:00:00Z',
    updated_at: '2024-12-01T00:00:00Z',
  },
];

// ============================================
// STATISTIQUES
// ============================================

export const INTERVENTIONS_STATS = {
  total: INTERVENTIONS_MOCK.length,
  par_statut: {
    TERMINEE: INTERVENTIONS_MOCK.filter((i) => i.statut === 'TERMINEE').length,
    PLANIFIEE: INTERVENTIONS_MOCK.filter((i) => i.statut === 'PLANIFIEE').length,
    EN_COURS: INTERVENTIONS_MOCK.filter((i) => i.statut === 'EN_COURS').length,
    ANNULEE: INTERVENTIONS_MOCK.filter((i) => i.statut === 'ANNULEE').length,
    REPORTEE: INTERVENTIONS_MOCK.filter((i) => i.statut === 'REPORTEE').length,
  },
  par_type: {
    ENTRETIEN: INTERVENTIONS_MOCK.filter((i) => i.type === 'ENTRETIEN').length,
    REPARATION: INTERVENTIONS_MOCK.filter((i) => i.type === 'REPARATION').length,
    AMELIORATION: INTERVENTIONS_MOCK.filter((i) => i.type === 'AMELIORATION').length,
    CONTROLE: INTERVENTIONS_MOCK.filter((i) => i.type === 'CONTROLE').length,
  },
  par_domaine: (() => {
    const domaines: Record<string, number> = {};
    INTERVENTIONS_MOCK.forEach((i) => {
      domaines[i.domaine] = (domaines[i.domaine] || 0) + 1;
    });
    return domaines;
  })(),
  montant_total: INTERVENTIONS_MOCK.reduce((sum, i) => sum + i.montant, 0),
  inclus_contrat: INTERVENTIONS_MOCK.filter((i) => i.est_inclus_contrat).length,
  hors_contrat: INTERVENTIONS_MOCK.filter((i) => !i.est_inclus_contrat).length,
  reglementaires: INTERVENTIONS_MOCK.filter((i) => i.est_reglementaire).length,
};

// ============================================
// TABLE DE CORRESPONDANCE (migration)
// ============================================

export const INTERVENTION_ID_MAP: Record<string, string> = {
  int1: INTERVENTION_IDS.MAINTENANCE_ASC_NOV,
  int2: INTERVENTION_IDS.DEPANNAGE_ASC_OCT,
  int3: INTERVENTION_IDS.MAINTENANCE_ASC_SEPT,
  int4: INTERVENTION_IDS.ENTRETIEN_EV_NOV,
  int5: INTERVENTION_IDS.ENTRETIEN_EV_OCT,
  int6: INTERVENTION_IDS.NETTOYAGE_S48,
  int7: INTERVENTION_IDS.NETTOYAGE_S47,
  int8: INTERVENTION_IDS.NETTOYAGE_S46_DECAPAGE,
  int9: INTERVENTION_IDS.REPARATION_CHAUDIERE,
  int10: INTERVENTION_IDS.REPARATION_INTERPHONE,
  int11: INTERVENTION_IDS.INSPECTION_SECURITE,
};

// ============================================
// HELPERS
// ============================================

export function getInterventionById(id: string): Intervention | undefined {
  return INTERVENTIONS_MOCK.find((i) => i.id === id);
}

export function getInterventionsByCopropriete(
  coproprieteId: string
): Intervention[] {
  return INTERVENTIONS_MOCK.filter((i) => i.copropriete_id === coproprieteId);
}

export function getInterventionsByPrestataire(
  prestataireId: string
): Intervention[] {
  return INTERVENTIONS_MOCK.filter((i) => i.prestataire_id === prestataireId);
}

export function getInterventionsByContrat(contratId: string): Intervention[] {
  return INTERVENTIONS_MOCK.filter((i) => i.contrat_id === contratId);
}

export function getInterventionsByDomaine(
  domaine: DomaineIntervention
): Intervention[] {
  return INTERVENTIONS_MOCK.filter((i) => i.domaine === domaine);
}

export function getInterventionsByType(type: TypeIntervention): Intervention[] {
  return INTERVENTIONS_MOCK.filter((i) => i.type === type);
}

export function getInterventionsByStatut(
  statut: StatutIntervention
): Intervention[] {
  return INTERVENTIONS_MOCK.filter((i) => i.statut === statut);
}

export function getInterventionsTerminees(): Intervention[] {
  return INTERVENTIONS_MOCK.filter((i) => i.statut === 'TERMINEE');
}

export function getInterventionsPlanifiees(): Intervention[] {
  return INTERVENTIONS_MOCK.filter((i) => i.statut === 'PLANIFIEE');
}

export function getInterventionsReglementaires(): Intervention[] {
  return INTERVENTIONS_MOCK.filter((i) => i.est_reglementaire);
}

export function getInterventionsHorsContrat(): Intervention[] {
  return INTERVENTIONS_MOCK.filter((i) => !i.est_inclus_contrat);
}

export function getInterventionsByPeriode(
  dateDebut: string,
  dateFin: string
): Intervention[] {
  return INTERVENTIONS_MOCK.filter(
    (i) => i.date >= dateDebut && i.date <= dateFin
  );
}

export function calculerCoutParDomaine(): Record<DomaineIntervention, number> {
  const result: Record<string, number> = {};
  INTERVENTIONS_MOCK.forEach((i) => {
    result[i.domaine] = (result[i.domaine] || 0) + i.montant;
  });
  return result as Record<DomaineIntervention, number>;
}

export function calculerCoutHorsContrat(): number {
  return INTERVENTIONS_MOCK.filter((i) => !i.est_inclus_contrat).reduce(
    (sum, i) => sum + i.montant,
    0
  );
}
