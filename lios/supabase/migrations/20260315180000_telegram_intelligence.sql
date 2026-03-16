-- ============================================================================
-- Telegram Group Intelligence — Schema
-- Module: tg_ (Telegram Intelligence — cross-sectional, feeds pedagógico)
-- Target: tqpkymereiyfxroiuaip.supabase.co (LI Educação)
-- Date: 2026-03-15
-- ============================================================================
-- Tables: tg_groups, tg_messages, tg_summaries, tg_insights, tg_notable_members
-- RLS: admin + pedagogico roles (full access, no anon)
-- ============================================================================

-- ─── HELPER: role check ────────────────────────────────────────────────────
-- Reusable inline to avoid repeating the subquery in every policy.
-- Returns true if the calling user has any of the given role names.

CREATE OR REPLACE FUNCTION tg_has_role(p_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM core_user_roles ur
    JOIN core_roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.name = ANY(p_roles)
  );
$$;

-- ─── TABLE: tg_groups ──────────────────────────────────────────────────────
-- Telegram groups being monitored.

CREATE TABLE IF NOT EXISTS tg_groups (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id         BIGINT      NOT NULL UNIQUE,
  name                TEXT        NOT NULL,
  description         TEXT,
  member_count        INTEGER,
  group_type          TEXT        CHECK (group_type IN ('student_group', 'study_group', 'community', 'other')),
  is_active           BOOLEAN     NOT NULL DEFAULT true,
  last_collected_at   TIMESTAMPTZ,
  last_analyzed_at    TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── TABLE: tg_messages ────────────────────────────────────────────────────
-- Raw messages captured from monitored groups.

CREATE TABLE IF NOT EXISTS tg_messages (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id            UUID        NOT NULL REFERENCES tg_groups(id) ON DELETE CASCADE,
  telegram_msg_id     BIGINT      NOT NULL,
  sender_name         TEXT,
  sender_telegram_id  BIGINT,
  message_text        TEXT,
  voice_transcription TEXT,
  message_type        TEXT        CHECK (message_type IN ('text', 'voice', 'photo', 'video', 'document', 'sticker', 'poll', 'forward', 'other')),
  reply_to_msg_id     BIGINT,
  forwarded_from      TEXT,
  has_media           BOOLEAN     NOT NULL DEFAULT false,
  poll_question       TEXT,
  poll_options        JSONB,
  reactions           JSONB,
  sent_at             TIMESTAMPTZ NOT NULL,
  collected_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, telegram_msg_id)
);

-- ─── TABLE: tg_summaries ───────────────────────────────────────────────────
-- AI-generated periodic analysis output for a group over a time window.

