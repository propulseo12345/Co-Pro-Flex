// ============================================================================
// Messagerie (Chat) — Données mockées
// ============================================================================

import type {
  IConversation,
  IConversationPreview,
  IConversationMember,
  IMessage,
} from '@/features/communication/messagerie/domain/types';

// ----------------------------------------------------------------------------
// IDs constants
// ----------------------------------------------------------------------------

const COPRO_ID = 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c';
const SYNDIC_ID = 'u1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c';
const SYNDIC_NAME = 'Marie Laurent';

const DUPONT_ID = 'u2000001-0000-4000-a000-000000000001';
const GARCIA_ID = 'u2000001-0000-4000-a000-000000000002';
const LEFEBVRE_ID = 'u2000001-0000-4000-a000-000000000003';
const MOREAU_ID = 'u2000001-0000-4000-a000-000000000004';
const PETIT_ID = 'u2000001-0000-4000-a000-000000000005';
const PLOMBERIE_ID = 'u2000001-0000-4000-a000-000000000006';

// Conversation IDs
const CONV_DUPONT = 'cv000001-0000-4000-a000-000000000001';
const CONV_GARCIA = 'cv000001-0000-4000-a000-000000000002';
const CONV_LEFEBVRE = 'cv000001-0000-4000-a000-000000000003';
const CONV_CS = 'cv000001-0000-4000-a000-000000000004';
const CONV_PLOMBERIE = 'cv000001-0000-4000-a000-000000000005';

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function member(
  conversationId: string,
  userId: string,
  userName: string,
  userRole: IConversationMember['userRole'],
  isAdmin: boolean,
  lastReadAt: string | null,
): IConversationMember {
  return {
    id: `cm-${conversationId.slice(0, 8)}-${userId.slice(0, 8)}`,
    conversationId,
    userId,
    userName,
    userRole,
    isAdmin,
    lastReadAt,
    joinedAt: '2025-01-15T10:00:00Z',
  };
}

function msg(
  id: string,
  conversationId: string,
  senderId: string,
  senderName: string,
  senderRole: IMessage['senderRole'],
  content: string,
  createdAt: string,
): IMessage {
  return {
    id,
    conversationId,
    senderId,
    senderName,
    senderRole,
    type: 'text',
    content,
    attachments: [],
    isEdited: false,
    isDeleted: false,
    createdAt,
    updatedAt: createdAt,
  };
}

// ----------------------------------------------------------------------------
// Conversations complètes (avec membres et messages)
// ----------------------------------------------------------------------------

