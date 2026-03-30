# Refonte Communication — Design Spec

**Date :** 2026-03-30
**Branche :** v2
**Périmètre :** Mail + Messagerie + Mur communautaire (sans événements)

---

## Résumé

Refonte complète du module Communication. 3 sous-modules indépendants avec nouveau schéma Supabase, nouveaux composants, design dark theme CoProFlex. L'ancien schéma (campagnes mail, forum) est abandonné.

---

## 1. Architecture

### Routes

```
/communication
├── page.tsx              → Hub (KPIs + navigation vers les 3 modules)
├── mail/
│   └── page.tsx          → Boîte mail Proton-like (3 colonnes)
├── messagerie/
│   └── page.tsx          → Chat WhatsApp-like (2 colonnes)
└── mur/
    └── page.tsx          → Fil de publications
```

Pas de sous-routes `nouveau/` ou `[id]/`. Tout se fait inline (modale compose, panneau chat, éditeur inline).

### Features

```
src/features/communication/
├── mail/
│   ├── components/
│   │   ├── MailSidebar.tsx
│   │   ├── MailSidebar.module.css
│   │   ├── MailList.tsx
│   │   ├── MailList.module.css
│   │   ├── MailReader.tsx
│   │   ├── MailReader.module.css
│   │   ├── ComposeModal.tsx
│   │   ├── ComposeModal.module.css
│   │   └── index.ts
│   ├── hooks/
│   │   └── useMailbox.ts
│   └── domain/
│       ├── types.ts
│       └── constants.ts
├── messagerie/
│   ├── components/
│   │   ├── ConversationList.tsx
│   │   ├── ConversationList.module.css
│   │   ├── ChatPanel.tsx
│   │   ├── ChatPanel.module.css
│   │   └── index.ts
│   ├── hooks/
│   │   └── useMessagerie.ts
│   └── domain/
│       ├── types.ts
│       └── constants.ts
└── mur/
    ├── components/
    │   ├── PostFeed.tsx
    │   ├── PostFeed.module.css
    │   ├── PostCard.tsx
    │   ├── PostCard.module.css
    │   ├── PostEditor.tsx
    │   ├── PostEditor.module.css
    │   ├── PostComments.tsx
    │   ├── PostComments.module.css
    │   ├── MurSidebar.tsx
    │   ├── MurSidebar.module.css
    │   └── index.ts
    ├── hooks/
    │   └── useMur.ts
    └── domain/
        ├── types.ts
        └── constants.ts
```

---

## 2. Module Mail — Boîte mail Proton-like

### Layout

3 colonnes : Sidebar (220px) | Liste (340px) | Lecture (reste)

### MailSidebar

