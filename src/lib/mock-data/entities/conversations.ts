/**
 * Mock Data - Messagerie interne (Conversations + Messages)
 *
 * @source Fusionné depuis :
 *   - src/data/mock/index.ts → MOCK_CONVERSATIONS (2)
 *   - src/data/mock/index.ts → MOCK_PRIVATE_MESSAGES (2)
 * @created 2025-01-19
 *
 * Relations:
 * - copropriete_id → coproprietes.id
 * - participant_ids → users.id
 * - auteur_user_id → users.id
 *
 * Notes:
 * - Support conversations privées (1-1) et groupes
 * - Suivi des messages lus/non lus par utilisateur
 * - Support fichiers et images
 */

import { BaseEntity } from '../types';
import { COPROPRIETE_IDS } from './coproprietes';
import { USER_IDS } from './users';

// ============================================
// TYPES
// ============================================

export type ConversationType = 'prive' | 'groupe' | 'support';

export type MessageType = 'texte' | 'fichier' | 'image' | 'systeme';

export interface Conversation extends BaseEntity {
  // FK Relations
  copropriete_id: string;
  participant_ids: string[]; // FK → users

  // Type
  type: ConversationType;
  titre?: string; // Pour groupes

  // Dernier message
  dernier_message_preview?: string;
  dernier_message_date?: string;
  dernier_message_user_id?: string;
  dernier_message_auteur?: string;

  // Non lus par utilisateur
  nb_non_lus_par_user: Record<string, number>;

  // Archivage
  is_archived_par_user?: Record<string, boolean>;

  // Mute
  is_muted_par_user?: Record<string, boolean>;
}

export interface Message extends BaseEntity {
  // FK Relations
  conversation_id: string;
  auteur_user_id: string;

  // Contenu
  contenu: string;
  auteur_nom: string;

  // Type
  type: MessageType;
  fichier_url?: string;
  fichier_nom?: string;
  fichier_taille?: number; // en bytes

  // Lecture
  lu_par_user_ids: string[];
  date_lu_par_user?: Record<string, string>;

  // Réponse
  reply_to_message_id?: string;

  // Modération / Suppression
  is_deleted: boolean;
  deleted_at?: string;
  deleted_by_user_id?: string;

  // Édition
  is_edited: boolean;
  edited_at?: string;
}

// ============================================
// IDS PRÉGÉNÉRÉS
// ============================================

export const CONVERSATION_IDS = {
  CONV_MARTIN: 'conv_11111111-1111-4111-8111-111111111111',
  CONV_DUBOIS: 'conv_22222222-2222-4222-8222-222222222222',
  CONV_GROUPE_CS: 'conv_33333333-3333-4333-8333-333333333333',
  CONV_SUPPORT: 'conv_44444444-4444-4444-8444-444444444444',
} as const;

export const MESSAGE_IDS = {
  MSG_MARTIN_1: 'msg_11111111-1111-4111-8111-111111111111',
  MSG_MARTIN_2: 'msg_22222222-2222-4222-8222-222222222222',
  MSG_DUBOIS_1: 'msg_33333333-3333-4333-8333-333333333333',
  MSG_DUBOIS_2: 'msg_44444444-4444-4444-8444-444444444444',
  MSG_CS_1: 'msg_55555555-5555-4555-8555-555555555555',
  MSG_CS_2: 'msg_66666666-6666-4666-8666-666666666666',
  MSG_CS_3: 'msg_77777777-7777-4777-8777-777777777777',
} as const;

// ============================================
// DONNÉES MOCK - CONVERSATIONS
// ============================================

