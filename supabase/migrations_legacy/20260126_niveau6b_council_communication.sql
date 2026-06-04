-- ============================================================================
-- NIVEAU 6B : CONSEIL SYNDICAL (Décisions/Votes) + COMMUNICATION
-- CoProFlex - Migration principale
-- Date: 2026-01-26
-- Référentiel: Loi 65-557 Art.21-22, Décret 67-223, Doc "5 - Conseil Syndical et Communication.pdf"
-- ============================================================================

-- ============================================================================
-- PARTIE 1: ENUMS
-- ============================================================================

-- Rôles membres CS (complète les rôles existants)
DO $$ BEGIN
  CREATE TYPE council_role AS ENUM ('president', 'secretary', 'treasurer', 'member', 'observer');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Statuts décisions CS
DO $$ BEGIN
  CREATE TYPE council_decision_status AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'archived');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Votes CS
DO $$ BEGIN
  CREATE TYPE council_vote_choice AS ENUM ('for', 'against', 'abstention');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Visibilité documents/publications
DO $$ BEGIN
  CREATE TYPE content_visibility AS ENUM ('all_members', 'council_only', 'managers_only');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Types de liens pour documents CS
DO $$ BEGIN
  CREATE TYPE council_doc_link_type AS ENUM ('contract', 'service_order', 'ag', 'invoice', 'budget', 'other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Catégories de posts mur
DO $$ BEGIN
  CREATE TYPE wall_post_category AS ENUM ('information', 'urgent', 'question', 'event', 'other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Types d'événements
DO $$ BEGIN
  CREATE TYPE event_type AS ENUM ('ag', 'reunion_cs', 'travaux', 'intervention', 'fete', 'autre');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- PARTIE 2: TABLE COUNCIL_MEMBERS (remplace/complète membres_conseil_syndical)
-- ============================================================================

-- Ajout colonne user_id si absente sur membres_conseil_syndical
DO $$ BEGIN
  ALTER TABLE membres_conseil_syndical ADD COLUMN IF NOT EXISTS user_id UUID NULL REFERENCES profiles(id);
EXCEPTION WHEN undefined_table THEN
  -- Table n'existe pas encore, on la crée
  null;
END $$;

-- Table alternative si membres_conseil_syndical n'existe pas
CREATE TABLE IF NOT EXISTS council_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  user_id UUID NULL REFERENCES profiles(id),
  coproprietaire_id UUID NULL REFERENCES coproprietaires(id),

  -- Rôle et période
  role council_role NOT NULL DEFAULT 'member',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NULL,

  -- Statut calculé
  is_active BOOLEAN GENERATED ALWAYS AS (
    end_date IS NULL OR end_date >= CURRENT_DATE
  ) STORED,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contraintes
  CONSTRAINT chk_council_member_identity CHECK (
    user_id IS NOT NULL OR coproprietaire_id IS NOT NULL
  ),
  CONSTRAINT uq_council_member_active UNIQUE (copro_id, coproprietaire_id, start_date)
);

COMMENT ON TABLE council_members IS
  'Membres du conseil syndical - Art. 21 loi 65-557. Gestion des mandats et rôles.';

CREATE INDEX IF NOT EXISTS idx_council_members_copro ON council_members(copro_id);
CREATE INDEX IF NOT EXISTS idx_council_members_active ON council_members(copro_id, is_active);
CREATE INDEX IF NOT EXISTS idx_council_members_user ON council_members(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_council_members_coproprietaire ON council_members(coproprietaire_id) WHERE coproprietaire_id IS NOT NULL;

-- ============================================================================
-- PARTIE 3: TABLE COUNCIL_DECISIONS (Avis/Décisions CS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS council_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,

  -- Contenu
  title TEXT NOT NULL,
  description TEXT NULL,

  -- Statut et workflow
  status council_decision_status NOT NULL DEFAULT 'draft',

  -- Création
  created_by UUID NOT NULL REFERENCES profiles(id),

  -- Soumission
  submitted_at TIMESTAMPTZ NULL,
  submitted_by UUID NULL REFERENCES profiles(id),

  -- Décision finale
  decided_at TIMESTAMPTZ NULL,
  decided_by UUID NULL REFERENCES profiles(id),

  -- Liens optionnels
  linked_ag_id UUID NULL,
  linked_resolution_id UUID NULL,

  -- Notes de rejet si applicable
  rejection_reason TEXT NULL,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE council_decisions IS
  'Décisions et avis du conseil syndical - Art. 21-22 loi 65-557.';

CREATE INDEX IF NOT EXISTS idx_council_decisions_copro ON council_decisions(copro_id);
CREATE INDEX IF NOT EXISTS idx_council_decisions_status ON council_decisions(copro_id, status);
CREATE INDEX IF NOT EXISTS idx_council_decisions_created ON council_decisions(copro_id, created_at DESC);

-- ============================================================================
-- PARTIE 4: TABLE COUNCIL_VOTES (Votes des membres CS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS council_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  decision_id UUID NOT NULL REFERENCES council_decisions(id) ON DELETE CASCADE,
  council_member_id UUID NOT NULL REFERENCES council_members(id) ON DELETE CASCADE,

  -- Vote
  vote council_vote_choice NOT NULL,
  comment TEXT NULL,

  -- Audit
  voted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unicité: un membre = un vote par décision
  CONSTRAINT uq_council_vote UNIQUE (decision_id, council_member_id)
);

COMMENT ON TABLE council_votes IS 'Votes des membres CS sur les décisions.';

CREATE INDEX IF NOT EXISTS idx_council_votes_decision ON council_votes(decision_id);
CREATE INDEX IF NOT EXISTS idx_council_votes_member ON council_votes(council_member_id);

-- ============================================================================
-- PARTIE 5: TABLE COUNCIL_DOCUMENTS (Documents partagés CS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS council_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  -- Visibilité
  visibility content_visibility NOT NULL DEFAULT 'council_only',

  -- Lien optionnel vers entité métier
  linked_type council_doc_link_type NULL,
  linked_id UUID NULL,

  -- Métadonnées
  label TEXT NULL,
  notes TEXT NULL,

  -- Audit
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_council_document UNIQUE (copro_id, document_id)
);

COMMENT ON TABLE council_documents IS
  'Documents partagés avec le conseil syndical - Art. 21 (droit de consultation).';

CREATE INDEX IF NOT EXISTS idx_council_documents_copro ON council_documents(copro_id);
CREATE INDEX IF NOT EXISTS idx_council_documents_visibility ON council_documents(copro_id, visibility);
CREATE INDEX IF NOT EXISTS idx_council_documents_linked ON council_documents(linked_type, linked_id)
  WHERE linked_type IS NOT NULL;

-- ============================================================================
-- PARTIE 6: TABLE WALL_POSTS (Mur de la copropriété)
-- ============================================================================

CREATE TABLE IF NOT EXISTS wall_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),

  -- Contenu
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category wall_post_category NOT NULL DEFAULT 'information',

  -- Visibilité et épinglage
  visibility content_visibility NOT NULL DEFAULT 'all_members',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  pinned_at TIMESTAMPTZ NULL,
  pinned_by UUID NULL REFERENCES profiles(id),

  -- Document attaché optionnel
  attachment_id UUID NULL REFERENCES documents(id),

  -- Compteurs (dénormalisés pour performance)
  likes_count INT NOT NULL DEFAULT 0,
  comments_count INT NOT NULL DEFAULT 0,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE wall_posts IS 'Mur d''actualités de la copropriété.';

CREATE INDEX IF NOT EXISTS idx_wall_posts_copro ON wall_posts(copro_id);
CREATE INDEX IF NOT EXISTS idx_wall_posts_author ON wall_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_wall_posts_visibility ON wall_posts(copro_id, visibility);
CREATE INDEX IF NOT EXISTS idx_wall_posts_pinned ON wall_posts(copro_id, is_pinned, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wall_posts_category ON wall_posts(copro_id, category);
CREATE INDEX IF NOT EXISTS idx_wall_posts_created ON wall_posts(copro_id, created_at DESC);

-- ============================================================================
-- PARTIE 7: TABLE WALL_COMMENTS (Commentaires sur posts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS wall_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES wall_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),

  -- Contenu
  content TEXT NOT NULL,

  -- Parent (pour réponses imbriquées - niveau 1 seulement)
  parent_comment_id UUID NULL REFERENCES wall_comments(id) ON DELETE CASCADE,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE wall_comments IS 'Commentaires sur les publications du mur.';

CREATE INDEX IF NOT EXISTS idx_wall_comments_post ON wall_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_wall_comments_author ON wall_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_wall_comments_parent ON wall_comments(parent_comment_id)
  WHERE parent_comment_id IS NOT NULL;

-- ============================================================================
-- PARTIE 8: TABLE WALL_LIKES (Likes sur posts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS wall_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES wall_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_wall_like UNIQUE (post_id, user_id)
);

COMMENT ON TABLE wall_likes IS 'Likes sur les publications du mur.';

CREATE INDEX IF NOT EXISTS idx_wall_likes_post ON wall_likes(post_id);

-- ============================================================================
-- PARTIE 9: TABLE EVENTS (Événements)
-- ============================================================================

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,

  -- Contenu
  title TEXT NOT NULL,
  description TEXT NULL,
  event_type event_type NOT NULL DEFAULT 'autre',

  -- Lieu et temps
  location TEXT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NULL,
  all_day BOOLEAN NOT NULL DEFAULT false,

  -- Visibilité
  visibility content_visibility NOT NULL DEFAULT 'all_members',

  -- Liens optionnels
  linked_ag_id UUID NULL,
  linked_service_order_id UUID NULL,

  -- Créateur
  created_by UUID NOT NULL REFERENCES profiles(id),

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_event_dates CHECK (ends_at IS NULL OR ends_at >= starts_at)
);

COMMENT ON TABLE events IS 'Événements de la copropriété - AG, réunions CS, travaux, fêtes.';

CREATE INDEX IF NOT EXISTS idx_events_copro ON events(copro_id);
CREATE INDEX IF NOT EXISTS idx_events_dates ON events(copro_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(copro_id, event_type);
CREATE INDEX IF NOT EXISTS idx_events_visibility ON events(copro_id, visibility);

-- ============================================================================
-- PARTIE 10: TABLE CONVERSATIONS (Messagerie privée)
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,

  -- Sujet (optionnel)
  subject TEXT NULL,

  -- Type (one-to-one ou groupe)
  is_group BOOLEAN NOT NULL DEFAULT false,

  -- Créateur
  created_by UUID NOT NULL REFERENCES profiles(id),

  -- Dernier message (dénormalisé pour tri)
  last_message_at TIMESTAMPTZ NULL,
  last_message_preview TEXT NULL,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE conversations IS 'Conversations privées entre membres.';

CREATE INDEX IF NOT EXISTS idx_conversations_copro ON conversations(copro_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(copro_id, last_message_at DESC NULLS LAST);

-- ============================================================================
-- PARTIE 11: TABLE CONVERSATION_MEMBERS (Membres d'une conversation)
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),

  -- Lecture
  last_read_at TIMESTAMPTZ NULL,
  unread_count INT NOT NULL DEFAULT 0,

  -- Rôle dans la conversation
  is_admin BOOLEAN NOT NULL DEFAULT false,

  -- Sorti de la conversation?
  left_at TIMESTAMPTZ NULL,

  -- Audit
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_conversation_member UNIQUE (conversation_id, user_id)
);

COMMENT ON TABLE conversation_members IS 'Membres d''une conversation privée.';

CREATE INDEX IF NOT EXISTS idx_conversation_members_conversation ON conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user ON conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_active ON conversation_members(user_id, left_at)
  WHERE left_at IS NULL;

-- ============================================================================
-- PARTIE 12: TABLE MESSAGES (Messages de conversation)
-- ============================================================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),

  -- Contenu
  content TEXT NOT NULL,

  -- Pièce jointe optionnelle
  attachment_id UUID NULL REFERENCES documents(id),

  -- Indicateur de lecture (par tous les membres)
  read_by UUID[] NOT NULL DEFAULT '{}',

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ NULL
);

COMMENT ON TABLE messages IS 'Messages de la messagerie privée.';

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_author ON messages(author_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(conversation_id, created_at DESC);

-- ============================================================================
-- PARTIE 13: TRIGGERS
-- ============================================================================

-- Trigger: updated_at sur toutes les nouvelles tables
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'council_members', 'council_decisions', 'wall_posts', 'wall_comments',
    'events', 'conversations', 'messages'
  ])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_updated_at_%I ON %I;
      CREATE TRIGGER trg_updated_at_%I
        BEFORE UPDATE ON %I
        FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
    ', tbl, tbl, tbl, tbl);
  END LOOP;
