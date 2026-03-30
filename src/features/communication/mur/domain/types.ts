// ============================================================================
// Mur (Wall) — Types du domaine
// ============================================================================

/** Catégorie d'une publication */
export type PostCategory = 'information' | 'urgent' | 'question' | 'evenement' | 'sondage';

/** Rôle de l'auteur */
export type AuthorRole = 'syndic' | 'copro' | 'conseil' | 'prestataire' | 'gardien';

/** Pièce jointe d'un post */
export interface IPostAttachment {
  id: string;
  name: string;
  size: string;
  type: 'pdf' | 'image' | 'document';
  url?: string;
}

/** Publication sur le mur */
export interface IWallPost {
  id: string;
  coproprieteId: string;
  authorId: string;
  authorName: string;
  authorRole: AuthorRole;
  title: string;
  content: string;
  category: PostCategory;
  isPinned: boolean;
  isLocked: boolean;
  attachments: IPostAttachment[];
  likesCount: number;
  commentsCount: number;
  isLikedByMe: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Commentaire sur un post */
export interface IWallComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorRole: AuthorRole;
  content: string;
  parentId: string | null;
  likesCount: number;
  isLikedByMe: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Données pour créer un nouveau post */
export interface INewPostData {
  title: string;
  content: string;
  category: PostCategory;
  attachments?: IPostAttachment[];
}