export const CONVERSATIONS_MOCK: Conversation[] = [
  // ============================================
  // Conversation privée avec M. Martin
  // Source: MOCK_CONVERSATIONS[0]
  // ============================================
  {
    id: CONVERSATION_IDS.CONV_MARTIN,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    participant_ids: [USER_IDS.SYNDIC, USER_IDS.COPRO_2],
    type: 'prive',
    dernier_message_preview: 'Bonjour, avez-vous bien reçu mon paiement ?',
    dernier_message_date: '2024-10-29T15:30:00',
    dernier_message_user_id: USER_IDS.COPRO_2,
    dernier_message_auteur: 'M. Martin',
    nb_non_lus_par_user: {
      [USER_IDS.SYNDIC]: 1,
      [USER_IDS.COPRO_2]: 0,
    },
    created_at: '2024-10-20T10:00:00Z',
    updated_at: '2024-10-29T15:30:00Z',
  },

  // ============================================
  // Conversation privée avec Mme Dubois
  // Source: MOCK_CONVERSATIONS[1]
  // ============================================
  {
    id: CONVERSATION_IDS.CONV_DUBOIS,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    participant_ids: [USER_IDS.SYNDIC, USER_IDS.COPRO_1],
    type: 'prive',
    dernier_message_preview: 'Merci beaucoup pour votre retour.',
    dernier_message_date: '2024-10-28T10:15:00',
    dernier_message_user_id: USER_IDS.COPRO_1,
    dernier_message_auteur: 'Mme Dubois',
    nb_non_lus_par_user: {
      [USER_IDS.SYNDIC]: 0,
      [USER_IDS.COPRO_1]: 0,
    },
    created_at: '2024-10-15T14:00:00Z',
    updated_at: '2024-10-28T10:15:00Z',
  },

  // ============================================
  // Groupe Conseil Syndical
  // ============================================
  {
    id: CONVERSATION_IDS.CONV_GROUPE_CS,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    participant_ids: [
      USER_IDS.SYNDIC,
      USER_IDS.PRESIDENT_CS,
      USER_IDS.COPRO_1,
      USER_IDS.COPRO_2,
    ],
    type: 'groupe',
    titre: 'Conseil Syndical 2024',
    dernier_message_preview:
      "RDV confirmé pour jeudi 8 novembre à 18h. Ordre du jour en PJ.",
    dernier_message_date: '2024-11-05T09:00:00',
    dernier_message_user_id: USER_IDS.PRESIDENT_CS,
    dernier_message_auteur: 'Président CS',
    nb_non_lus_par_user: {
      [USER_IDS.SYNDIC]: 0,
      [USER_IDS.PRESIDENT_CS]: 0,
      [USER_IDS.COPRO_1]: 2,
      [USER_IDS.COPRO_2]: 1,
    },
    created_at: '2024-06-20T10:00:00Z',
    updated_at: '2024-11-05T09:00:00Z',
  },

  // ============================================
  // Conversation support (avec le syndic)
  // ============================================
  {
    id: CONVERSATION_IDS.CONV_SUPPORT,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    participant_ids: [USER_IDS.SYNDIC, USER_IDS.ADMIN],
    type: 'support',
    titre: 'Support technique - Résidence Les Ormes',
    dernier_message_preview:
      'Votre demande a bien été prise en compte. Un technicien vous contactera.',
    dernier_message_date: '2024-10-25T11:00:00',
    dernier_message_user_id: USER_IDS.ADMIN,
    dernier_message_auteur: 'Support CoProFlex',
    nb_non_lus_par_user: {
      [USER_IDS.SYNDIC]: 0,
      [USER_IDS.ADMIN]: 0,
    },
    created_at: '2024-10-24T15:00:00Z',
    updated_at: '2024-10-25T11:00:00Z',
  },
];

// ============================================
// DONNÉES MOCK - MESSAGES
// ============================================

