# Refonte Communication — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre le module Communication avec 3 sous-modules (Mail Proton-like, Messagerie Chat, Mur communautaire) + hub de navigation.

**Architecture:** 3 features indépendantes dans `src/features/communication/{mail,messagerie,mur}`, chacune avec domain/hooks/components. Pages dans `src/app/(dashboard)/communication/`. Données mockées (Supabase sera branché ultérieurement). Ancien code supprimé en dernier.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, CSS Modules, dark theme CoProFlex

**Spec:** `docs/superpowers/specs/2026-03-30-communication-refonte-design.md`

---

## Task 1: Migration SQL + Types domain (Mail)

**Files:**
- Create: `supabase/migrations/20260330_communication_refonte.sql`
- Create: `src/features/communication/mail/domain/types.ts`
- Create: `src/features/communication/mail/domain/constants.ts`

- [ ] **Step 1: Créer la migration SQL**

```sql
-- supabase/migrations/20260330_communication_refonte.sql

-- ============================================================
-- MODULE MAIL
-- ============================================================

CREATE TABLE IF NOT EXISTS mail_folders_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id uuid NOT NULL REFERENCES coproprietes(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  name text NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  system_type text CHECK (system_type IN ('inbox', 'sent', 'drafts', 'archive', 'trash', 'spam')),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mail_labels_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id uuid NOT NULL REFERENCES coproprietes(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id uuid NOT NULL REFERENCES coproprietes(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  from_email text NOT NULL,
  from_name text NOT NULL,
  to_emails jsonb NOT NULL DEFAULT '[]',
  cc_emails jsonb DEFAULT '[]',
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  body_html text,
  attachments jsonb DEFAULT '[]',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'received')),
  is_read boolean NOT NULL DEFAULT false,
  is_starred boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  folder_id uuid REFERENCES mail_folders_v2(id) ON DELETE SET NULL,
  label_ids uuid[] DEFAULT '{}',
  in_reply_to uuid REFERENCES mails(id) ON DELETE SET NULL,
  thread_id uuid,
  sent_at timestamptz,
  received_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mails_copro ON mails(copro_id);
CREATE INDEX idx_mails_owner ON mails(owner_id);
CREATE INDEX idx_mails_status ON mails(status);
CREATE INDEX idx_mails_thread ON mails(thread_id);
CREATE INDEX idx_mails_folder ON mails(folder_id);
CREATE INDEX idx_mails_created ON mails(created_at DESC);

-- ============================================================
-- MODULE MESSAGERIE
-- ============================================================

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id uuid NOT NULL REFERENCES coproprietes(id) ON DELETE CASCADE,
  title text,
  type text NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  created_by uuid NOT NULL,
  last_message_at timestamptz,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_copro ON conversations(copro_id);
CREATE INDEX idx_conversations_last_msg ON conversations(last_message_at DESC);

CREATE TABLE IF NOT EXISTS conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  user_role text NOT NULL DEFAULT 'copro' CHECK (user_role IN ('copro', 'syndic', 'prestataire', 'conseil')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz NOT NULL DEFAULT now(),
  is_muted boolean NOT NULL DEFAULT false,
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_conv_members_user ON conversation_members(user_id);
CREATE INDEX idx_conv_members_conv ON conversation_members(conversation_id);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_name text NOT NULL,
  content text NOT NULL,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  attachments jsonb DEFAULT '[]',
  reply_to_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  is_edited boolean NOT NULL DEFAULT false,
  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conv ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at);

-- ============================================================
-- MODULE MUR COMMUNAUTAIRE
-- ============================================================

CREATE TABLE IF NOT EXISTS wall_posts_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id uuid NOT NULL REFERENCES coproprietes(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  author_name text NOT NULL,
  author_role text NOT NULL DEFAULT 'copro' CHECK (author_role IN ('syndic', 'copro', 'conseil')),
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'information' CHECK (category IN ('information', 'urgent', 'question', 'evenement', 'autre')),
  attachments jsonb DEFAULT '[]',
  is_pinned boolean NOT NULL DEFAULT false,
  is_locked boolean NOT NULL DEFAULT false,
  tags text[] DEFAULT '{}',
  likes_count int NOT NULL DEFAULT 0,
  comments_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wall_posts_v2_copro ON wall_posts_v2(copro_id);
CREATE INDEX idx_wall_posts_v2_created ON wall_posts_v2(created_at DESC);
CREATE INDEX idx_wall_posts_v2_pinned ON wall_posts_v2(is_pinned) WHERE is_pinned = true;

CREATE TABLE IF NOT EXISTS wall_comments_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES wall_posts_v2(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  author_name text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wall_comments_v2_post ON wall_comments_v2(post_id);

CREATE TABLE IF NOT EXISTS wall_likes_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES wall_posts_v2(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);
```