END $$;

-- Trigger: Mettre à jour compteur commentaires sur post
CREATE OR REPLACE FUNCTION update_wall_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE wall_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE wall_posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_wall_comments_count
  AFTER INSERT OR DELETE ON wall_comments
  FOR EACH ROW EXECUTE FUNCTION update_wall_post_comments_count();

-- Trigger: Mettre à jour compteur likes sur post
CREATE OR REPLACE FUNCTION update_wall_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE wall_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE wall_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_wall_likes_count
  AFTER INSERT OR DELETE ON wall_likes
  FOR EACH ROW EXECUTE FUNCTION update_wall_post_likes_count();

-- Trigger: Mettre à jour last_message sur conversation
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 100),
    updated_at = NOW()
  WHERE id = NEW.conversation_id;

  -- Incrémenter unread_count pour tous les membres sauf l'auteur
  UPDATE conversation_members
  SET unread_count = unread_count + 1
  WHERE conversation_id = NEW.conversation_id
    AND user_id != NEW.author_id
    AND left_at IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- ============================================================================
-- PARTIE 14: FONCTIONS UTILITAIRES
-- ============================================================================

-- Fonction: Vérifier si l'utilisateur est membre du CS actif
CREATE OR REPLACE FUNCTION is_council_member(p_copro_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM council_members
    WHERE copro_id = p_copro_id
      AND user_id = p_user_id
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Fonction: Vérifier si l'utilisateur est président du CS
CREATE OR REPLACE FUNCTION is_council_president(p_copro_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM council_members
    WHERE copro_id = p_copro_id
      AND user_id = p_user_id
      AND role = 'president'
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Fonction: Calculer le résultat d'une décision CS
CREATE OR REPLACE FUNCTION compute_decision_result(p_decision_id UUID)
RETURNS TABLE (
  total_votes INT,
  votes_for INT,
  votes_against INT,
  votes_abstention INT,
  is_passed BOOLEAN,
  quorum_reached BOOLEAN
) AS $$
DECLARE
  v_copro_id UUID;
  v_active_members INT;
  v_for INT;
  v_against INT;
  v_abstention INT;
  v_total INT;
BEGIN
  -- Récupérer la copropriété de la décision
  SELECT d.copro_id INTO v_copro_id
  FROM council_decisions d
  WHERE d.id = p_decision_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Compter les membres actifs du CS
  SELECT COUNT(*) INTO v_active_members
  FROM council_members
  WHERE copro_id = v_copro_id AND is_active = true;

  -- Compter les votes
  SELECT
    COALESCE(SUM(CASE WHEN vote = 'for' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN vote = 'against' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN vote = 'abstention' THEN 1 ELSE 0 END), 0)
  INTO v_for, v_against, v_abstention
  FROM council_votes
  WHERE decision_id = p_decision_id;

  v_total := v_for + v_against + v_abstention;

  RETURN QUERY SELECT
    v_total,
    v_for,
    v_against,
    v_abstention,
    v_for > v_against, -- Majorité simple
    v_total >= CEIL(v_active_members::NUMERIC / 2); -- Quorum = 50%
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Fonction: Vérifier si l'utilisateur est membre d'une conversation
CREATE OR REPLACE FUNCTION is_conversation_member(p_conversation_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = p_conversation_id
      AND user_id = p_user_id
      AND left_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Fonction: Marquer une conversation comme lue
CREATE OR REPLACE FUNCTION mark_conversation_read(p_conversation_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE conversation_members
  SET
    last_read_at = NOW(),
    unread_count = 0
  WHERE conversation_id = p_conversation_id
    AND user_id = auth.uid();

  -- Ajouter l'utilisateur au tableau read_by des messages non lus
  UPDATE messages
  SET read_by = array_append(read_by, auth.uid())
  WHERE conversation_id = p_conversation_id
    AND NOT (auth.uid() = ANY(read_by))
    AND author_id != auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction: Vérifier visibilité du contenu
CREATE OR REPLACE FUNCTION can_view_content(
  p_copro_id UUID,
  p_visibility content_visibility,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Gestionnaires voient tout
  IF user_is_copro_manager(p_copro_id) THEN
    RETURN true;
  END IF;

  -- Contenu pour tous les membres
  IF p_visibility = 'all_members' THEN
    RETURN user_has_copro_access(p_copro_id);
  END IF;

  -- Contenu CS uniquement
  IF p_visibility = 'council_only' THEN
    RETURN is_council_member(p_copro_id, p_user_id);
  END IF;

  -- Contenu gestionnaires uniquement
  IF p_visibility = 'managers_only' THEN
    RETURN user_is_copro_manager(p_copro_id);
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- PARTIE 15: RLS POLICIES
-- ============================================================================

-- Activer RLS
ALTER TABLE council_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE council_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE council_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE council_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE wall_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wall_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wall_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- === COUNCIL_MEMBERS ===
CREATE POLICY "council_members_select" ON council_members
  FOR SELECT USING (
    user_has_copro_access(copro_id) AND (
      user_is_copro_manager(copro_id) OR
      is_council_member(copro_id) OR
      -- Les copropriétaires peuvent voir la composition du CS
      visibility_mode() = 'public'
    )
  );

CREATE POLICY "council_members_insert" ON council_members
  FOR INSERT WITH CHECK (user_is_copro_manager(copro_id));

CREATE POLICY "council_members_update" ON council_members
  FOR UPDATE USING (user_is_copro_manager(copro_id));

CREATE POLICY "council_members_delete" ON council_members
  FOR DELETE USING (user_is_copro_manager(copro_id));

-- === COUNCIL_DECISIONS ===
CREATE POLICY "council_decisions_select" ON council_decisions
  FOR SELECT USING (
    user_has_copro_access(copro_id) AND (
      user_is_copro_manager(copro_id) OR
      is_council_member(copro_id)
    )
  );

CREATE POLICY "council_decisions_insert" ON council_decisions
  FOR INSERT WITH CHECK (
    is_council_member(copro_id) AND created_by = auth.uid()
  );

CREATE POLICY "council_decisions_update" ON council_decisions
  FOR UPDATE USING (
    user_has_copro_access(copro_id) AND (
      user_is_copro_manager(copro_id) OR
      (is_council_member(copro_id) AND status = 'draft' AND created_by = auth.uid())
    )
  );

CREATE POLICY "council_decisions_delete" ON council_decisions
  FOR DELETE USING (
    user_is_copro_manager(copro_id) AND status = 'draft'
  );

-- === COUNCIL_VOTES ===
CREATE POLICY "council_votes_select" ON council_votes
  FOR SELECT USING (
    user_has_copro_access(copro_id) AND (
      user_is_copro_manager(copro_id) OR
      is_council_member(copro_id)
    )
  );

CREATE POLICY "council_votes_insert" ON council_votes
  FOR INSERT WITH CHECK (
    is_council_member(copro_id) AND
    EXISTS (
      SELECT 1 FROM council_members
      WHERE id = council_member_id
        AND user_id = auth.uid()
        AND is_active = true
    )
  );

CREATE POLICY "council_votes_update" ON council_votes
  FOR UPDATE USING (
    is_council_member(copro_id) AND
    EXISTS (
      SELECT 1 FROM council_members
      WHERE id = council_member_id
        AND user_id = auth.uid()
    )
  );

-- === COUNCIL_DOCUMENTS ===
CREATE POLICY "council_documents_select" ON council_documents
  FOR SELECT USING (
    can_view_content(copro_id, visibility)
  );

CREATE POLICY "council_documents_insert" ON council_documents
  FOR INSERT WITH CHECK (
    (user_is_copro_manager(copro_id) OR is_council_member(copro_id)) AND
    created_by = auth.uid()
  );

CREATE POLICY "council_documents_delete" ON council_documents
  FOR DELETE USING (
    user_is_copro_manager(copro_id) OR
    (is_council_member(copro_id) AND created_by = auth.uid())
  );

-- === WALL_POSTS ===
CREATE POLICY "wall_posts_select" ON wall_posts
  FOR SELECT USING (
    can_view_content(copro_id, visibility)
  );

CREATE POLICY "wall_posts_insert" ON wall_posts
  FOR INSERT WITH CHECK (
    user_has_copro_access(copro_id) AND author_id = auth.uid()
  );

CREATE POLICY "wall_posts_update" ON wall_posts
  FOR UPDATE USING (
    user_has_copro_access(copro_id) AND (
      author_id = auth.uid() OR
      user_is_copro_manager(copro_id)
    )
  );

CREATE POLICY "wall_posts_delete" ON wall_posts
  FOR DELETE USING (
    author_id = auth.uid() OR user_is_copro_manager(copro_id)
  );

-- === WALL_COMMENTS ===
CREATE POLICY "wall_comments_select" ON wall_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM wall_posts p
      WHERE p.id = post_id AND can_view_content(p.copro_id, p.visibility)
    )
  );

CREATE POLICY "wall_comments_insert" ON wall_comments
  FOR INSERT WITH CHECK (
    user_has_copro_access(copro_id) AND author_id = auth.uid()
  );

CREATE POLICY "wall_comments_update" ON wall_comments
  FOR UPDATE USING (
    author_id = auth.uid()
  );

CREATE POLICY "wall_comments_delete" ON wall_comments
  FOR DELETE USING (
    author_id = auth.uid() OR user_is_copro_manager(copro_id)
  );

-- === WALL_LIKES ===
CREATE POLICY "wall_likes_select" ON wall_likes
  FOR SELECT USING (user_has_copro_access(copro_id));

CREATE POLICY "wall_likes_insert" ON wall_likes
  FOR INSERT WITH CHECK (
    user_has_copro_access(copro_id) AND user_id = auth.uid()
  );

CREATE POLICY "wall_likes_delete" ON wall_likes
  FOR DELETE USING (user_id = auth.uid());

-- === EVENTS ===
CREATE POLICY "events_select" ON events
  FOR SELECT USING (
    can_view_content(copro_id, visibility)
  );

CREATE POLICY "events_insert" ON events
  FOR INSERT WITH CHECK (
    (user_is_copro_manager(copro_id) OR is_council_member(copro_id)) AND
    created_by = auth.uid()
  );

CREATE POLICY "events_update" ON events
  FOR UPDATE USING (
    user_is_copro_manager(copro_id) OR
    (is_council_member(copro_id) AND created_by = auth.uid())
  );

CREATE POLICY "events_delete" ON events
  FOR DELETE USING (
    user_is_copro_manager(copro_id) OR
    (is_council_member(copro_id) AND created_by = auth.uid())
  );

-- === CONVERSATIONS ===
CREATE POLICY "conversations_select" ON conversations
  FOR SELECT USING (
    is_conversation_member(id)
  );

CREATE POLICY "conversations_insert" ON conversations
  FOR INSERT WITH CHECK (
    user_has_copro_access(copro_id) AND created_by = auth.uid()
  );

CREATE POLICY "conversations_update" ON conversations
  FOR UPDATE USING (
    is_conversation_member(id)
  );

-- === CONVERSATION_MEMBERS ===
CREATE POLICY "conversation_members_select" ON conversation_members
  FOR SELECT USING (
    is_conversation_member(conversation_id)
  );

CREATE POLICY "conversation_members_insert" ON conversation_members
  FOR INSERT WITH CHECK (
    user_has_copro_access(copro_id) AND (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM conversation_members cm
        WHERE cm.conversation_id = conversation_id
          AND cm.user_id = auth.uid()
          AND cm.is_admin = true
      )
    )
  );

CREATE POLICY "conversation_members_update" ON conversation_members
  FOR UPDATE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = conversation_id
        AND cm.user_id = auth.uid()
        AND cm.is_admin = true
    )
  );