export const MESSAGES_MOCK: Message[] = [
  // === Conversation M. Martin ===
  {
    id: MESSAGE_IDS.MSG_MARTIN_1,
    conversation_id: CONVERSATION_IDS.CONV_MARTIN,
    auteur_user_id: USER_IDS.COPRO_2,
    auteur_nom: 'M. Martin',
    contenu:
      'Bonjour, avez-vous bien reçu mon virement pour les charges du T4 ?',
    type: 'texte',
    lu_par_user_ids: [USER_IDS.COPRO_2],
    is_deleted: false,
    is_edited: false,
    created_at: '2024-10-29T15:30:00Z',
    updated_at: '2024-10-29T15:30:00Z',
  },
  {
    id: MESSAGE_IDS.MSG_MARTIN_2,
    conversation_id: CONVERSATION_IDS.CONV_MARTIN,
    auteur_user_id: USER_IDS.SYNDIC,
    auteur_nom: 'Syndic',
    contenu: 'Bonjour, je vérifie immédiatement et vous confirme.',
    type: 'texte',
    reply_to_message_id: MESSAGE_IDS.MSG_MARTIN_1,
    lu_par_user_ids: [USER_IDS.SYNDIC, USER_IDS.COPRO_2],
    is_deleted: false,
    is_edited: false,
    created_at: '2024-10-29T15:35:00Z',
    updated_at: '2024-10-29T15:35:00Z',
  },

  // === Conversation Mme Dubois ===
  {
    id: MESSAGE_IDS.MSG_DUBOIS_1,
    conversation_id: CONVERSATION_IDS.CONV_DUBOIS,
    auteur_user_id: USER_IDS.COPRO_1,
    auteur_nom: 'Mme Dubois',
    contenu:
      "Bonjour, je voulais vous remercier pour la rapidité d'intervention sur le problème de chauffage.",
    type: 'texte',
    lu_par_user_ids: [USER_IDS.COPRO_1, USER_IDS.SYNDIC],
    is_deleted: false,
    is_edited: false,
    created_at: '2024-10-28T09:30:00Z',
    updated_at: '2024-10-28T09:30:00Z',
  },
  {
    id: MESSAGE_IDS.MSG_DUBOIS_2,
    conversation_id: CONVERSATION_IDS.CONV_DUBOIS,
    auteur_user_id: USER_IDS.SYNDIC,
    auteur_nom: 'Syndic',
    contenu:
      "Je vous en prie ! N'hésitez pas si vous avez d'autres questions.",
    type: 'texte',
    lu_par_user_ids: [USER_IDS.SYNDIC, USER_IDS.COPRO_1],
    is_deleted: false,
    is_edited: false,
    created_at: '2024-10-28T10:00:00Z',
    updated_at: '2024-10-28T10:00:00Z',
  },

  // === Groupe Conseil Syndical ===
  {
    id: MESSAGE_IDS.MSG_CS_1,
    conversation_id: CONVERSATION_IDS.CONV_GROUPE_CS,
    auteur_user_id: USER_IDS.PRESIDENT_CS,
    auteur_nom: 'Président CS',
    contenu:
      "Bonjour à tous, je propose de fixer la prochaine réunion CS au jeudi 8 novembre à 18h. Qu'en pensez-vous ?",
    type: 'texte',
    lu_par_user_ids: [
      USER_IDS.PRESIDENT_CS,
      USER_IDS.SYNDIC,
      USER_IDS.COPRO_1,
    ],
    is_deleted: false,
    is_edited: false,
    created_at: '2024-11-01T10:00:00Z',
    updated_at: '2024-11-01T10:00:00Z',
  },
  {
    id: MESSAGE_IDS.MSG_CS_2,
    conversation_id: CONVERSATION_IDS.CONV_GROUPE_CS,
    auteur_user_id: USER_IDS.SYNDIC,
    auteur_nom: 'Syndic',
    contenu: "OK pour moi. Je prépare l'ordre du jour.",
    type: 'texte',
    reply_to_message_id: MESSAGE_IDS.MSG_CS_1,
    lu_par_user_ids: [USER_IDS.SYNDIC, USER_IDS.PRESIDENT_CS],
    is_deleted: false,
    is_edited: false,
    created_at: '2024-11-01T11:30:00Z',
    updated_at: '2024-11-01T11:30:00Z',
  },
  {
    id: MESSAGE_IDS.MSG_CS_3,
    conversation_id: CONVERSATION_IDS.CONV_GROUPE_CS,
    auteur_user_id: USER_IDS.PRESIDENT_CS,
    auteur_nom: 'Président CS',
    contenu:
      'RDV confirmé pour jeudi 8 novembre à 18h. Ordre du jour en PJ.',
    type: 'fichier',
    fichier_url: '/documents/cs/ordre-du-jour-cs-nov-2024.pdf',
    fichier_nom: 'ordre-du-jour-cs-nov-2024.pdf',
    fichier_taille: 125000, // 125 KB
    lu_par_user_ids: [USER_IDS.PRESIDENT_CS, USER_IDS.SYNDIC],
    is_deleted: false,
    is_edited: false,
    created_at: '2024-11-05T09:00:00Z',
    updated_at: '2024-11-05T09:00:00Z',
  },
];

