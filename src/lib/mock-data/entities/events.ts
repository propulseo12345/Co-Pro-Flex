/**
 * Mock Data - Événements / Calendrier
 *
 * @source Fusionné depuis :
 *   - src/data/mock/index.ts → MOCK_EVENTS (3)
 *   - Assemblées (lien avec AG)
 * @created 2025-01-19
 *
 * Relations:
 * - copropriete_id → coproprietes.id
 * - created_by_user_id → users.id
 * - assemblee_id → assemblees.id (optionnel)
 * - intervention_id → interventions.id (optionnel)
 *
 * Notes:
 * - Types : AG, réunion CS, travaux, intervention, événement social, autre
 * - Support récurrence (hebdo, mensuel, annuel)
 * - Rappels configurables
 */

import { BaseEntity } from '../types';
import { COPROPRIETE_IDS } from './coproprietes';
import { USER_IDS } from './users';
import { ASSEMBLEE_IDS } from './assemblees';

// ============================================
// TYPES
// ============================================

export type EventType =
  | 'ag' // Assemblée Générale
  | 'reunion_cs' // Réunion Conseil Syndical
  | 'travaux' // Travaux programmés
  | 'intervention' // Intervention technique
  | 'evenement_social' // Événement convivial
  | 'collecte' // Collecte encombrants, etc.
  | 'autre';

export type RecurrencePattern = 'weekly' | 'monthly' | 'yearly';

export type EventVisibilite = 'tous' | 'conseil_syndical' | 'syndic_seul';

export interface Event extends BaseEntity {
  // FK Relations
  copropriete_id: string;
  created_by_user_id: string;
  assemblee_id?: string;
  intervention_id?: string;

  // Contenu
  titre: string;
  description?: string;
  type: EventType;

  // Dates
  date_debut: string;
  date_fin?: string;
  is_journee_entiere: boolean;

  // Lieu
  lieu?: string;

  // Organisateur
  organisateur?: string;

  // Récurrence
  is_recurrent: boolean;
  recurrence_pattern?: RecurrencePattern;
  recurrence_end_date?: string;
  parent_event_id?: string; // Si occurrence d'une série

  // Visibilité
  visibilite: EventVisibilite;

  // Rappels (en minutes avant l'événement)
  rappel_avant_minutes?: number[]; // ex: [1440, 60] = 24h et 1h avant

  // Participation
  nb_inscrits?: number;
  participant_ids?: string[];

  // Notes
  notes?: string;
}

// ============================================
// IDS PRÉGÉNÉRÉS
// ============================================

export const EVENT_IDS = {
  SOIREE_FIN_ANNEE: 'evt_11111111-1111-4111-8111-111111111111',
  COLLECTE_ENCOMBRANTS: 'evt_22222222-2222-4222-8222-222222222222',
  REUNION_CS_NOV: 'evt_33333333-3333-4333-8333-333333333333',
  AG_2025: 'evt_44444444-4444-4444-8444-444444444444',
  INTERVENTION_ASCENSEUR: 'evt_55555555-5555-4555-8555-555555555555',
  TRAVAUX_RAVALEMENT: 'evt_66666666-6666-4666-8666-666666666666',
  NETTOYAGE_PARKINGS: 'evt_77777777-7777-4777-8777-777777777777',
} as const;

// ============================================
// DONNÉES MOCK
// ============================================