export const MOCK_CONVERSATIONS: IConversation[] = [
  // ── 1. Direct : Dupont (fuite) — 3 msgs, 2 unread ────────────────────
  {
    id: CONV_DUPONT,
    coproprieteId: COPRO_ID,
    type: 'direct',
    title: null,
    avatar: null,
    isArchived: false,
    isMuted: false,
    lastMessageAt: '2025-03-28T10:30:00Z',
    createdAt: '2025-03-28T09:00:00Z',
    updatedAt: '2025-03-28T10:30:00Z',
    members: [
      member(CONV_DUPONT, SYNDIC_ID, SYNDIC_NAME, 'syndic', true, '2025-03-28T09:05:00Z'),
      member(CONV_DUPONT, DUPONT_ID, 'Jean Dupont', 'copro', false, '2025-03-28T10:30:00Z'),
    ],
    messages: [
      msg('msg-d1-001', CONV_DUPONT, DUPONT_ID, 'Jean Dupont', 'copro',
        'Bonjour, la fuite dans ma salle de bain s\'aggrave. L\'eau coule chez le voisin maintenant.',
        '2025-03-28T09:00:00Z'),
      msg('msg-d1-002', CONV_DUPONT, SYNDIC_ID, SYNDIC_NAME, 'syndic',
        'Bonjour M. Dupont, je prends note. J\'envoie un plombier aujourd\'hui.',
        '2025-03-28T09:05:00Z'),
      msg('msg-d1-003', CONV_DUPONT, DUPONT_ID, 'Jean Dupont', 'copro',
        'Merci. Le voisin M. Martin (lot 8B) est très inquiet. Pouvez-vous le contacter aussi ?',
        '2025-03-28T10:30:00Z'),
    ],
  },

  // ── 2. Direct : Garcia (charges) — 2 msgs, 1 unread ──────────────────
  {
    id: CONV_GARCIA,
    coproprieteId: COPRO_ID,
    type: 'direct',
    title: null,
    avatar: null,
    isArchived: false,
    isMuted: false,
    lastMessageAt: '2025-03-27T15:10:00Z',
    createdAt: '2025-03-27T14:30:00Z',
    updatedAt: '2025-03-27T15:10:00Z',
    members: [
      member(CONV_GARCIA, SYNDIC_ID, SYNDIC_NAME, 'syndic', true, '2025-03-27T14:35:00Z'),
      member(CONV_GARCIA, GARCIA_ID, 'Maria Garcia', 'copro', false, '2025-03-27T15:10:00Z'),
    ],
    messages: [
      msg('msg-g1-001', CONV_GARCIA, GARCIA_ID, 'Maria Garcia', 'copro',
        'Bonjour, j\'ai une question sur l\'augmentation des charges. +12% c\'est beaucoup, non ?',
        '2025-03-27T14:30:00Z'),
      msg('msg-g1-002', CONV_GARCIA, GARCIA_ID, 'Maria Garcia', 'copro',
        'J\'aimerais aussi savoir si c\'est possible d\'avoir le détail par poste de dépense.',
        '2025-03-27T15:10:00Z'),
    ],
  },

  // ── 3. Direct : Lefebvre (parking) — 2 msgs, lu ──────────────────────
  {
    id: CONV_LEFEBVRE,
    coproprieteId: COPRO_ID,
    type: 'direct',
    title: null,
    avatar: null,
    isArchived: false,
    isMuted: false,
    lastMessageAt: '2025-03-25T09:00:00Z',
    createdAt: '2025-03-24T17:00:00Z',
    updatedAt: '2025-03-25T09:00:00Z',
    members: [
      member(CONV_LEFEBVRE, SYNDIC_ID, SYNDIC_NAME, 'syndic', true, '2025-03-25T09:05:00Z'),
      member(CONV_LEFEBVRE, LEFEBVRE_ID, 'Philippe Lefebvre', 'copro', false, '2025-03-25T09:00:00Z'),
    ],
    messages: [
      msg('msg-l1-001', CONV_LEFEBVRE, LEFEBVRE_ID, 'Philippe Lefebvre', 'copro',
        'Bonsoir, le véhicule sur ma place est toujours là. Vous avez pu identifier le propriétaire ?',
        '2025-03-24T17:00:00Z'),
      msg('msg-l1-002', CONV_LEFEBVRE, SYNDIC_ID, SYNDIC_NAME, 'syndic',
        'Oui, c\'est un locataire du 2ème. Je l\'ai contacté, il déplacera sa voiture ce soir. Désolée du désagrément.',
        '2025-03-25T09:00:00Z'),
    ],
  },

  // ── 4. Groupe : Conseil Syndical (devis OTIS) — 4 msgs, 1 unread ────
  {
    id: CONV_CS,
    coproprieteId: COPRO_ID,
    type: 'group',
    title: 'Conseil Syndical — Devis ascenseur',
    avatar: null,
    isArchived: false,
    isMuted: false,
    lastMessageAt: '2025-03-28T16:00:00Z',
    createdAt: '2025-03-26T10:00:00Z',
    updatedAt: '2025-03-28T16:00:00Z',
    members: [
      member(CONV_CS, SYNDIC_ID, SYNDIC_NAME, 'syndic', true, '2025-03-28T14:30:00Z'),
      member(CONV_CS, MOREAU_ID, 'Sophie Moreau', 'conseil', false, '2025-03-28T16:00:00Z'),
      member(CONV_CS, PETIT_ID, 'Laurent Petit', 'conseil', false, '2025-03-27T18:00:00Z'),
    ],
    messages: [
      msg('msg-cs-001', CONV_CS, SYNDIC_ID, SYNDIC_NAME, 'syndic',
        'Bonjour à tous. J\'ai reçu le devis OTIS pour la modernisation de l\'ascenseur : 45 000 € HT. Je vous le transmets.',
        '2025-03-26T10:00:00Z'),
      msg('msg-cs-002', CONV_CS, MOREAU_ID, 'Sophie Moreau', 'conseil',
        'Merci Marie. Le montant est dans la fourchette attendue. Avez-vous un devis concurrent ?',
        '2025-03-26T14:00:00Z'),
      msg('msg-cs-003', CONV_CS, SYNDIC_ID, SYNDIC_NAME, 'syndic',
        'Oui, j\'ai sollicité Schindler et ThyssenKrupp. Retours attendus sous 10 jours.',
        '2025-03-27T09:00:00Z'),
      msg('msg-cs-004', CONV_CS, MOREAU_ID, 'Sophie Moreau', 'conseil',
        'Parfait. On fait un point quand on a les 3 devis ? Il faudra trancher avant l\'AG.',
        '2025-03-28T16:00:00Z'),
    ],
  },

  // ── 5. Prestataire : Plomberie Express (confirmation RDV) — 2 msgs, lu
  {
    id: CONV_PLOMBERIE,
    coproprieteId: COPRO_ID,
    type: 'prestataire',
    title: 'Plomberie Express — Intervention fuite',
    avatar: null,
    isArchived: false,
    isMuted: false,
    lastMessageAt: '2025-03-28T11:00:00Z',
    createdAt: '2025-03-28T10:00:00Z',
    updatedAt: '2025-03-28T11:00:00Z',
    members: [
      member(CONV_PLOMBERIE, SYNDIC_ID, SYNDIC_NAME, 'syndic', true, '2025-03-28T11:05:00Z'),
      member(CONV_PLOMBERIE, PLOMBERIE_ID, 'Pierre Leroy', 'prestataire', false, '2025-03-28T11:00:00Z'),
    ],
    messages: [
      msg('msg-p1-001', CONV_PLOMBERIE, SYNDIC_ID, SYNDIC_NAME, 'syndic',
        'Bonjour M. Leroy, pouvez-vous intervenir aujourd\'hui pour une fuite urgente au 3ème étage (lot 12B) ?',
        '2025-03-28T10:00:00Z'),
      msg('msg-p1-002', CONV_PLOMBERIE, PLOMBERIE_ID, 'Pierre Leroy', 'prestataire',
        'Bonjour Mme Laurent. Oui, je peux passer entre 14h et 15h. Je vous confirme quand je suis sur place.',
        '2025-03-28T11:00:00Z'),
    ],
  },
];