// ============================================
// STATISTIQUES
// ============================================

export const CONVERSATIONS_STATS = {
  conversations: {
    total: CONVERSATIONS_MOCK.length,
    par_type: {
      prive: CONVERSATIONS_MOCK.filter((c) => c.type === 'prive').length,
      groupe: CONVERSATIONS_MOCK.filter((c) => c.type === 'groupe').length,
      support: CONVERSATIONS_MOCK.filter((c) => c.type === 'support').length,
    },
  },
  messages: {
    total: MESSAGES_MOCK.length,
    par_type: {
      texte: MESSAGES_MOCK.filter((m) => m.type === 'texte').length,
      fichier: MESSAGES_MOCK.filter((m) => m.type === 'fichier').length,
      image: MESSAGES_MOCK.filter((m) => m.type === 'image').length,
    },
    edites: MESSAGES_MOCK.filter((m) => m.is_edited).length,
    supprimes: MESSAGES_MOCK.filter((m) => m.is_deleted).length,
  },
};

// ============================================
// TABLE DE CORRESPONDANCE (migration)
// ============================================

export const CONVERSATION_ID_MAP: Record<string, string> = {
  '1': CONVERSATION_IDS.CONV_MARTIN,
  '2': CONVERSATION_IDS.CONV_DUBOIS,
};

export const MESSAGE_ID_MAP: Record<string, string> = {
  '1': MESSAGE_IDS.MSG_MARTIN_1,
  '2': MESSAGE_IDS.MSG_MARTIN_2,
};

// ============================================
// HELPERS
// ============================================

export function getConversationById(id: string): Conversation | undefined {
  return CONVERSATIONS_MOCK.find((c) => c.id === id);
}

export function getConversationsByUser(userId: string): Conversation[] {
  return CONVERSATIONS_MOCK.filter((c) => c.participant_ids.includes(userId)).sort(
    (a, b) =>
      new Date(b.dernier_message_date || b.created_at).getTime() -
      new Date(a.dernier_message_date || a.created_at).getTime()
  );
}

export function getConversationsByCopropriete(
  coproprieteId: string
): Conversation[] {
  return CONVERSATIONS_MOCK.filter((c) => c.copropriete_id === coproprieteId);
}

export function getConversationsNonLues(userId: string): Conversation[] {
  return CONVERSATIONS_MOCK.filter(
    (c) =>
      c.participant_ids.includes(userId) &&
      (c.nb_non_lus_par_user[userId] || 0) > 0
  );
}

export function getNbMessagesNonLus(userId: string): number {
  return CONVERSATIONS_MOCK.filter((c) => c.participant_ids.includes(userId))
    .reduce((sum, c) => sum + (c.nb_non_lus_par_user[userId] || 0), 0);
}

export function getMessagesByConversation(conversationId: string): Message[] {
  return MESSAGES_MOCK.filter(
    (m) => m.conversation_id === conversationId && !m.is_deleted
  ).sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export function getConversationMessageById(id: string): Message | undefined {
  return MESSAGES_MOCK.find((m) => m.id === id);
}

export function getConversationPrivee(
  userId1: string,
  userId2: string
): Conversation | undefined {
  return CONVERSATIONS_MOCK.find(
    (c) =>
      c.type === 'prive' &&
      c.participant_ids.includes(userId1) &&
      c.participant_ids.includes(userId2) &&
      c.participant_ids.length === 2
  );
}

export function getConversationsGroupes(userId: string): Conversation[] {
  return CONVERSATIONS_MOCK.filter(
    (c) => c.type === 'groupe' && c.participant_ids.includes(userId)
  );
}

export function formatMessagePreview(message: Message, maxLength: number = 50): string {
  if (message.type === 'fichier') return `📎 ${message.fichier_nom || 'Fichier'}`;
  if (message.type === 'image') return '🖼️ Image';
  if (message.contenu.length <= maxLength) return message.contenu;
  return `${message.contenu.substring(0, maxLength)}...`;
}

export function isMessageLu(message: Message, userId: string): boolean {
  return message.lu_par_user_ids.includes(userId);
}