CREATE TABLE IF NOT EXISTS tg_summaries (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id              UUID        NOT NULL REFERENCES tg_groups(id) ON DELETE CASCADE,
  period_start          TIMESTAMPTZ NOT NULL,
  period_end            TIMESTAMPTZ NOT NULL,
  total_messages        INTEGER,
  substantive_messages  INTEGER,
  unique_participants   INTEGER,
  executive_summary     TEXT,
  full_analysis         JSONB,
  relationship_map      JSONB,
  links_shared          JSONB,
  polls_data            JSONB,
  model_used            TEXT        NOT NULL DEFAULT 'gemini-2.5-pro',
  status                TEXT        NOT NULL DEFAULT 'processing'
                          CHECK (status IN ('processing', 'completed', 'failed')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── TABLE: tg_insights ────────────────────────────────────────────────────
-- Individual extracted insights from a summary — searchable and taggable.

CREATE TABLE IF NOT EXISTS tg_insights (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_id      UUID        NOT NULL REFERENCES tg_summaries(id) ON DELETE CASCADE,
  group_id        UUID        NOT NULL REFERENCES tg_groups(id) ON DELETE CASCADE,
  category        TEXT        NOT NULL CHECK (category IN (
                    'insight', 'idea', 'actionable_plan', 'framework', 'tactic',
                    'experiment', 'result', 'mistake_learning', 'pattern',
                    'opportunity', 'tool', 'quote', 'question', 'contradiction',
                    'content_idea', 'notable_member'
                  )),
  title           TEXT,
  content         TEXT        NOT NULL,
  attributed_to   TEXT,
  source_msg_ids  BIGINT[],
  relevance_score SMALLINT    CHECK (relevance_score BETWEEN 1 AND 5),
  tags            TEXT[],
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── TABLE: tg_notable_members ─────────────────────────────────────────────
-- Students and members flagged as noteworthy by AI analysis.

CREATE TABLE IF NOT EXISTS tg_notable_members (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id          UUID        NOT NULL REFERENCES tg_groups(id) ON DELETE CASCADE,
  telegram_name     TEXT        NOT NULL,
  telegram_id       BIGINT,
  message_count     INTEGER     NOT NULL DEFAULT 0,
  substantive_count INTEGER     NOT NULL DEFAULT 0,
  topics            TEXT[],
  expertise_areas   TEXT[],
  opportunity_type  TEXT,
  notes             TEXT,
  last_active_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── INDEXES ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_tg_messages_group_sent
  ON tg_messages (group_id, sent_at);

CREATE INDEX IF NOT EXISTS idx_tg_messages_sender
  ON tg_messages (sender_telegram_id);

CREATE INDEX IF NOT EXISTS idx_tg_insights_category
  ON tg_insights (category);

CREATE INDEX IF NOT EXISTS idx_tg_insights_group_id
  ON tg_insights (group_id);

CREATE INDEX IF NOT EXISTS idx_tg_summaries_group_id
  ON tg_summaries (group_id);

CREATE INDEX IF NOT EXISTS idx_tg_notable_members_group_id
  ON tg_notable_members (group_id);

-- ─── UPDATED_AT TRIGGERS ───────────────────────────────────────────────────
-- update_updated_at_column() is defined in 20260227180000_reset_schema.sql.

CREATE TRIGGER tg_groups_updated_at
  BEFORE UPDATE ON tg_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tg_notable_members_updated_at
  BEFORE UPDATE ON tg_notable_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── RLS: 3-LAYER PATTERN ──────────────────────────────────────────────────

-- tg_groups
ALTER TABLE tg_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE tg_groups FORCE ROW LEVEL SECURITY;
REVOKE ALL ON tg_groups FROM anon;
GRANT ALL ON tg_groups TO authenticated;

-- tg_messages
ALTER TABLE tg_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tg_messages FORCE ROW LEVEL SECURITY;
REVOKE ALL ON tg_messages FROM anon;
GRANT ALL ON tg_messages TO authenticated;

-- tg_summaries
ALTER TABLE tg_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tg_summaries FORCE ROW LEVEL SECURITY;
REVOKE ALL ON tg_summaries FROM anon;
GRANT ALL ON tg_summaries TO authenticated;

-- tg_insights
ALTER TABLE tg_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE tg_insights FORCE ROW LEVEL SECURITY;
REVOKE ALL ON tg_insights FROM anon;
GRANT ALL ON tg_insights TO authenticated;

-- tg_notable_members
ALTER TABLE tg_notable_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tg_notable_members FORCE ROW LEVEL SECURITY;
REVOKE ALL ON tg_notable_members FROM anon;
GRANT ALL ON tg_notable_members TO authenticated;

-- ─── POLICIES ──────────────────────────────────────────────────────────────
-- Access: admin and pedagogico roles only (full CRUD).
-- The tg_has_role() helper is SECURITY DEFINER — safe to call from policies.

-- tg_groups
CREATE POLICY "tg_groups_select"
  ON tg_groups FOR SELECT TO authenticated
  USING (tg_has_role(ARRAY['admin', 'pedagogico']));

CREATE POLICY "tg_groups_insert"
  ON tg_groups FOR INSERT TO authenticated
  WITH CHECK (tg_has_role(ARRAY['admin', 'pedagogico']));

CREATE POLICY "tg_groups_update"
  ON tg_groups FOR UPDATE TO authenticated
  USING (tg_has_role(ARRAY['admin', 'pedagogico']));

CREATE POLICY "tg_groups_delete"
  ON tg_groups FOR DELETE TO authenticated
  USING (tg_has_role(ARRAY['admin', 'pedagogico']));

-- tg_messages
CREATE POLICY "tg_messages_select"
  ON tg_messages FOR SELECT TO authenticated
  USING (tg_has_role(ARRAY['admin', 'pedagogico']));

CREATE POLICY "tg_messages_insert"
  ON tg_messages FOR INSERT TO authenticated
  WITH CHECK (tg_has_role(ARRAY['admin', 'pedagogico']));

CREATE POLICY "tg_messages_update"
  ON tg_messages FOR UPDATE TO authenticated
  USING (tg_has_role(ARRAY['admin', 'pedagogico']));

CREATE POLICY "tg_messages_delete"
  ON tg_messages FOR DELETE TO authenticated
  USING (tg_has_role(ARRAY['admin', 'pedagogico']));

-- tg_summaries
CREATE POLICY "tg_summaries_select"
  ON tg_summaries FOR SELECT TO authenticated
  USING (tg_has_role(ARRAY['admin', 'pedagogico']));

CREATE POLICY "tg_summaries_insert"
  ON tg_summaries FOR INSERT TO authenticated
  WITH CHECK (tg_has_role(ARRAY['admin', 'pedagogico']));

CREATE POLICY "tg_summaries_update"
  ON tg_summaries FOR UPDATE TO authenticated
  USING (tg_has_role(ARRAY['admin', 'pedagogico']));

CREATE POLICY "tg_summaries_delete"
  ON tg_summaries FOR DELETE TO authenticated
  USING (tg_has_role(ARRAY['admin', 'pedagogico']));

-- tg_insights
CREATE POLICY "tg_insights_select"
  ON tg_insights FOR SELECT TO authenticated
  USING (tg_has_role(ARRAY['admin', 'pedagogico']));

CREATE POLICY "tg_insights_insert"
  ON tg_insights FOR INSERT TO authenticated
  WITH CHECK (tg_has_role(ARRAY['admin', 'pedagogico']));

CREATE POLICY "tg_insights_update"
  ON tg_insights FOR UPDATE TO authenticated
  USING (tg_has_role(ARRAY['admin', 'pedagogico']));

CREATE POLICY "tg_insights_delete"
  ON tg_insights FOR DELETE TO authenticated
  USING (tg_has_role(ARRAY['admin', 'pedagogico']));

-- tg_notable_members
CREATE POLICY "tg_notable_members_select"
  ON tg_notable_members FOR SELECT TO authenticated
  USING (tg_has_role(ARRAY['admin', 'pedagogico']));

CREATE POLICY "tg_notable_members_insert"
  ON tg_notable_members FOR INSERT TO authenticated
  WITH CHECK (tg_has_role(ARRAY['admin', 'pedagogico']));

CREATE POLICY "tg_notable_members_update"
  ON tg_notable_members FOR UPDATE TO authenticated
  USING (tg_has_role(ARRAY['admin', 'pedagogico']));

CREATE POLICY "tg_notable_members_delete"
  ON tg_notable_members FOR DELETE TO authenticated
  USING (tg_has_role(ARRAY['admin', 'pedagogico']));

-- ============================================================================
-- Done.
-- 5 tables: tg_groups, tg_messages, tg_summaries, tg_insights, tg_notable_members
-- RLS: 3-layer (ENABLE + FORCE + REVOKE anon), admin + pedagogico access
-- Triggers: updated_at on tg_groups and tg_notable_members
-- Helper: tg_has_role() — SECURITY DEFINER, safe in policies
-- ============================================================================