export const EVENTS_MOCK: Event[] = [
  // ============================================
  // Événement social : Soirée de fin d'année
  // Source: MOCK_EVENTS[0]
  // ============================================
  {
    id: EVENT_IDS.SOIREE_FIN_ANNEE,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    created_by_user_id: USER_IDS.COPRO_1,
    titre: "Soirée de fin d'année",
    description:
      "Apéritif dinatoire pour fêter la fin d'année ensemble ! Chacun peut apporter un plat ou une boisson à partager.",
    type: 'evenement_social',
    date_debut: '2024-12-20T19:30:00',
    date_fin: '2024-12-20T23:00:00',
    is_journee_entiere: false,
    lieu: 'Salle commune',
    organisateur: 'Mme Rousseau',
    is_recurrent: false,
    visibilite: 'tous',
    rappel_avant_minutes: [1440, 60], // 24h et 1h avant
    nb_inscrits: 18,
    participant_ids: [
      USER_IDS.COPRO_1,
      USER_IDS.COPRO_2,
      USER_IDS.PRESIDENT_CS,
    ],
    notes: 'Pensez à apporter vos couverts réutilisables !',
    created_at: '2024-10-18T14:00:00Z',
    updated_at: '2024-11-15T10:00:00Z',
  },

  // ============================================
  // Collecte encombrants
  // Source: MOCK_EVENTS[1]
  // ============================================
  {
    id: EVENT_IDS.COLLECTE_ENCOMBRANTS,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    created_by_user_id: USER_IDS.SYNDIC,
    titre: 'Collecte encombrants',
    description:
      'Merci de déposer vos encombrants la veille au soir (max 21h) sur le parking extérieur, zone délimitée.',
    type: 'collecte',
    date_debut: '2024-11-15T08:00:00',
    date_fin: '2024-11-15T12:00:00',
    is_journee_entiere: false,
    lieu: 'Parking extérieur',
    organisateur: 'Mairie',
    is_recurrent: true,
    recurrence_pattern: 'monthly',
    visibilite: 'tous',
    rappel_avant_minutes: [2880], // 48h avant
    notes: 'Service municipal - Gratuit',
    created_at: '2024-10-01T09:00:00Z',
    updated_at: '2024-10-01T09:00:00Z',
  },

  // ============================================
  // Réunion Conseil Syndical
  // Source: MOCK_EVENTS[2]
  // ============================================
  {
    id: EVENT_IDS.REUNION_CS_NOV,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    created_by_user_id: USER_IDS.PRESIDENT_CS,
    titre: 'Réunion Conseil Syndical',
    description:
      'Ordre du jour : Préparation du budget 2025, point sur les travaux en cours, questions diverses.',
    type: 'reunion_cs',
    date_debut: '2024-11-08T18:00:00',
    date_fin: '2024-11-08T20:00:00',
    is_journee_entiere: false,
    lieu: 'Bureau du président',
    organisateur: 'Président CS',
    is_recurrent: false,
    visibilite: 'conseil_syndical',
    rappel_avant_minutes: [1440, 120], // 24h et 2h avant
    nb_inscrits: 5,
    notes: 'Prévoir les documents budgétaires',
    created_at: '2024-10-25T10:00:00Z',
    updated_at: '2024-10-25T10:00:00Z',
  },

  // ============================================
  // AG 2025 (lié à l'assemblée)
  // ============================================
  {
    id: EVENT_IDS.AG_2025,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    created_by_user_id: USER_IDS.SYNDIC,
    assemblee_id: ASSEMBLEE_IDS.AG_ORD_2025,
    titre: 'Assemblée Générale Ordinaire 2025',
    description:
      'AG annuelle. Ordre du jour : Approbation comptes 2024, Budget prévisionnel 2026, Renouvellement CS, Questions diverses.',
    type: 'ag',
    date_debut: '2025-06-14T14:00:00',
    date_fin: '2025-06-14T18:00:00',
    is_journee_entiere: false,
    lieu: 'Salle des fêtes - 15 rue de la Mairie',
    organisateur: 'Syndic',
    is_recurrent: false,
    visibilite: 'tous',
    rappel_avant_minutes: [20160, 10080, 1440], // 14j, 7j, 24h avant
    notes: 'Convocation envoyée 21 jours avant - Quorum: 455 tantièmes minimum',
    created_at: '2025-05-01T10:00:00Z',
    updated_at: '2025-05-01T10:00:00Z',
  },

  // ============================================
  // Intervention technique
  // ============================================
  {
    id: EVENT_IDS.INTERVENTION_ASCENSEUR,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    created_by_user_id: USER_IDS.SYNDIC,
    titre: 'Maintenance annuelle ascenseur',
    description:
      "Visite de maintenance annuelle obligatoire. L'ascenseur sera hors service de 9h à 12h.",
    type: 'intervention',
    date_debut: '2024-11-20T09:00:00',
    date_fin: '2024-11-20T12:00:00',
    is_journee_entiere: false,
    lieu: 'Ascenseur bâtiment A',
    organisateur: 'Ascenseurs Modernes',
    is_recurrent: true,
    recurrence_pattern: 'yearly',
    visibilite: 'tous',
    rappel_avant_minutes: [4320, 1440], // 3j et 24h avant
    notes: 'Contrat n° ASC-2024-001 - Visite obligatoire',
    created_at: '2024-10-15T14:00:00Z',
    updated_at: '2024-10-15T14:00:00Z',
  },

  // ============================================
  // Travaux ravalement (achevés)
  // ============================================
  {
    id: EVENT_IDS.TRAVAUX_RAVALEMENT,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    created_by_user_id: USER_IDS.SYNDIC,
    titre: 'Fin des travaux de ravalement',
    description:
      'Réception des travaux de ravalement de façade avec le maître d\'oeuvre.',
    type: 'travaux',
    date_debut: '2024-11-15T10:00:00',
    date_fin: '2024-11-15T12:00:00',
    is_journee_entiere: false,
    lieu: 'Façade principale',
    organisateur: 'Ravalement Express SARL',
    is_recurrent: false,
    visibilite: 'conseil_syndical',
    rappel_avant_minutes: [1440],
    notes: 'PV de réception à signer',
    created_at: '2024-10-01T10:00:00Z',
    updated_at: '2024-11-15T12:00:00Z',
  },

  // ============================================
  // Nettoyage parkings (récurrent)
  // ============================================
  {
    id: EVENT_IDS.NETTOYAGE_PARKINGS,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    created_by_user_id: USER_IDS.SYNDIC,
    titre: 'Nettoyage des parkings',
    description:
      'Nettoyage trimestriel des parkings. Merci de déplacer vos véhicules pour faciliter le nettoyage.',
    type: 'intervention',
    date_debut: '2024-12-01T07:00:00',
    date_fin: '2024-12-01T10:00:00',
    is_journee_entiere: false,
    lieu: 'Parking souterrain niveau -1',
    organisateur: 'CleanPro Services',
    is_recurrent: true,
    recurrence_pattern: 'monthly',
    recurrence_end_date: '2025-12-31',
    visibilite: 'tous',
    rappel_avant_minutes: [2880, 720], // 48h et 12h avant
    notes: 'Prochaines dates: 1er de chaque mois',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-11-01T10:00:00Z',
  },
];

