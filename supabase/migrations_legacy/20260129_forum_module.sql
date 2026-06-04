-- ============================================================================
-- MODULE FORUM - Tables et vues
-- CoProFlex - Communication/Social
-- Date: 2026-01-29
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE forum_topic_status AS ENUM ('open', 'closed', 'archived');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE forum_category AS ENUM ('general', 'travaux', 'voisinage', 'juridique', 'autre');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- TABLE: FORUM_TOPICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS forum_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,

  -- Contenu
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category forum_category NOT NULL DEFAULT 'general',

  -- Auteur
  author_id UUID NOT NULL REFERENCES profiles(id),

  -- État
  status forum_topic_status NOT NULL DEFAULT 'open',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  pinned_at TIMESTAMPTZ NULL,
  pinned_by UUID NULL REFERENCES profiles(id),

  -- Stats (dénormalisées pour perf)
  replies_count INT NOT NULL DEFAULT 0,
  views_count INT NOT NULL DEFAULT 0,
  last_reply_at TIMESTAMPTZ NULL,
  last_reply_by UUID NULL REFERENCES profiles(id),

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE forum_topics IS 'Sujets de discussion du forum de la copropriété.';

CREATE INDEX IF NOT EXISTS idx_forum_topics_copro ON forum_topics(copro_id);
CREATE INDEX IF NOT EXISTS idx_forum_topics_category ON forum_topics(copro_id, category);
CREATE INDEX IF NOT EXISTS idx_forum_topics_author ON forum_topics(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_topics_status ON forum_topics(copro_id, status);
CREATE INDEX IF NOT EXISTS idx_forum_topics_pinned ON forum_topics(copro_id, is_pinned DESC, last_reply_at DESC NULLS LAST);

-- ============================================================================
-- TABLE: FORUM_MESSAGES (Réponses aux topics)
-- ============================================================================

CREATE TABLE IF NOT EXISTS forum_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,

  -- Contenu
  content TEXT NOT NULL,

  -- Auteur
  author_id UUID NOT NULL REFERENCES profiles(id),

  -- Réponse à un autre message (optionnel)
  reply_to_id UUID NULL REFERENCES forum_messages(id) ON DELETE SET NULL,

  -- État
  is_edited BOOLEAN NOT NULL DEFAULT false,
  edited_at TIMESTAMPTZ NULL,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE forum_messages IS 'Messages/réponses dans les sujets du forum.';

CREATE INDEX IF NOT EXISTS idx_forum_messages_topic ON forum_messages(topic_id);
CREATE INDEX IF NOT EXISTS idx_forum_messages_author ON forum_messages(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_messages_created ON forum_messages(topic_id, created_at);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: updated_at
CREATE OR REPLACE TRIGGER trg_forum_topics_updated_at
  BEFORE UPDATE ON forum_topics
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE OR REPLACE TRIGGER trg_forum_messages_updated_at
  BEFORE UPDATE ON forum_messages
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Trigger: Mise à jour stats du topic après ajout/suppression message
CREATE OR REPLACE FUNCTION update_forum_topic_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_topic_id UUID;
  v_last_reply RECORD;
BEGIN
  v_topic_id := COALESCE(NEW.topic_id, OLD.topic_id);

  -- Récupérer le dernier message
  SELECT author_id, created_at INTO v_last_reply
  FROM forum_messages
  WHERE topic_id = v_topic_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Mettre à jour le topic
  UPDATE forum_topics
  SET
    replies_count = (SELECT COUNT(*) FROM forum_messages WHERE topic_id = v_topic_id),
    last_reply_at = v_last_reply.created_at,
    last_reply_by = v_last_reply.author_id,
    updated_at = NOW()
  WHERE id = v_topic_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_forum_messages_stats
  AFTER INSERT OR DELETE ON forum_messages
  FOR EACH ROW EXECUTE FUNCTION update_forum_topic_stats();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_messages ENABLE ROW LEVEL SECURITY;

-- === FORUM_TOPICS ===
CREATE POLICY "forum_topics_select" ON forum_topics
  FOR SELECT USING (user_has_copro_access(copro_id));

CREATE POLICY "forum_topics_insert" ON forum_topics
  FOR INSERT WITH CHECK (
    user_has_copro_access(copro_id) AND author_id = auth.uid()
  );

CREATE POLICY "forum_topics_update" ON forum_topics
  FOR UPDATE USING (
    author_id = auth.uid() OR user_is_copro_manager(copro_id)
  );

CREATE POLICY "forum_topics_delete" ON forum_topics
  FOR DELETE USING (
    author_id = auth.uid() OR user_is_copro_manager(copro_id)
  );

-- === FORUM_MESSAGES ===
CREATE POLICY "forum_messages_select" ON forum_messages
  FOR SELECT USING (user_has_copro_access(copro_id));

CREATE POLICY "forum_messages_insert" ON forum_messages
  FOR INSERT WITH CHECK (
    user_has_copro_access(copro_id) AND author_id = auth.uid()
  );

CREATE POLICY "forum_messages_update" ON forum_messages
  FOR UPDATE USING (
    author_id = auth.uid() OR user_is_copro_manager(copro_id)
  );

CREATE POLICY "forum_messages_delete" ON forum_messages
  FOR DELETE USING (
    author_id = auth.uid() OR user_is_copro_manager(copro_id)
  );

-- ============================================================================
-- VUES
-- ============================================================================

-- Vue: Topics avec infos auteur et stats
CREATE OR REPLACE VIEW v_forum_topics_overview
WITH (security_invoker = true) AS
SELECT
  ft.id,
  ft.copro_id,
  ft.title,
  LEFT(ft.content, 200) as preview,
  ft.category,
  ft.author_id,
  p.full_name as author_name,
  p.avatar_url as author_avatar,
  ft.status,
  ft.is_pinned,
  ft.pinned_at,
  pp.full_name as pinned_by_name,
  ft.replies_count,
  ft.views_count,
  ft.last_reply_at,
  lp.full_name as last_reply_by_name,
  ft.created_at,
  ft.updated_at
FROM forum_topics ft
LEFT JOIN profiles p ON p.id = ft.author_id
LEFT JOIN profiles pp ON pp.id = ft.pinned_by
LEFT JOIN profiles lp ON lp.id = ft.last_reply_by
ORDER BY ft.is_pinned DESC, COALESCE(ft.last_reply_at, ft.created_at) DESC;

COMMENT ON VIEW v_forum_topics_overview IS 'Vue des sujets du forum avec informations auteur et stats.';

-- Vue: Messages avec infos auteur
CREATE OR REPLACE VIEW v_forum_messages_detail
WITH (security_invoker = true) AS
SELECT
  fm.id,
  fm.copro_id,
  fm.topic_id,
  fm.content,
  fm.author_id,
  p.full_name as author_name,
  p.avatar_url as author_avatar,
  fm.reply_to_id,
  rp.full_name as reply_to_author_name,
  fm.is_edited,
  fm.edited_at,
  fm.created_at,
  fm.updated_at
FROM forum_messages fm
LEFT JOIN profiles p ON p.id = fm.author_id
LEFT JOIN forum_messages rm ON rm.id = fm.reply_to_id
LEFT JOIN profiles rp ON rp.id = rm.author_id
ORDER BY fm.created_at ASC;

COMMENT ON VIEW v_forum_messages_detail IS 'Vue des messages du forum avec informations auteur.';

-- ============================================================================
-- FIN
-- ============================================================================