-- === MESSAGES ===
CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (
    is_conversation_member(conversation_id)
  );

CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (
    is_conversation_member(conversation_id) AND author_id = auth.uid()
  );

CREATE POLICY "messages_update" ON messages
  FOR UPDATE USING (
    author_id = auth.uid()
  );

CREATE POLICY "messages_delete" ON messages
  FOR DELETE USING (
    author_id = auth.uid()
  );

-- ============================================================================
-- PARTIE 16: VUES
-- ============================================================================

-- Vue: Membres du CS avec infos
CREATE OR REPLACE VIEW v_council_members
WITH (security_invoker = true) AS
SELECT
  cm.id,
  cm.copro_id,
  cm.user_id,
  cm.coproprietaire_id,
  cm.role,
  cm.start_date,
  cm.end_date,
  cm.is_active,
  cm.created_at,
  -- Infos profil
  p.email as user_email,
  p.full_name as user_name,
  -- Infos copropriétaire
  c.nom as coproprietaire_nom,
  c.prenom as coproprietaire_prenom,
  c.email as coproprietaire_email
FROM council_members cm
LEFT JOIN profiles p ON p.id = cm.user_id
LEFT JOIN coproprietaires c ON c.id = cm.coproprietaire_id;

COMMENT ON VIEW v_council_members IS 'Vue des membres du CS avec informations de profil.';