- [ ] **Step 2: Créer les types domain Mail**

```typescript
// src/features/communication/mail/domain/types.ts

export type MailStatus = 'draft' | 'sent' | 'received';
export type SystemFolderType = 'inbox' | 'sent' | 'drafts' | 'archive' | 'trash' | 'spam';

export interface MailParticipant {
  email: string;
  name: string;
}

export interface MailAttachment {
  name: string;
  size: number;
  url: string;
  type: string;
}

export interface Mail {
  id: string;
  coproId: string;
  ownerId: string;
  fromEmail: string;
  fromName: string;
  toEmails: MailParticipant[];
  ccEmails: MailParticipant[];
  subject: string;
  body: string;
  bodyHtml: string | null;
  attachments: MailAttachment[];
  status: MailStatus;
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  folderId: string | null;
  labelIds: string[];
  inReplyTo: string | null;
  threadId: string | null;
  sentAt: string | null;
  receivedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MailLabel {
  id: string;
  coproId: string;
  ownerId: string;
  name: string;
  color: string;
  sortOrder: number;
}

export interface MailFolder {
  id: string;
  coproId: string;
  ownerId: string;
  name: string;
  isSystem: boolean;
  systemType: SystemFolderType | null;
  sortOrder: number;
}

export interface DraftData {
  id?: string;
  toEmails: MailParticipant[];
  ccEmails: MailParticipant[];
  subject: string;
  body: string;
  attachments: MailAttachment[];
  inReplyTo?: string;
}
```

- [ ] **Step 3: Créer les constantes Mail**

```typescript
// src/features/communication/mail/domain/constants.ts

import type { SystemFolderType } from './types';

export const SYSTEM_FOLDERS: { type: SystemFolderType; name: string; icon: string }[] = [
  { type: 'inbox', name: 'Boîte de réception', icon: '📥' },
  { type: 'sent', name: 'Envoyés', icon: '📤' },
  { type: 'drafts', name: 'Brouillons', icon: '📝' },
  { type: 'archive', name: 'Archives', icon: '📁' },
  { type: 'trash', name: 'Corbeille', icon: '🗑️' },
  { type: 'spam', name: 'Spam', icon: '⚠️' },
];

export const DEFAULT_LABELS = [
  { name: 'AG / Convocations', color: '#a78bfa' },
  { name: 'Finance', color: '#4ade80' },
  { name: 'Maintenance', color: '#fbbf24' },
  { name: 'Relances', color: '#f87171' },
  { name: 'Sinistres', color: '#38bdf8' },
];

export const CORBEILLE_JOURS = 30;
```

- [ ] **Step 4: Vérifier la compilation TypeScript**

Run: `npx tsc --noEmit 2>&1 | grep "communication/mail"`
Expected: Aucune erreur

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260330_communication_refonte.sql src/features/communication/mail/domain/
git commit -m "feat(communication): add SQL migration + mail domain types"
```

---

## Task 2: Types domain (Messagerie + Mur)

**Files:**
- Create: `src/features/communication/messagerie/domain/types.ts`
- Create: `src/features/communication/messagerie/domain/constants.ts`
- Create: `src/features/communication/mur/domain/types.ts`
- Create: `src/features/communication/mur/domain/constants.ts`

- [ ] **Step 1: Types Messagerie**

```typescript
// src/features/communication/messagerie/domain/types.ts

