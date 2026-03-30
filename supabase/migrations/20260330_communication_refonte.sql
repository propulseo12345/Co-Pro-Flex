-- ============================================================================
-- MIGRATION: Refonte module Communication
-- 3 sous-modules : Mail, Messagerie (Chat), Mur (Wall)
-- ============================================================================

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE mail_status AS ENUM ('unread', 'read', 'archived', 'trash');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE mail_folder_type AS ENUM ('inbox', 'sent', 'drafts', 'archive', 'trash', 'spam');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE conversation_type AS ENUM ('direct', 'group', 'prestataire');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('syndic', 'copro', 'conseil', 'prestataire', 'gardien');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE message_type AS ENUM ('text', 'image', 'file', 'system');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE post_category AS ENUM ('information', 'urgent', 'question', 'evenement', 'sondage');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE author_role AS ENUM ('syndic', 'copro', 'conseil', 'prestataire', 'gardien');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 2. MAIL — Dossiers
-- ============================================================================

CREATE TABLE IF NOT EXISTS mail_folders_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copropriete_id UUID NOT NULL REFERENCES coproprietes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  folder_type mail_folder_type NOT NULL,
  icon TEXT,
  is_system BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mail_folders_v2_user
  ON mail_folders_v2 (user_id, copropriete_id);

-- ============================================================================
-- 3. MAIL — Labels
-- ============================================================================

CREATE TABLE IF NOT EXISTS mail_labels_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copropriete_id UUID NOT NULL REFERENCES coproprietes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mail_labels_v2_copro
  ON mail_labels_v2 (copropriete_id);

-- ============================================================================
-- 4. MAIL — Mails
-- ============================================================================

CREATE TABLE IF NOT EXISTS mails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copropriete_id UUID NOT NULL REFERENCES coproprietes(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES mail_folders_v2(id) ON DELETE SET NULL,
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  to_names TEXT[] NOT NULL DEFAULT '{}',
  to_emails TEXT[] NOT NULL DEFAULT '{}',
  cc_names TEXT[] DEFAULT '{}',
  cc_emails TEXT[] DEFAULT '{}',
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  status mail_status NOT NULL DEFAULT 'unread',
  is_starred BOOLEAN NOT NULL DEFAULT false,
  is_draft BOOLEAN NOT NULL DEFAULT false,
  has_attachments BOOLEAN NOT NULL DEFAULT false,
  attachments JSONB DEFAULT '[]',
  label_ids UUID[] DEFAULT '{}',
  reply_to_id UUID REFERENCES mails(id) ON DELETE SET NULL,
  thread_id UUID,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mails_copro_folder
  ON mails (copropriete_id, folder_id);

CREATE INDEX IF NOT EXISTS idx_mails_status
  ON mails (copropriete_id, status);

CREATE INDEX IF NOT EXISTS idx_mails_thread
  ON mails (thread_id) WHERE thread_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mails_sent_at
  ON mails (copropriete_id, sent_at DESC);

-- ============================================================================
-- 5. MESSAGERIE — Conversations
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copropriete_id UUID NOT NULL REFERENCES coproprietes(id) ON DELETE CASCADE,
  type conversation_type NOT NULL DEFAULT 'direct',
  title TEXT,
  avatar TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  is_muted BOOLEAN NOT NULL DEFAULT false,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_copro
  ON conversations (copropriete_id, is_archived);

CREATE INDEX IF NOT EXISTS idx_conversations_last_msg
  ON conversations (copropriete_id, last_message_at DESC);

-- ============================================================================
-- 6. MESSAGERIE — Membres de conversation
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  user_role user_role NOT NULL DEFAULT 'copro',
  is_admin BOOLEAN NOT NULL DEFAULT false,
  last_read_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_members_user
  ON conversation_members (user_id);

CREATE INDEX IF NOT EXISTS idx_conv_members_conv
  ON conversation_members (conversation_id);

-- ============================================================================
-- 7. MESSAGERIE — Messages
-- ============================================================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role user_role NOT NULL DEFAULT 'copro',
  type message_type NOT NULL DEFAULT 'text',
  content TEXT NOT NULL DEFAULT '',
  attachments JSONB DEFAULT '[]',
  is_edited BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conv
  ON messages (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender
  ON messages (sender_id);

-- ============================================================================
-- 8. MUR — Publications
-- ============================================================================

CREATE TABLE IF NOT EXISTS wall_posts_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copropriete_id UUID NOT NULL REFERENCES coproprietes(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  author_name TEXT NOT NULL,
  author_role author_role NOT NULL DEFAULT 'copro',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category post_category NOT NULL DEFAULT 'information',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  attachments JSONB DEFAULT '[]',
  likes_count INT NOT NULL DEFAULT 0,
  comments_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wall_posts_v2_copro
  ON wall_posts_v2 (copropriete_id, is_pinned DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wall_posts_v2_category
  ON wall_posts_v2 (copropriete_id, category);

-- ============================================================================
-- 9. MUR — Commentaires
-- ============================================================================

CREATE TABLE IF NOT EXISTS wall_comments_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES wall_posts_v2(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  author_name TEXT NOT NULL,
  author_role author_role NOT NULL DEFAULT 'copro',
  content TEXT NOT NULL,
  parent_id UUID REFERENCES wall_comments_v2(id) ON DELETE CASCADE,
  likes_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wall_comments_v2_post
  ON wall_comments_v2 (post_id, created_at ASC);

-- ============================================================================
-- 10. MUR — Likes
-- ============================================================================

CREATE TABLE IF NOT EXISTS wall_likes_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  post_id UUID REFERENCES wall_posts_v2(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES wall_comments_v2(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wall_likes_v2_target_check CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  ),
  UNIQUE (user_id, post_id),
  UNIQUE (user_id, comment_id)
);

CREATE INDEX IF NOT EXISTS idx_wall_likes_v2_post
  ON wall_likes_v2 (post_id) WHERE post_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wall_likes_v2_comment
  ON wall_likes_v2 (comment_id) WHERE comment_id IS NOT NULL;

-- ============================================================================
-- 11. UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at_mail_folders_v2
    BEFORE UPDATE ON mail_folders_v2
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at_mails
    BEFORE UPDATE ON mails
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at_conversations
    BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at_messages
    BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at_wall_posts_v2
    BEFORE UPDATE ON wall_posts_v2
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at_wall_comments_v2
    BEFORE UPDATE ON wall_comments_v2
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- FIN DE MIGRATION
-- ============================================================================