-- Vue: Décisions CS avec résultats votes
CREATE OR REPLACE VIEW v_council_decisions_overview
WITH (security_invoker = true) AS
SELECT
  d.id,
  d.copro_id,
  d.title,
  d.description,
  d.status,
  d.created_by,
  d.created_at,
  d.submitted_at,
  d.decided_at,
  d.rejection_reason,
  -- Créateur
  p_creator.full_name as creator_name,
  -- Stats votes
  COALESCE(v.total_votes, 0) as total_votes,
  COALESCE(v.votes_for, 0) as votes_for,
  COALESCE(v.votes_against, 0) as votes_against,
  COALESCE(v.votes_abstention, 0) as votes_abstention,
  -- Résultat (si soumis)
  CASE
    WHEN d.status = 'submitted' THEN v.is_passed
    WHEN d.status = 'approved' THEN true
    WHEN d.status = 'rejected' THEN false
    ELSE NULL
  END as is_passed,
  -- Nombre membres actifs CS
  (
    SELECT COUNT(*) FROM council_members cm
    WHERE cm.copro_id = d.copro_id AND cm.is_active = true
  ) as active_members_count,
  -- Liens
  d.linked_ag_id,
  d.linked_resolution_id
FROM council_decisions d
LEFT JOIN profiles p_creator ON p_creator.id = d.created_by
LEFT JOIN LATERAL (
  SELECT * FROM compute_decision_result(d.id)
) v ON true;

