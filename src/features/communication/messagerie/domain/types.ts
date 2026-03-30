// ============================================================================
// Messagerie (Chat) — Types du domaine
// ============================================================================

/** Type de conversation */
export type ConversationType = 'direct' | 'group' | 'prestataire';

/** Rôle d'un utilisateur dans la copropriété */
export type UserRole = 'syndic' | 'copro' | 'conseil' | 'prestataire' | 'gardien';

/** Type de message */
export type MessageType = 'text' | 'image' | 'file' | 'system';

/** Filtres de la liste de conversations */
export type ConversationFilter = 'all' | 'unread' | 'archived' | 'direct' | 'group' | 'prestataire';

/** Pièce jointe d'un message */
export interface IMessageAttachment {
  id: string;
  name: string;
  size: string;
  type: 'pdf' | 'image' | 'document';
  url?: string;
}

/** Message dans une conversation */
export interface IMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  type: MessageType;
  content: string;
  attachments: IMessageAttachment[];
  isEdited: boolean;
  isDeleted: boolean;
  replyToId?: string;
  createdAt: string;
  updatedAt: string;
}

/** Membre d'une conversation */
export interface IConversationMember {
  id: string;
  conversationId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  isAdmin: boolean;
  lastReadAt: string | null;
  joinedAt: string;
}

/** Conversation complète (avec membres et messages) */
export interface IConversation {
  id: string;
  coproprieteId: string;
  type: ConversationType;
  title: string | null;
  avatar: string | null;
  isArchived: boolean;
  isMuted: boolean;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  members: IConversationMember[];
  messages: IMessage[];
}

/** Aperçu d'une conversation (pour la liste latérale) */
export interface IConversationPreview {
  id: string;
  type: ConversationType;
  title: string;
  avatar: string | null;
  lastMessage: string;
  lastMessageAt: string;
  lastSenderName: string;
  unreadCount: number;
  memberCount: number;
  isArchived: boolean;
  isMuted: boolean;
}

/** Données pour créer une nouvelle conversation */
export interface INewConversationData {
  type: ConversationType;
  title?: string;
  memberIds: string[];
  firstMessage: string;
}
