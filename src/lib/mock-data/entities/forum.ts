/**
 * Mock Data - Forum communautaire (Topics + Messages)
 *
 * @source Fusionné depuis :
 *   - src/data/mock/index.ts → MOCK_FORUM_TOPICS (3)
 *   - src/data/mock/index.ts → MOCK_FORUM_MESSAGES (3)
 * @created 2025-01-19
 *
 * Relations:
 * - copropriete_id → coproprietes.id
 * - auteur_user_id → users.id
 * - topic_id → topics.id (pour messages)
 * - parent_message_id → messages.id (réponses)
 *
 * Notes:
 * - Topics organisés par catégorie (général, travaux, voisinage, annonces, suggestions)
 * - Support épinglage et verrouillage
 * - Modération par le syndic/CS
 */

import { BaseEntity } from '../types';
import { COPROPRIETE_IDS } from './coproprietes';
import { USER_IDS } from './users';

// ============================================
// TYPES
// ============================================

export type ForumCategorie =
  | 'general'
  | 'travaux'
  | 'voisinage'
  | 'annonces'
  | 'suggestions'
  | 'questions';

export interface ForumTopic extends BaseEntity {
  // FK Relations
  copropriete_id: string;
  auteur_user_id: string;

  // Contenu
  titre: string;
  categorie: ForumCategorie;

  // Stats
  nb_messages: number;
  nb_vues: number;

  // Dernier message
  date_dernier_message?: string;
  dernier_message_user_id?: string;
  dernier_message_auteur?: string;

  // Modération
  is_pinned: boolean; // Épinglé en haut
  is_locked: boolean; // Fermé aux réponses
  is_visible: boolean;
  modere_par_user_id?: string;
  date_moderation?: string;
  raison_moderation?: string;
}

export interface ForumMessage extends BaseEntity {
  // FK Relations
  topic_id: string;
  auteur_user_id: string;
  parent_message_id?: string; // Si réponse à un message

  // Contenu
  contenu: string;
  auteur_nom: string;

  // Modération
  is_visible: boolean;
  modere_par_user_id?: string;
  date_moderation?: string;
  raison_moderation?: string;

  // Réactions
  nb_likes: number;
  liked_by_user_ids?: string[];

  // Édition
  is_edited: boolean;
  date_edition?: string;
}

// ============================================
// IDS PRÉGÉNÉRÉS
// ============================================

export const FORUM_TOPIC_IDS = {
  BRUIT_TRAVAUX: 'ftop_11111111-1111-4111-8111-111111111111',
  PORTE_ENTREE: 'ftop_22222222-2222-4222-8222-222222222222',
  SOIREE_DECEMBRE: 'ftop_33333333-3333-4333-8333-333333333333',
  VELOS_ELECTRIQUES: 'ftop_44444444-4444-4444-8444-444444444444',
  GARDIENNAGE: 'ftop_55555555-5555-4555-8555-555555555555',
} as const;

export const FORUM_MESSAGE_IDS = {
  MSG_BRUIT_1: 'fmsg_11111111-1111-4111-8111-111111111111',
  MSG_BRUIT_2: 'fmsg_22222222-2222-4222-8222-222222222222',
  MSG_BRUIT_3: 'fmsg_33333333-3333-4333-8333-333333333333',
  MSG_PORTE_1: 'fmsg_44444444-4444-4444-8444-444444444444',
  MSG_PORTE_2: 'fmsg_55555555-5555-4555-8555-555555555555',
  MSG_SOIREE_1: 'fmsg_66666666-6666-4666-8666-666666666666',
  MSG_SOIREE_2: 'fmsg_77777777-7777-4777-8777-777777777777',
  MSG_VELOS_1: 'fmsg_88888888-8888-4888-8888-888888888888',
  MSG_GARDIENNAGE_1: 'fmsg_99999999-9999-4999-8999-999999999999',
} as const;

// ============================================
// DONNÉES MOCK - TOPICS
// ============================================