// ============================================
// STATISTIQUES
// ============================================

export const EVENTS_STATS = {
  total: EVENTS_MOCK.length,
  par_type: {
    ag: EVENTS_MOCK.filter((e) => e.type === 'ag').length,
    reunion_cs: EVENTS_MOCK.filter((e) => e.type === 'reunion_cs').length,
    travaux: EVENTS_MOCK.filter((e) => e.type === 'travaux').length,
    intervention: EVENTS_MOCK.filter((e) => e.type === 'intervention').length,
    evenement_social: EVENTS_MOCK.filter((e) => e.type === 'evenement_social')
      .length,
    collecte: EVENTS_MOCK.filter((e) => e.type === 'collecte').length,
    autre: EVENTS_MOCK.filter((e) => e.type === 'autre').length,
  },
  recurrents: EVENTS_MOCK.filter((e) => e.is_recurrent).length,
  par_visibilite: {
    tous: EVENTS_MOCK.filter((e) => e.visibilite === 'tous').length,
    conseil_syndical: EVENTS_MOCK.filter(
      (e) => e.visibilite === 'conseil_syndical'
    ).length,
    syndic_seul: EVENTS_MOCK.filter((e) => e.visibilite === 'syndic_seul')
      .length,
  },
};

// ============================================
// TABLE DE CORRESPONDANCE (migration)
// ============================================

export const EVENT_ID_MAP: Record<string, string> = {
  '1': EVENT_IDS.SOIREE_FIN_ANNEE,
  '2': EVENT_IDS.COLLECTE_ENCOMBRANTS,
  '3': EVENT_IDS.REUNION_CS_NOV,
};

// ============================================
// HELPERS
// ============================================

export function getEventById(id: string): Event | undefined {
  return EVENTS_MOCK.find((e) => e.id === id);
}

export function getEventsByCopropriete(coproprieteId: string): Event[] {
  return EVENTS_MOCK.filter((e) => e.copropriete_id === coproprieteId);
}

export function getEventsVisibles(
  coproprieteId: string,
  userRole: 'coproprietaire' | 'conseil_syndical' | 'syndic'
): Event[] {
  return EVENTS_MOCK.filter((e) => {
    if (e.copropriete_id !== coproprieteId) return false;
    if (e.visibilite === 'tous') return true;
    if (e.visibilite === 'conseil_syndical' && userRole !== 'coproprietaire')
      return true;
    if (e.visibilite === 'syndic_seul' && userRole === 'syndic') return true;
    return false;
  });
}

export function getEventsByType(type: EventType): Event[] {
  return EVENTS_MOCK.filter((e) => e.type === type);
}

export function getEventsAVenir(coproprieteId?: string): Event[] {
  const now = new Date();
  return EVENTS_MOCK.filter((e) => {
    if (coproprieteId && e.copropriete_id !== coproprieteId) return false;
    return new Date(e.date_debut) > now;
  }).sort(
    (a, b) => new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime()
  );
}

export function getEventsDuMois(annee: number, mois: number): Event[] {
  return EVENTS_MOCK.filter((e) => {
    const date = new Date(e.date_debut);
    return date.getFullYear() === annee && date.getMonth() === mois;
  });
}

export function getEventsParSemaine(dateDebut: Date): Event[] {
  const dateFin = new Date(dateDebut);
  dateFin.setDate(dateFin.getDate() + 7);

  return EVENTS_MOCK.filter((e) => {
    const date = new Date(e.date_debut);
    return date >= dateDebut && date < dateFin;
  });
}

export function getEventsRecurrents(): Event[] {
  return EVENTS_MOCK.filter((e) => e.is_recurrent);
}

export function formatDureeEvent(event: Event): string {
  if (event.is_journee_entiere) return 'Journée entière';

  const debut = new Date(event.date_debut);
  const fin = event.date_fin ? new Date(event.date_fin) : null;

  const heureDebut = debut.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (!fin) return heureDebut;

  const heureFin = fin.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${heureDebut} - ${heureFin}`;
}
