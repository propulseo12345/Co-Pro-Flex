import { BaseEntity, ID } from '../common';
import { CategoriForum, TypeEvenement } from '../enums';

export interface IMessage extends BaseEntity {
  conversationId: ID;
  expediteurId: ID;
  contenu: string;
  piecesJointes: ID[];
  lu: boolean;
  dateLecture?: Date;
}

export interface IConversation extends BaseEntity {
  participantIds: ID[];
  dernierMessageId?: ID;
  dernierMessageDate?: Date;
  titre?: string;
}

export interface IPost extends BaseEntity {
  coproprieteId: ID;
  auteurId: ID;
  contenu: string;
  piecesJointes: ID[];
  epingle: boolean;
  visible: boolean;
  commentaires: ICommentaire[];
  reactions: IReaction[];
}

export interface ICommentaire extends BaseEntity {
  postId: ID;
  auteurId: ID;
  contenu: string;
}

export interface IReaction {
  utilisateurId: ID;
  type: 'LIKE' | 'UTILE';
}

export interface IEvenement extends BaseEntity {
  coproprieteId: ID;
  titre: string;
  description?: string;
  dateDebut: Date;
  dateFin?: Date;
  lieu?: string;
  createurId: ID;
  participants?: ID[];
}

/**
 * Legacy ForumTopic interface
 */
export interface ForumTopic {
  id: string;
  titre: string;
  auteur: string;
  dateCreation: string;
  categorie: CategoriForum | string;
  nbReponses: number;
  dernierMessage?: string;
  dernierAuteur?: string;
}

/**
 * Legacy ForumMessage interface
 */
export interface ForumMessage {
  id: string;
  topicId: string;
  auteur: string;
  contenu: string;
  date: string;
  isMe?: boolean;
}

/**
 * Legacy Event interface
 */
export interface Event {
  id: string;
  titre: string;
  date: string;
  lieu: string;
  description: string;
  type: TypeEvenement | string;
  organisateur: string;
}

/**
 * Legacy Conversation interface
 */
export interface Conversation {
  id: string;
  participants: string[];
  dernierMessage: string;
  dateDernierMessage: string;
  nonLu: boolean;
}

/**
 * Legacy PrivateMessage interface
 */
export interface PrivateMessage {
  id: string;
  conversationId: string;
  auteur: string;
  contenu: string;
  date: string;
  isMe: boolean;
}