export const FORUM_TOPICS_MOCK: ForumTopic[] = [
  {
    id: FORUM_TOPIC_IDS.BRUIT_TRAVAUX,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    auteur_user_id: USER_IDS.COPRO_1,
    titre: 'Bruit de travaux au 5ème étage',
    categorie: 'voisinage',
    nb_messages: 7,
    nb_vues: 42,
    date_dernier_message: '2024-10-29T14:30:00',
    dernier_message_user_id: USER_IDS.SYNDIC,
    dernier_message_auteur: 'Syndic',
    is_pinned: false,
    is_locked: false,
    is_visible: true,
    created_at: '2024-10-28T09:15:00Z',
    updated_at: '2024-10-29T14:30:00Z',
  },
  {
    id: FORUM_TOPIC_IDS.PORTE_ENTREE,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    auteur_user_id: USER_IDS.COPRO_2,
    titre: "Porte d'entrée principale défaillante",
    categorie: 'travaux',
    nb_messages: 4,
    nb_vues: 28,
    date_dernier_message: '2024-10-24T11:00:00',
    dernier_message_user_id: USER_IDS.SYNDIC,
    dernier_message_auteur: 'Syndic',
    is_pinned: true, // Épinglé car suivi en cours
    is_locked: false,
    is_visible: true,
    created_at: '2024-10-23T10:00:00Z',
    updated_at: '2024-10-24T11:00:00Z',
  },
  {
    id: FORUM_TOPIC_IDS.SOIREE_DECEMBRE,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    auteur_user_id: USER_IDS.COPRO_1,
    titre: 'Soirée conviviale décembre 2024',
    categorie: 'annonces',
    nb_messages: 15,
    nb_vues: 89,
    date_dernier_message: '2024-10-29T18:45:00',
    dernier_message_user_id: USER_IDS.COPRO_1,
    dernier_message_auteur: 'Mme Dubois',
    is_pinned: true, // Épinglé pour visibilité
    is_locked: false,
    is_visible: true,
    created_at: '2024-10-18T14:00:00Z',
    updated_at: '2024-10-29T18:45:00Z',
  },
  {
    id: FORUM_TOPIC_IDS.VELOS_ELECTRIQUES,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    auteur_user_id: USER_IDS.PRESIDENT_CS,
    titre: 'Bornes de recharge vélos électriques - Retour AG',
    categorie: 'general',
    nb_messages: 8,
    nb_vues: 35,
    date_dernier_message: '2024-11-01T10:00:00',
    dernier_message_user_id: USER_IDS.PRESIDENT_CS,
    dernier_message_auteur: 'Président CS',
    is_pinned: false,
    is_locked: false,
    is_visible: true,
    created_at: '2024-06-20T15:00:00Z',
    updated_at: '2024-11-01T10:00:00Z',
  },
  {
    id: FORUM_TOPIC_IDS.GARDIENNAGE,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    auteur_user_id: USER_IDS.COPRO_2,
    titre: 'Question sur les horaires du gardien',
    categorie: 'questions',
    nb_messages: 3,
    nb_vues: 18,
    date_dernier_message: '2024-10-15T09:30:00',
    dernier_message_user_id: USER_IDS.SYNDIC,
    dernier_message_auteur: 'Syndic',
    is_pinned: false,
    is_locked: true, // Fermé car répondu
    is_visible: true,
    created_at: '2024-10-14T16:00:00Z',
    updated_at: '2024-10-15T09:30:00Z',
  },
];

// ============================================
// DONNÉES MOCK - MESSAGES
// ============================================