COMMENT ON VIEW v_council_decisions_overview IS 'Vue des décisions CS avec résultats des votes.';

-- Vue: Documents CS avec métadonnées
CREATE OR REPLACE VIEW v_council_documents_overview
WITH (security_invoker = true) AS
SELECT
  cd.id,
  cd.copro_id,
  cd.document_id,
  cd.visibility,
  cd.linked_type,
  cd.linked_id,
  cd.label,
  cd.notes,
  cd.created_by,
  cd.created_at,
  -- Document
  doc.nom as document_name,
  doc.type as document_type,
  doc.fichier_url as document_url,
  doc.fichier_taille as document_size,
  -- Créateur
  p.full_name as creator_name
FROM council_documents cd
JOIN documents doc ON doc.id = cd.document_id
LEFT JOIN profiles p ON p.id = cd.created_by;

COMMENT ON VIEW v_council_documents_overview IS 'Vue des documents partagés CS.';

-- Vue: Feed du mur
CREATE OR REPLACE VIEW v_wall_feed
WITH (security_invoker = true) AS
SELECT
  wp.id,
  wp.copro_id,
  wp.author_id,
  wp.title,
  wp.content,
  wp.category,
  wp.visibility,
  wp.is_pinned,
  wp.pinned_at,
  wp.likes_count,
  wp.comments_count,
  wp.attachment_id,
  wp.created_at,
  wp.updated_at,
  -- Auteur
  p.full_name as author_name,
  p.avatar_url as author_avatar,
  -- Est liké par l'utilisateur courant?
  EXISTS (
    SELECT 1 FROM wall_likes wl
    WHERE wl.post_id = wp.id AND wl.user_id = auth.uid()
  ) as is_liked_by_me,
  -- Rôle de l'auteur
  CASE
    WHEN user_is_copro_manager(wp.copro_id) THEN 'manager'
    WHEN is_council_president(wp.copro_id, wp.author_id) THEN 'president_cs'
    WHEN is_council_member(wp.copro_id, wp.author_id) THEN 'council'
    ELSE 'member'
  END as author_role
