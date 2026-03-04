-- ============================================================================
-- Carousel Creator — Initial Schema Migration
-- Target: tqpkymereiyfxroiuaip.supabase.co (LI Educação)
-- ============================================================================

-- ─── Helper Function ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── Tables ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS carousels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  topic TEXT NOT NULL DEFAULT '',
  target_audience TEXT NOT NULL DEFAULT '',
  objective TEXT NOT NULL DEFAULT 'educar',
  tone TEXT NOT NULL DEFAULT 'educativo',
  slide_count INTEGER NOT NULL DEFAULT 5,
  format TEXT NOT NULL DEFAULT '1080x1350',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'text_generated', 'text_validated', 'images_generated', 'exported')),
  persona_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS carousel_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carousel_id UUID NOT NULL REFERENCES carousels(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  slide_type TEXT NOT NULL DEFAULT 'content'
    CHECK (slide_type IN ('cover', 'content', 'tip', 'cta', 'testimonial')),
  headline TEXT NOT NULL DEFAULT '',
  body_text TEXT NOT NULL DEFAULT '',
  cta_text TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  background_prompt TEXT,
  layout_config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (carousel_id, position)
);

CREATE TABLE IF NOT EXISTS carousel_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carousel_id UUID NOT NULL REFERENCES carousels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slide_position INTEGER,
  feedback_type TEXT NOT NULL DEFAULT 'general'
    CHECK (feedback_type IN ('general', 'text', 'design', 'layout')),
  content TEXT NOT NULL DEFAULT '',
  applied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS writing_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  tone TEXT NOT NULL DEFAULT 'educativo',
  vocabulary JSONB NOT NULL DEFAULT '[]',
  examples JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learning_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id UUID REFERENCES writing_personas(id) ON DELETE SET NULL,
  content_type TEXT NOT NULL DEFAULT 'carousel'
    CHECK (content_type IN ('carousel', 'post', 'reel_script')),
  original_text TEXT NOT NULL,
  context TEXT NOT NULL DEFAULT '',
  quality_score INTEGER DEFAULT 0 CHECK (quality_score BETWEEN 0 AND 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX idx_carousels_user_id ON carousels(user_id);
CREATE INDEX idx_carousels_status ON carousels(status);
CREATE INDEX idx_carousel_slides_carousel_id ON carousel_slides(carousel_id);
CREATE INDEX idx_carousel_feedback_carousel_id ON carousel_feedback(carousel_id);
CREATE INDEX idx_writing_personas_user_id ON writing_personas(user_id);
CREATE INDEX idx_learning_examples_user_id ON learning_examples(user_id);

-- ─── Triggers ───────────────────────────────────────────────────────────────

CREATE TRIGGER trg_carousels_updated_at
  BEFORE UPDATE ON carousels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_carousel_slides_updated_at
  BEFORE UPDATE ON carousel_slides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_writing_personas_updated_at
  BEFORE UPDATE ON writing_personas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE carousels ENABLE ROW LEVEL SECURITY;
ALTER TABLE carousels FORCE ROW LEVEL SECURITY;
ALTER TABLE carousel_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE carousel_slides FORCE ROW LEVEL SECURITY;
ALTER TABLE carousel_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE carousel_feedback FORCE ROW LEVEL SECURITY;
ALTER TABLE writing_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE writing_personas FORCE ROW LEVEL SECURITY;
ALTER TABLE learning_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_examples FORCE ROW LEVEL SECURITY;

-- Revoke anon access
REVOKE ALL ON carousels FROM anon;
REVOKE ALL ON carousel_slides FROM anon;
REVOKE ALL ON carousel_feedback FROM anon;
REVOKE ALL ON writing_personas FROM anon;
REVOKE ALL ON learning_examples FROM anon;

-- Grant authenticated access
GRANT ALL ON carousels TO authenticated;
GRANT ALL ON carousel_slides TO authenticated;
GRANT ALL ON carousel_feedback TO authenticated;
GRANT ALL ON writing_personas TO authenticated;
GRANT ALL ON learning_examples TO authenticated;

-- ─── Policies ───────────────────────────────────────────────────────────────

-- Carousels: owner-only
CREATE POLICY "carousels_select_own" ON carousels
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "carousels_insert_own" ON carousels
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "carousels_update_own" ON carousels
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "carousels_delete_own" ON carousels
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Carousel Slides: owner via carousel
CREATE POLICY "slides_select_own" ON carousel_slides
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM carousels WHERE id = carousel_id AND user_id = auth.uid()));

CREATE POLICY "slides_insert_own" ON carousel_slides
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM carousels WHERE id = carousel_id AND user_id = auth.uid()));

CREATE POLICY "slides_update_own" ON carousel_slides
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM carousels WHERE id = carousel_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM carousels WHERE id = carousel_id AND user_id = auth.uid()));

CREATE POLICY "slides_delete_own" ON carousel_slides
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM carousels WHERE id = carousel_id AND user_id = auth.uid()));

-- Carousel Feedback: owner-only
CREATE POLICY "feedback_select_own" ON carousel_feedback
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "feedback_insert_own" ON carousel_feedback
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "feedback_update_own" ON carousel_feedback
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "feedback_delete_own" ON carousel_feedback
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Writing Personas: owner-only
CREATE POLICY "personas_select_own" ON writing_personas
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "personas_insert_own" ON writing_personas
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "personas_update_own" ON writing_personas
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "personas_delete_own" ON writing_personas
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Learning Examples: owner-only
CREATE POLICY "examples_select_own" ON learning_examples
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "examples_insert_own" ON learning_examples
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "examples_update_own" ON learning_examples
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "examples_delete_own" ON learning_examples
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─── Storage Policies ───────────────────────────────────────────────────────

-- Allow authenticated users to manage their own files
INSERT INTO storage.policies (name, bucket_id, operation, definition, check_expression)
SELECT 'carousel_assets_select', 'carousel-assets', 'SELECT',
  '(auth.uid())::text = (storage.foldername(name))[1]', NULL
WHERE NOT EXISTS (SELECT 1 FROM storage.policies WHERE name = 'carousel_assets_select');

INSERT INTO storage.policies (name, bucket_id, operation, definition, check_expression)
SELECT 'carousel_assets_insert', 'carousel-assets', 'INSERT',
  NULL, '(auth.uid())::text = (storage.foldername(name))[1]'
WHERE NOT EXISTS (SELECT 1 FROM storage.policies WHERE name = 'carousel_assets_insert');

INSERT INTO storage.policies (name, bucket_id, operation, definition, check_expression)
SELECT 'carousel_assets_update', 'carousel-assets', 'UPDATE',
  '(auth.uid())::text = (storage.foldername(name))[1]',
  '(auth.uid())::text = (storage.foldername(name))[1]'
WHERE NOT EXISTS (SELECT 1 FROM storage.policies WHERE name = 'carousel_assets_update');

INSERT INTO storage.policies (name, bucket_id, operation, definition, check_expression)
SELECT 'carousel_assets_delete', 'carousel-assets', 'DELETE',
  '(auth.uid())::text = (storage.foldername(name))[1]', NULL
WHERE NOT EXISTS (SELECT 1 FROM storage.policies WHERE name = 'carousel_assets_delete');

-- ============================================================================
-- Done! 5 tables, RLS enforced, owner-based policies, storage policies
-- ============================================================================