export const FORUM_MESSAGES_MOCK: ForumMessage[] = [
  // === Topic: Bruit de travaux ===
  {
    id: FORUM_MESSAGE_IDS.MSG_BRUIT_1,
    topic_id: FORUM_TOPIC_IDS.BRUIT_TRAVAUX,
    auteur_user_id: USER_IDS.COPRO_1,
    auteur_nom: 'Mme Dubois',
    contenu:
      "Bonjour, j'aimerais signaler des bruits de marteau-piqueur très forts depuis ce matin. C'est vraiment gênant !",
    is_visible: true,
    nb_likes: 3,
    liked_by_user_ids: [
      USER_IDS.COPRO_2,
      USER_IDS.SYNDIC,
      USER_IDS.PRESIDENT_CS,
    ],
    is_edited: false,
    created_at: '2024-10-28T09:15:00Z',
    updated_at: '2024-10-28T09:15:00Z',
  },
  {
    id: FORUM_MESSAGE_IDS.MSG_BRUIT_2,
    topic_id: FORUM_TOPIC_IDS.BRUIT_TRAVAUX,
    auteur_user_id: USER_IDS.COPRO_2,
    auteur_nom: 'M. Martin',
    parent_message_id: FORUM_MESSAGE_IDS.MSG_BRUIT_1,
    contenu:
      "Désolé, c'est pour des travaux urgents dans mon appartement. Cela devrait être terminé demain.",
    is_visible: true,
    nb_likes: 1,
    is_edited: false,
    created_at: '2024-10-28T11:45:00Z',
    updated_at: '2024-10-28T11:45:00Z',
  },
  {
    id: FORUM_MESSAGE_IDS.MSG_BRUIT_3,
    topic_id: FORUM_TOPIC_IDS.BRUIT_TRAVAUX,
    auteur_user_id: USER_IDS.COPRO_1,
    auteur_nom: 'Mme Dubois',
    parent_message_id: FORUM_MESSAGE_IDS.MSG_BRUIT_2,
    contenu:
      "Merci pour l'information. Pourriez-vous éviter les heures de repos svp ? (12h-14h et après 19h)",
    is_visible: true,
    nb_likes: 2,
    is_edited: false,
    created_at: '2024-10-28T14:20:00Z',
    updated_at: '2024-10-28T14:20:00Z',
  },

  // === Topic: Porte d'entrée ===
  {
    id: FORUM_MESSAGE_IDS.MSG_PORTE_1,
    topic_id: FORUM_TOPIC_IDS.PORTE_ENTREE,
    auteur_user_id: USER_IDS.COPRO_2,
    auteur_nom: 'M. Bernard',
    contenu:
      "Bonjour à tous, la porte d'entrée principale ferme très mal depuis quelques jours. Il faut forcer pour la fermer. Quelqu'un d'autre a constaté le problème ?",
    is_visible: true,
    nb_likes: 5,
    is_edited: false,
    created_at: '2024-10-23T10:00:00Z',
    updated_at: '2024-10-23T10:00:00Z',
  },
  {
    id: FORUM_MESSAGE_IDS.MSG_PORTE_2,
    topic_id: FORUM_TOPIC_IDS.PORTE_ENTREE,
    auteur_user_id: USER_IDS.SYNDIC,
    auteur_nom: 'Syndic',
    parent_message_id: FORUM_MESSAGE_IDS.MSG_PORTE_1,
    contenu:
      "Merci pour le signalement M. Bernard. J'ai contacté le serrurier. Intervention prévue demain matin entre 9h et 11h.",
    is_visible: true,
    nb_likes: 8,
    is_edited: false,
    created_at: '2024-10-24T11:00:00Z',
    updated_at: '2024-10-24T11:00:00Z',
  },

  // === Topic: Soirée décembre ===
  {
    id: FORUM_MESSAGE_IDS.MSG_SOIREE_1,
    topic_id: FORUM_TOPIC_IDS.SOIREE_DECEMBRE,
    auteur_user_id: USER_IDS.COPRO_1,
    auteur_nom: 'Mme Rousseau',
    contenu:
      "Bonjour à tous ! Comme chaque année, je propose d'organiser une petite soirée conviviale pour fêter la fin d'année ensemble. Date proposée : vendredi 20 décembre à 19h30 dans la salle commune. Merci de confirmer votre présence ! 🎄",
    is_visible: true,
    nb_likes: 12,
    is_edited: false,
    created_at: '2024-10-18T14:00:00Z',
    updated_at: '2024-10-18T14:00:00Z',
  },
  {
    id: FORUM_MESSAGE_IDS.MSG_SOIREE_2,
    topic_id: FORUM_TOPIC_IDS.SOIREE_DECEMBRE,
    auteur_user_id: USER_IDS.COPRO_2,
    auteur_nom: 'Mme Dubois',
    contenu:
      "Super initiative ! On sera là avec plaisir. Je peux apporter un gâteau maison si ça vous dit ?",
    is_visible: true,
    nb_likes: 6,
    is_edited: false,
    created_at: '2024-10-29T18:45:00Z',
    updated_at: '2024-10-29T18:45:00Z',
  },

  // === Topic: Vélos électriques ===
  {
    id: FORUM_MESSAGE_IDS.MSG_VELOS_1,
    topic_id: FORUM_TOPIC_IDS.VELOS_ELECTRIQUES,
    auteur_user_id: USER_IDS.PRESIDENT_CS,
    auteur_nom: 'Président CS',
    contenu:
      "Suite à l'AG du 15 juin, je vous informe que les 4 prises de recharge pour vélos électriques ont été installées dans le local vélos. Merci de ne pas dépasser 4h de charge par vélo pour permettre à tous d'en profiter.",
    is_visible: true,
    nb_likes: 15,
    is_edited: true,
    date_edition: '2024-06-21T09:00:00',
    created_at: '2024-06-20T15:00:00Z',
    updated_at: '2024-06-21T09:00:00Z',
  },

  // === Topic: Gardiennage ===
  {
    id: FORUM_MESSAGE_IDS.MSG_GARDIENNAGE_1,
    topic_id: FORUM_TOPIC_IDS.GARDIENNAGE,
    auteur_user_id: USER_IDS.SYNDIC,
    auteur_nom: 'Syndic',
    contenu:
      'Pour information, les horaires du gardien sont : Lundi-Vendredi 8h-12h et 14h-18h, Samedi 8h-12h. En dehors de ces horaires, vous pouvez contacter le numéro d\'urgence affiché dans le hall.',
    is_visible: true,
    nb_likes: 4,
    is_edited: false,
    created_at: '2024-10-15T09:30:00Z',
    updated_at: '2024-10-15T09:30:00Z',
  },
];