FROM wall_posts wp
JOIN profiles p ON p.id = wp.author_id
ORDER BY wp.is_pinned DESC, wp.created_at DESC;

COMMENT ON VIEW v_wall_feed IS 'Feed du mur avec informations auteur et likes.';

-- Vue: Événements
CREATE OR REPLACE VIEW v_events_overview
WITH (security_invoker = true) AS
SELECT
  e.id,
  e.copro_id,
  e.title,
  e.description,
  e.event_type,
  e.location,
  e.starts_at,
  e.ends_at,
  e.all_day,
  e.visibility,
  e.linked_ag_id,
  e.linked_service_order_id,
  e.created_by,
  e.created_at,
  -- Créateur
  p.full_name as creator_name,
  -- Est passé?
  e.starts_at < NOW() as is_past,
  -- Est aujourd'hui?
  e.starts_at::DATE = CURRENT_DATE as is_today
FROM events e
JOIN profiles p ON p.id = e.created_by
ORDER BY e.starts_at ASC;

COMMENT ON VIEW v_events_overview IS 'Vue des événements avec métadonnées.';

-- Vue: Conversations avec dernier message
CREATE OR REPLACE VIEW v_conversations_overview
WITH (security_invoker = true) AS
SELECT
  c.id,
  c.copro_id,
  c.subject,
  c.is_group,
  c.created_by,
  c.last_message_at,
  c.last_message_preview,
  c.created_at,
  -- Mon statut dans la conversation
  cm.unread_count as my_unread_count,
  cm.last_read_at as my_last_read_at,
  -- Autres membres (pour affichage)
  (
    SELECT array_agg(json_build_object(
      'user_id', m.user_id,
      'name', p.full_name,
      'avatar', p.avatar_url
    ))
    FROM conversation_members m
    JOIN profiles p ON p.id = m.user_id
    WHERE m.conversation_id = c.id
      AND m.user_id != auth.uid()
      AND m.left_at IS NULL
  ) as other_members
FROM conversations c
JOIN conversation_members cm ON cm.conversation_id = c.id AND cm.user_id = auth.uid()
WHERE cm.left_at IS NULL
ORDER BY c.last_message_at DESC NULLS LAST;

COMMENT ON VIEW v_conversations_overview IS 'Vue des conversations de l''utilisateur courant.';

-- Vue: Messages d'une conversation
CREATE OR REPLACE VIEW v_conversation_messages
WITH (security_invoker = true) AS
SELECT
  m.id,
  m.copro_id,
  m.conversation_id,
  m.author_id,
  m.content,
  m.attachment_id,
  m.read_by,
  m.created_at,
  m.edited_at,
  -- Auteur
  p.full_name as author_name,
  p.avatar_url as author_avatar,
  -- Est mon message?
  m.author_id = auth.uid() as is_mine,
  -- Pièce jointe
  doc.nom as attachment_name,
  doc.fichier_url as attachment_url
FROM messages m
JOIN profiles p ON p.id = m.author_id
LEFT JOIN documents doc ON doc.id = m.attachment_id
ORDER BY m.created_at ASC;

COMMENT ON VIEW v_conversation_messages IS 'Vue des messages avec informations auteur.';

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