// ----------------------------------------------------------------------------
// Aperçus pour la liste latérale (dérivés des conversations)
// ----------------------------------------------------------------------------

function derivePreview(conv: IConversation, unreadCount: number): IConversationPreview {
  const lastMsg = conv.messages[conv.messages.length - 1];
  const otherMember = conv.members.find((m) => m.userId !== SYNDIC_ID);
  const title = conv.title ?? otherMember?.userName ?? 'Conversation';

  return {
    id: conv.id,
    type: conv.type,
    title,
    avatar: conv.avatar,
    lastMessage: lastMsg?.content ?? '',
    lastMessageAt: lastMsg?.createdAt ?? conv.createdAt,
    lastSenderName: lastMsg?.senderName ?? '',
    unreadCount,
    memberCount: conv.members.length,
    isArchived: conv.isArchived,
    isMuted: conv.isMuted,
  };
}

export const MOCK_CONVERSATION_PREVIEWS: IConversationPreview[] = [
  derivePreview(MOCK_CONVERSATIONS[0], 2),  // Dupont — 2 unread
  derivePreview(MOCK_CONVERSATIONS[1], 1),  // Garcia — 1 unread
  derivePreview(MOCK_CONVERSATIONS[3], 1),  // CS — 1 unread
  derivePreview(MOCK_CONVERSATIONS[4], 0),  // Plomberie — read
  derivePreview(MOCK_CONVERSATIONS[2], 0),  // Lefebvre — read
];