// ============================================
// STATISTIQUES
// ============================================

export const FORUM_STATS = {
  topics: {
    total: FORUM_TOPICS_MOCK.length,
    par_categorie: {
      general: FORUM_TOPICS_MOCK.filter((t) => t.categorie === 'general').length,
      travaux: FORUM_TOPICS_MOCK.filter((t) => t.categorie === 'travaux').length,
      voisinage: FORUM_TOPICS_MOCK.filter((t) => t.categorie === 'voisinage')
        .length,
      annonces: FORUM_TOPICS_MOCK.filter((t) => t.categorie === 'annonces')
        .length,
      suggestions: FORUM_TOPICS_MOCK.filter((t) => t.categorie === 'suggestions')
        .length,
      questions: FORUM_TOPICS_MOCK.filter((t) => t.categorie === 'questions')
        .length,
    },
    epingles: FORUM_TOPICS_MOCK.filter((t) => t.is_pinned).length,
    verrouilles: FORUM_TOPICS_MOCK.filter((t) => t.is_locked).length,
  },
  messages: {
    total: FORUM_MESSAGES_MOCK.length,
    total_likes: FORUM_MESSAGES_MOCK.reduce((sum, m) => sum + m.nb_likes, 0),
    edites: FORUM_MESSAGES_MOCK.filter((m) => m.is_edited).length,
  },
  vues_totales: FORUM_TOPICS_MOCK.reduce((sum, t) => sum + t.nb_vues, 0),
};

// ============================================
// TABLE DE CORRESPONDANCE (migration)
// ============================================

export const FORUM_TOPIC_ID_MAP: Record<string, string> = {
  '1': FORUM_TOPIC_IDS.BRUIT_TRAVAUX,
  '2': FORUM_TOPIC_IDS.PORTE_ENTREE,
  '3': FORUM_TOPIC_IDS.SOIREE_DECEMBRE,
};

export const FORUM_MESSAGE_ID_MAP: Record<string, string> = {
  '1': FORUM_MESSAGE_IDS.MSG_BRUIT_1,
  '2': FORUM_MESSAGE_IDS.MSG_BRUIT_2,
  '3': FORUM_MESSAGE_IDS.MSG_BRUIT_3,
};

// ============================================
// HELPERS
// ============================================

export function getTopicById(id: string): ForumTopic | undefined {
  return FORUM_TOPICS_MOCK.find((t) => t.id === id);
}

export function getTopicsByCopropriete(coproprieteId: string): ForumTopic[] {
  return FORUM_TOPICS_MOCK.filter(
    (t) => t.copropriete_id === coproprieteId && t.is_visible
  ).sort((a, b) => {
    // Épinglés en premier, puis par date
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return (
      new Date(b.date_dernier_message || b.created_at).getTime() -
      new Date(a.date_dernier_message || a.created_at).getTime()
    );
  });
}

export function getTopicsByCategorie(categorie: ForumCategorie): ForumTopic[] {
  return FORUM_TOPICS_MOCK.filter(
    (t) => t.categorie === categorie && t.is_visible
  );
}

export function getMessagesByTopic(topicId: string): ForumMessage[] {
  return FORUM_MESSAGES_MOCK.filter(
    (m) => m.topic_id === topicId && m.is_visible
  ).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export function getForumMessageById(id: string): ForumMessage | undefined {
  return FORUM_MESSAGES_MOCK.find((m) => m.id === id);
}

export function getReplies(messageId: string): ForumMessage[] {
  return FORUM_MESSAGES_MOCK.filter(
    (m) => m.parent_message_id === messageId && m.is_visible
  );
}

export function getTopicsRecents(limit: number = 5): ForumTopic[] {
  return FORUM_TOPICS_MOCK.filter((t) => t.is_visible)
    .sort(
      (a, b) =>
        new Date(b.date_dernier_message || b.created_at).getTime() -
        new Date(a.date_dernier_message || a.created_at).getTime()
    )
    .slice(0, limit);
}

export function getTopicsPopulaires(limit: number = 5): ForumTopic[] {
  return FORUM_TOPICS_MOCK.filter((t) => t.is_visible)
    .sort((a, b) => b.nb_vues - a.nb_vues)
    .slice(0, limit);
}