- Bouton "Nouveau message" → ouvre ComposeModal
- Dossiers système : Réception (badge count), Favoris, Brouillons, Envoyés, Archives, Corbeille, Spam
- Labels personnalisés avec pastille couleur (AG, Finance, Maintenance, Relances, Sinistres)
- Dossiers personnalisés (créés par l'utilisateur)
- Bouton "+ Ajouter un label" / "+ Nouveau dossier"
- Compteur stockage en bas (email + copro)

### MailList

- Barre de recherche pleine largeur
- Toolbar : checkbox tout sélectionner, tri (Date ↓)
- Chaque item :
  - Checkbox sélection
  - Étoile toggle (favori)
  - Avatar initiales (couleur basée sur le nom)
  - Expéditeur (gras si non-lu)
  - Objet (gras si non-lu)
  - Preview 1 ligne (gris)
  - Date/heure (alignée droite)
  - Icône PJ si pièces jointes
- Mail non-lu : `border-left: 3px solid #3b82f6` + texte gras
- Mail sélectionné : `background: rgba(59,130,246,0.06)`

### MailReader

- En-tête : objet (20px/700), expéditeur (avatar + nom + email), date, destinataires
- Actions en haut : Répondre, Transférer, Archiver, Label, Déplacer, Supprimer
- Corps du message : `max-width: 680px`, `line-height: 1.8`, fond `#1a1d2e`, radius 12px
- Pièces jointes : cards avec icône type + nom + taille + bouton download
- Bas : boutons Répondre / Répondre à tous / Transférer

### ComposeModal

- Modale flottante coin inférieur droit (comme Gmail)
- Champs : À (autocomplete), CC/BCC (expandable), Objet, Corps
- Toolbar : gras, italique, liste, lien, PJ
- Sauvegarde auto en brouillon (debounce 3s)
- Bouton Envoyer (primary)

### Schéma Supabase

```sql
CREATE TABLE mails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id uuid NOT NULL REFERENCES coproprietes(id),
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
  folder_id uuid REFERENCES mail_folders(id) ON DELETE SET NULL,
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

CREATE TABLE mail_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id uuid NOT NULL REFERENCES coproprietes(id),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE mail_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id uuid NOT NULL REFERENCES coproprietes(id),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  system_type text CHECK (system_type IN ('inbox', 'sent', 'drafts', 'archive', 'trash', 'spam')),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Hook useMailbox

```typescript
interface UseMailboxReturn {
  // State
  mails: Mail[];
  selectedMail: Mail | null;
  currentFolder: string;        // 'inbox' | 'sent' | 'drafts' | ...
  labels: MailLabel[];
  folders: MailFolder[];
  searchTerm: string;
  isLoading: boolean;
  unreadCount: number;

  // Actions
  selectMail: (id: string) => void;
  setFolder: (folder: string) => void;
  setSearchTerm: (term: string) => void;
  sendMail: (draft: DraftData) => Promise<void>;
  saveDraft: (draft: DraftData) => Promise<void>;
  deleteMail: (id: string) => void;
  archiveMail: (id: string) => void;
  toggleStar: (id: string) => void;
  toggleRead: (id: string) => void;
  addLabel: (mailId: string, labelId: string) => void;
  moveToFolder: (mailId: string, folderId: string) => void;
  createLabel: (name: string, color: string) => Promise<void>;
  createFolder: (name: string) => Promise<void>;
}
```

---

## 3. Module Messagerie — Chat simple

### Layout

2 colonnes : ConversationList (320px) | ChatPanel (reste)

### ConversationList

- Recherche en haut
- Onglets : Toutes / Non lues / Archivées
- Chaque conversation :
  - Avatar initiales (couleur par rôle)
  - Nom + heure dernier message
  - Preview dernier message (1 ligne, gris)
  - Badge non-lu (cercle bleu + count)
  - Sous-info : copro + lot, tag catégorie
- Type groupe = icône groupe, liste des prénoms en preview
- Conversation active = `background: rgba(59,130,246,0.08)` + `border-left: 3px solid #3b82f6`

### ChatPanel

- Header : avatar + nom + copro/lot + boutons actions (Créer OS, Fiche copro, Archiver)
- Zone messages (scroll vertical) :
  - Bulles gauche (interlocuteur) : fond `#1a1d2e`, border `rgba(148,163,184,0.08)`
  - Bulles droite (moi) : fond `rgba(59,130,246,0.1)`, border `rgba(59,130,246,0.15)`
  - Chaque bulle : auteur (coloré par rôle), texte, heure, statut lecture
  - PJ inline : mini-cards avec icône + nom
  - Messages système centrés (gris) : "OS créé", "Conversation démarrée"
- Indicateur "X est en train d'écrire..." (bleu, italic)
- Zone réponse en bas : outils (PJ, emoji, templates), textarea auto-resize, bouton envoyer

### Schéma Supabase

```sql
CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id uuid NOT NULL REFERENCES coproprietes(id),
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

CREATE TABLE conversation_members (
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

CREATE TABLE messages (
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
```

### Hook useMessagerie

```typescript
interface UseMessagerieReturn {
  // State
  conversations: ConversationPreview[];
  activeConversation: Conversation | null;
  messages: Message[];
  searchTerm: string;
  filter: 'all' | 'unread' | 'archived';
  isLoading: boolean;
  totalUnread: number;

  // Actions
  selectConversation: (id: string) => void;
  setSearchTerm: (term: string) => void;
  setFilter: (f: 'all' | 'unread' | 'archived') => void;
  sendMessage: (content: string, attachments?: Attachment[]) => Promise<void>;
  markAsRead: (conversationId: string) => void;
  createConversation: (members: Member[], title?: string) => Promise<string>;
  archiveConversation: (id: string) => void;
}
```

---

## 4. Module Mur communautaire

### Layout

2 colonnes : MurSidebar (200px) | PostFeed (reste, max-width 720px centré)

### MurSidebar

- Catégories avec count : Information, Urgent, Question, Événement, Autre
- Tags populaires (cliquables pour filtrer)
- Filtre "Mes publications"
- Filtre "Épinglés"

### PostFeed

- Bouton "+ Nouvelle publication" en haut
- Section "Épinglés" (séparée, bordure dorée `#fbbf24`)
- Publications en cards :
  - Header : avatar + auteur + rôle badge (Syndic vert, Copro bleu, Conseil violet) + date + catégorie badge
  - Titre (16px/700)
  - Contenu (tronqué 3 lignes, "Lire la suite")
  - PJ si présentes
  - Footer : ❤️ count, 💬 count, actions (like, commenter)
- Clic sur une card → expand inline avec commentaires

### PostEditor (modale)

- Titre (input)
- Contenu (textarea)
- Catégorie (dropdown)
- PJ upload
- Toggle épingler (si rôle syndic)
- Boutons Annuler / Publier

### PostComments (inline sous le post)

- Liste chronologique
- Chaque commentaire : avatar + nom + texte + date
- Zone réponse en bas : textarea + bouton Commenter

### Schéma Supabase

```sql
CREATE TABLE wall_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id uuid NOT NULL REFERENCES coproprietes(id),
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

CREATE INDEX idx_wall_posts_copro ON wall_posts(copro_id);
CREATE INDEX idx_wall_posts_created ON wall_posts(created_at DESC);
CREATE INDEX idx_wall_posts_pinned ON wall_posts(is_pinned) WHERE is_pinned = true;

CREATE TABLE wall_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES wall_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  author_name text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wall_comments_post ON wall_comments(post_id);

CREATE TABLE wall_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES wall_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);
```

### Hook useMur

```typescript
interface UseMurReturn {
  // State
  posts: WallPost[];
  pinnedPosts: WallPost[];
  selectedPost: WallPost | null;
  comments: WallComment[];
  categoryFilter: string | null;
  searchTerm: string;
  isLoading: boolean;

  // Actions
  selectPost: (id: string) => void;
  setCategoryFilter: (cat: string | null) => void;
  setSearchTerm: (term: string) => void;
  createPost: (data: PostData) => Promise<void>;
  deletePost: (id: string) => void;
  toggleLike: (postId: string) => void;
  togglePin: (postId: string) => void;
  addComment: (postId: string, content: string) => Promise<void>;
}
```

---

## 5. Hub Communication

Page `/communication` — dashboard de navigation.

### KPI strip (3 colonnes)
- Mails non lus (count, couleur bleue)
- Messages non lus (count, couleur bleue)
- Publications récentes (count 7j)

### Cards modules (3 colonnes)
- Mail : icône, count non-lus, 2 derniers sujets, bouton "Ouvrir"
- Messagerie : icône, count conversations actives, dernière conversation, bouton "Ouvrir"
- Mur : icône, count publications semaine, dernier post épinglé, bouton "Voir"

---

## 6. Ancien code à supprimer

Les fichiers suivants seront supprimés ou remplacés :

- `src/features/communication/hooks/useMailPage.ts` → remplacé par `mail/hooks/useMailbox.ts`
- `src/features/communication/hooks/useMailListPage.ts` → supprimé
- `src/features/communication/hooks/useConversationsPage.ts` → remplacé par `messagerie/hooks/useMessagerie.ts`
- `src/features/communication/hooks/useConversationDetailPage.ts` → supprimé
- `src/features/communication/hooks/useForumPage.ts` → supprimé
- `src/features/communication/hooks/useForumDetailPage.ts` → supprimé
- `src/features/communication/hooks/useWallPage.ts` → remplacé par `mur/hooks/useMur.ts`
- `src/features/communication/hooks/useWallDetailPage.ts` → supprimé
- `src/features/communication/hooks/useWallEditorPage.ts` → supprimé
- `src/features/communication/mail-detail/` → supprimé (lecture inline dans MailReader)
- `src/components/features/communication/` → supprimé (remplacé par features/communication/*)
- `src/lib/services/mail.service.ts` → supprimé (localStorage)
- `src/lib/services/mail-supabase.service.ts` → supprimé (ancien schéma campagnes)
- `src/app/(dashboard)/communication/mail/[id]/` → supprimé (lecture inline)
- `src/app/(dashboard)/communication/mail/nouveau/` → supprimé (modale compose)
- `src/app/(dashboard)/communication/messagerie-privee/` → supprimé (remplacé par /messagerie)
- `src/app/(dashboard)/social/messages/` → supprimé (remplacé par /communication/messagerie)

---

## 7. Ce qui est hors périmètre

- Événements (module séparé, phase ultérieure)
- Envoi de masse / campagnes (ancien schéma abandonné)
- Connexion email réelle (SMTP/IMAP) — les mails restent internes à la plateforme
- Notifications push / temps réel (Supabase Realtime pourra être ajouté plus tard)
- Forum (supprimé, remplacé par le Mur)

---

## 8. Dépendances

- Supabase : tables `coproprietes`, auth users
- CoproContext : `currentCoproId` pour filtrer les données
- Design system CoProFlex : variables CSS, dark theme, patterns existants