export type ConversationType = 'direct' | 'group';
export type UserRole = 'copro' | 'syndic' | 'prestataire' | 'conseil';
export type MessageType = 'text' | 'image' | 'file' | 'system';
export type ConversationFilter = 'all' | 'unread' | 'archived';

export interface MessageAttachment {
  name: string;
  size: number;
  url: string;
  type: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  messageType: MessageType;
  attachments: MessageAttachment[];
  replyToId: string | null;
  isEdited: boolean;
  editedAt: string | null;
  createdAt: string;
}

export interface ConversationMember {
  id: string;
  conversationId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  joinedAt: string;
  lastReadAt: string;
  isMuted: boolean;
}

export interface Conversation {
  id: string;
  coproId: string;
  title: string | null;
  type: ConversationType;
  createdBy: string;
  lastMessageAt: string | null;
  isArchived: boolean;
  createdAt: string;
  members: ConversationMember[];
  messages: Message[];
}

export interface ConversationPreview {
  id: string;
  title: string | null;
  type: ConversationType;
  lastMessageAt: string | null;
  lastMessageContent: string | null;
  lastMessageSender: string | null;
  unreadCount: number;
  isArchived: boolean;
  members: Pick<ConversationMember, 'userId' | 'userName' | 'userRole'>[];
  coproName?: string;
  lotInfo?: string;
  tag?: string;
}

export interface NewConversationData {
  members: { userId: string; userName: string; userRole: UserRole }[];
  title?: string;
  firstMessage: string;
}
```

- [ ] **Step 2: Constantes Messagerie**

```typescript
// src/features/communication/messagerie/domain/constants.ts

import type { UserRole } from './types';

export const ROLE_COLORS: Record<UserRole, string> = {
  copro: '#60a5fa',
  syndic: '#4ade80',
  prestataire: '#94a3b8',
  conseil: '#a78bfa',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  copro: 'Copropriétaire',
  syndic: 'Syndic',
  prestataire: 'Prestataire',
  conseil: 'Conseil Syndical',
};
```

- [ ] **Step 3: Types Mur**

```typescript
// src/features/communication/mur/domain/types.ts

export type PostCategory = 'information' | 'urgent' | 'question' | 'evenement' | 'autre';
export type AuthorRole = 'syndic' | 'copro' | 'conseil';

export interface PostAttachment {
  name: string;
  size: number;
  url: string;
  type: string;
}

export interface WallPost {
  id: string;
  coproId: string;
  authorId: string;
  authorName: string;
  authorRole: AuthorRole;
  title: string;
  content: string;
  category: PostCategory;
  attachments: PostAttachment[];
  isPinned: boolean;
  isLocked: boolean;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  isLikedByMe: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WallComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface NewPostData {
  title: string;
  content: string;
  category: PostCategory;
  attachments: PostAttachment[];
  isPinned: boolean;
  tags: string[];
}
```

- [ ] **Step 4: Constantes Mur**

```typescript
// src/features/communication/mur/domain/constants.ts

import type { PostCategory } from './types';

export const CATEGORY_CONFIG: Record<PostCategory, { label: string; color: string; icon: string }> = {
  information: { label: 'Information', color: '#60a5fa', icon: 'ℹ️' },
  urgent: { label: 'Urgent', color: '#f87171', icon: '🚨' },
  question: { label: 'Question', color: '#fbbf24', icon: '❓' },
  evenement: { label: 'Événement', color: '#a78bfa', icon: '📅' },
  autre: { label: 'Autre', color: '#94a3b8', icon: '📌' },
};

export const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  syndic: { label: 'Syndic', color: '#4ade80' },
  copro: { label: 'Copropriétaire', color: '#60a5fa' },
  conseil: { label: 'Conseil Syndical', color: '#a78bfa' },
};
```

- [ ] **Step 5: Commit**

```bash
git add src/features/communication/messagerie/domain/ src/features/communication/mur/domain/
git commit -m "feat(communication): add messagerie + mur domain types"
```

---

## Task 3: Mock data (les 3 modules)

**Files:**
- Create: `src/features/communication/mail/domain/mock-data.ts`
- Create: `src/features/communication/messagerie/domain/mock-data.ts`
- Create: `src/features/communication/mur/domain/mock-data.ts`

- [ ] **Step 1: Mock data Mail** — 8 mails (3 non-lus reçus, 2 envoyés, 2 brouillons, 1 archivé), 5 labels par défaut, dossiers système. Données réalistes copro (convocation AG, fuite, relance impayé, devis prestataire, etc.)

- [ ] **Step 2: Mock data Messagerie** — 5 conversations (3 directes + 1 groupe conseil syndical + 1 prestataire), 3-5 messages par conversation, 2 conversations avec messages non-lus.

- [ ] **Step 3: Mock data Mur** — 6 publications (2 épinglées dont 1 urgente, 4 normales), 3-5 commentaires sur les posts les plus actifs, quelques likes.

- [ ] **Step 4: Commit**

```bash
git add src/features/communication/*/domain/mock-data.ts
git commit -m "feat(communication): add mock data for all 3 modules"
```

---

## Task 4: Hook useMailbox

**Files:**
- Create: `src/features/communication/mail/hooks/useMailbox.ts`
- Create: `src/features/communication/mail/hooks/index.ts`

- [ ] **Step 1: Implémenter useMailbox**

Le hook gère tout l'état du module mail :
- Liste des mails filtrée par dossier courant + recherche
- Mail sélectionné pour le panneau de lecture
- Dossiers et labels
- Actions : selectMail, setFolder, setSearchTerm, sendMail, saveDraft, deleteMail, archiveMail, toggleStar, toggleRead, addLabel, moveToFolder, createLabel, createFolder
- Calcul unreadCount
- Pour l'instant : state local initialisé depuis mock-data. Les mutations modifient le state en mémoire.

- [ ] **Step 2: Export index**

```typescript
// src/features/communication/mail/hooks/index.ts
export { useMailbox } from './useMailbox';
```

- [ ] **Step 3: Vérifier compilation**

Run: `npx tsc --noEmit 2>&1 | grep "communication/mail"`

- [ ] **Step 4: Commit**

```bash
git add src/features/communication/mail/hooks/
git commit -m "feat(communication/mail): add useMailbox hook"
```

---

## Task 5: Composants Mail (MailSidebar + MailList)

**Files:**
- Create: `src/features/communication/mail/components/MailSidebar.tsx`
- Create: `src/features/communication/mail/components/MailSidebar.module.css`
- Create: `src/features/communication/mail/components/MailList.tsx`
- Create: `src/features/communication/mail/components/MailList.module.css`
- Create: `src/features/communication/mail/components/index.ts`

- [ ] **Step 1: MailSidebar** — Bouton compose, dossiers système avec badge count, labels avec pastille couleur, dossiers perso, compteur stockage. Props reçues du hook (folders, labels, currentFolder, unreadCount, onFolderChange, onCompose).

- [ ] **Step 2: MailSidebar.module.css** — Dark theme CoProFlex (backgrounds #131620, items hover, item active bleu, badges, label dots).

- [ ] **Step 3: MailList** — Barre de recherche, toolbar checkbox/tri, liste scrollable de mails. Chaque item : checkbox, star, avatar initiales, expéditeur, objet, preview, date, PJ. Props du hook (mails, selectedMailId, searchTerm, onSelectMail, onSearchChange, onToggleStar).

- [ ] **Step 4: MailList.module.css** — Items avec unread border-left bleu, hover state, selected state, avatars colorés, ellipsis sur preview.

- [ ] **Step 5: Index**

```typescript
// src/features/communication/mail/components/index.ts
export { MailSidebar } from './MailSidebar';
export { MailList } from './MailList';
```

- [ ] **Step 6: Commit**

```bash
git add src/features/communication/mail/components/
git commit -m "feat(communication/mail): add MailSidebar + MailList components"
```

---

## Task 6: Composants Mail (MailReader + ComposeModal)

**Files:**
- Create: `src/features/communication/mail/components/MailReader.tsx`
- Create: `src/features/communication/mail/components/MailReader.module.css`
- Create: `src/features/communication/mail/components/ComposeModal.tsx`
- Create: `src/features/communication/mail/components/ComposeModal.module.css`
- Modify: `src/features/communication/mail/components/index.ts`

- [ ] **Step 1: MailReader** — En-tête (objet, expéditeur avatar+nom+email, date), actions (répondre, transférer, archiver, label, supprimer), corps du message (max-width 680px), PJ en cards, boutons réponse en bas. Props : mail sélectionné, handlers. État vide si pas de mail sélectionné.

- [ ] **Step 2: MailReader.module.css** — Corps fond #1a1d2e radius 12px, PJ cards hover, actions buttons ghost, max-width lecture.

- [ ] **Step 3: ComposeModal** — Modale positionnée bas-droite (position fixed), champs À/CC/Objet/Corps, toolbar formatage, bouton PJ, bouton Envoyer. État local pour les champs. Props : isOpen, onClose, onSend, onSaveDraft, replyTo (pré-remplir si réponse).

- [ ] **Step 4: ComposeModal.module.css** — Position fixed bottom-right, width 480px, shadow modal, header draggable look, champs inputs dark theme.

- [ ] **Step 5: Mettre à jour index**

Ajouter exports MailReader et ComposeModal.

- [ ] **Step 6: Commit**

```bash
git add src/features/communication/mail/components/
git commit -m "feat(communication/mail): add MailReader + ComposeModal components"
```

---

## Task 7: Page Mail + Route

**Files:**
- Create: `src/app/(dashboard)/communication/mail/page.tsx`
- Create: `src/app/(dashboard)/communication/mail/mail.module.css`

- [ ] **Step 1: Page Mail** — Layout 3 colonnes (grid 220px 340px 1fr). Utilise useMailbox, passe les props aux 3 composants (MailSidebar, MailList, MailReader). Gère l'ouverture de ComposeModal via state isComposeOpen.

- [ ] **Step 2: CSS Module** — Grid layout, height 100%, overflow hidden sur chaque colonne.

- [ ] **Step 3: Vérifier dans le navigateur** — `http://localhost:3000/communication/mail`

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/communication/mail/
git commit -m "feat(communication/mail): add mail page with 3-column layout"
```

---

## Task 8: Hook useMessagerie + Composants Messagerie

**Files:**
- Create: `src/features/communication/messagerie/hooks/useMessagerie.ts`
- Create: `src/features/communication/messagerie/hooks/index.ts`
- Create: `src/features/communication/messagerie/components/ConversationList.tsx`
- Create: `src/features/communication/messagerie/components/ConversationList.module.css`
- Create: `src/features/communication/messagerie/components/ChatPanel.tsx`
- Create: `src/features/communication/messagerie/components/ChatPanel.module.css`
- Create: `src/features/communication/messagerie/components/index.ts`

- [ ] **Step 1: useMessagerie** — State : conversations (preview list), activeConversation, messages, searchTerm, filter, isLoading, totalUnread. Actions : selectConversation, setSearchTerm, setFilter, sendMessage, markAsRead, archiveConversation. Initialisé depuis mock-data.

- [ ] **Step 2: ConversationList** — Recherche, onglets (Toutes/Non lues/Archivées), liste scrollable. Chaque item : avatar initiales, nom, preview dernier msg, heure, badge non-lu, copro+lot, tag catégorie. Active state.

- [ ] **Step 3: ConversationList.module.css** — Sidebar style #131620, items hover, unread border-left, badge bleu, active state.

- [ ] **Step 4: ChatPanel** — Header (avatar+nom+copro+actions), zone messages scroll (bulles gauche/droite), messages système centrés, zone réponse (outils PJ/emoji, textarea, bouton envoyer). Auto-scroll en bas quand nouveau message.

- [ ] **Step 5: ChatPanel.module.css** — Bulles : them=#1a1d2e, me=rgba(59,130,246,0.1), system centré gris. Reply area fond #131620.

- [ ] **Step 6: Index exports**

- [ ] **Step 7: Commit**

```bash
git add src/features/communication/messagerie/
git commit -m "feat(communication/messagerie): add hook + components"
```

---

## Task 9: Page Messagerie + Route

**Files:**
- Create: `src/app/(dashboard)/communication/messagerie/page.tsx`
- Create: `src/app/(dashboard)/communication/messagerie/messagerie.module.css`

- [ ] **Step 1: Page** — Layout 2 colonnes (grid 320px 1fr). Utilise useMessagerie, connecte ConversationList et ChatPanel.

- [ ] **Step 2: CSS Module**

- [ ] **Step 3: Vérifier dans le navigateur** — `http://localhost:3000/communication/messagerie`

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/communication/messagerie/
git commit -m "feat(communication/messagerie): add messagerie page"
```

---

## Task 10: Hook useMur + Composants Mur

**Files:**
- Create: `src/features/communication/mur/hooks/useMur.ts`
- Create: `src/features/communication/mur/hooks/index.ts`
- Create: `src/features/communication/mur/components/MurSidebar.tsx`
- Create: `src/features/communication/mur/components/MurSidebar.module.css`
- Create: `src/features/communication/mur/components/PostCard.tsx`
- Create: `src/features/communication/mur/components/PostCard.module.css`
- Create: `src/features/communication/mur/components/PostFeed.tsx`
- Create: `src/features/communication/mur/components/PostFeed.module.css`
- Create: `src/features/communication/mur/components/PostEditor.tsx`
- Create: `src/features/communication/mur/components/PostEditor.module.css`
- Create: `src/features/communication/mur/components/PostComments.tsx`
- Create: `src/features/communication/mur/components/PostComments.module.css`
- Create: `src/features/communication/mur/components/index.ts`

- [ ] **Step 1: useMur** — State : posts, pinnedPosts, selectedPost, comments, categoryFilter, searchTerm, isLoading. Actions : selectPost, setCategoryFilter, setSearchTerm, createPost, deletePost, toggleLike, togglePin, addComment. Initialisé depuis mock-data.

- [ ] **Step 2: MurSidebar** — Catégories avec count (filtres cliquables), tags populaires, filtre "Mes publications", filtre "Épinglés".

- [ ] **Step 3: PostCard** — Header (avatar+auteur+rôle badge+date+catégorie), titre, contenu tronqué, PJ, footer (likes+comments+actions). Épinglé = bordure dorée.

- [ ] **Step 4: PostFeed** — Bouton "+ Nouvelle publication", section épinglés, liste de PostCard, gère le expand/collapse pour les commentaires.

- [ ] **Step 5: PostEditor** — Modale : titre, contenu textarea, catégorie dropdown, PJ upload, toggle épingler, boutons Annuler/Publier.

- [ ] **Step 6: PostComments** — Liste chronologique sous un post (inline), avatar+nom+texte+date, zone réponse.

- [ ] **Step 7: CSS Modules** — Tous les fichiers .module.css avec le dark theme CoProFlex.

- [ ] **Step 8: Commit**

```bash
git add src/features/communication/mur/
git commit -m "feat(communication/mur): add hook + components"
```

---

## Task 11: Page Mur + Route

**Files:**
- Create: `src/app/(dashboard)/communication/mur/page.tsx`
- Create: `src/app/(dashboard)/communication/mur/mur.module.css`

- [ ] **Step 1: Page** — Layout 2 colonnes (grid 200px 1fr), feed centré max-width 720px. Utilise useMur, connecte MurSidebar et PostFeed. Gère l'ouverture de PostEditor via state.

- [ ] **Step 2: CSS Module**

- [ ] **Step 3: Vérifier dans le navigateur** — `http://localhost:3000/communication/mur`

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/communication/mur/
git commit -m "feat(communication/mur): add mur page"
```

---

## Task 12: Hub Communication (page d'accueil)

**Files:**
- Modify: `src/app/(dashboard)/communication/page.tsx`
- Create: `src/app/(dashboard)/communication/communication-hub.module.css`

- [ ] **Step 1: Refondre la page hub** — KPI strip (3 cards : mails non-lus, messages non-lus, publications récentes). 3 cards modules (Mail, Messagerie, Mur) avec icône, count, derniers items, bouton "Ouvrir". Utilise les 3 hooks pour les counts.

- [ ] **Step 2: CSS Module** — KPI strip grid 3 colonnes, cards modules grid 3 colonnes, dark theme.

- [ ] **Step 3: Vérifier** — `http://localhost:3000/communication`

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/communication/page.tsx src/app/(dashboard)/communication/communication-hub.module.css
git commit -m "feat(communication): refonte hub page with KPIs + module cards"
```

---

## Task 13: Mise à jour Sidebar navigation

**Files:**
- Modify: fichier sidebar/navigation qui contient les liens communication

- [ ] **Step 1: Identifier le fichier de navigation** — Grep pour les liens `/communication/` dans la sidebar.

- [ ] **Step 2: Mettre à jour les sous-liens** — Remplacer les anciens (mail, messagerie-privee, mur, evenements, forum, recherche) par les nouveaux (mail, messagerie, mur). 3 items seulement.

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(nav): update communication sidebar links"
```

---

## Task 14: Suppression ancien code

**Files à supprimer :**
- `src/features/communication/hooks/useMailPage.ts`
- `src/features/communication/hooks/useMailListPage.ts`
- `src/features/communication/hooks/useConversationsPage.ts`
- `src/features/communication/hooks/useConversationDetailPage.ts`
- `src/features/communication/hooks/useForumPage.ts`
- `src/features/communication/hooks/useForumDetailPage.ts`
- `src/features/communication/hooks/useWallPage.ts`
- `src/features/communication/hooks/useWallDetailPage.ts`
- `src/features/communication/hooks/useWallEditorPage.ts`
- `src/features/communication/mail-detail/`
- `src/features/communication/recherche/`
- `src/components/features/communication/`
- `src/lib/services/mail.service.ts`
- `src/lib/services/mail-supabase.service.ts`
- `src/app/(dashboard)/communication/mail/[id]/`
- `src/app/(dashboard)/communication/mail/nouveau/`
- `src/app/(dashboard)/communication/messagerie-privee/`
- `src/app/(dashboard)/communication/recherche/`
- `src/app/(dashboard)/social/messages/`

- [ ] **Step 1: Supprimer les fichiers** — Supprimer tous les fichiers listés ci-dessus.

- [ ] **Step 2: Mettre à jour les imports** — Grep pour les imports cassés et les corriger. Vérifier `src/features/communication/hooks/index.ts` et `src/features/communication/index.ts`.

- [ ] **Step 3: Vérifier la compilation** — `npx tsc --noEmit` ne doit pas avoir de nouvelles erreurs liées à communication.

- [ ] **Step 4: Vérifier le build** — `npm run build` passe sans erreur sur les pages communication.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(communication): remove legacy code (old hooks, services, routes)"
```

---

## Task 15: Vérification finale

- [ ] **Step 1: Navigation complète** — Tester dans le navigateur :
  - `/communication` → Hub avec KPIs
  - `/communication/mail` → Boîte mail 3 colonnes
  - `/communication/messagerie` → Chat 2 colonnes
  - `/communication/mur` → Fil de publications

- [ ] **Step 2: TypeScript clean** — `npx tsc --noEmit` sans erreurs communication

- [ ] **Step 3: Commit final**

```bash
git commit -m "feat(communication): complete refonte — mail + messagerie + mur"
```
