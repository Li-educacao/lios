-- Carousel Creator - Initial Schema
-- Run via Supabase Dashboard SQL Editor
-- Project: qpfhircjexgbuolobqkf

-- gen_random_uuid() is built-in since Postgres 13 (no extension needed)

-- ============================================================
-- TABLES
-- ============================================================

-- Carousel Templates (shared across users, managed by admin)
CREATE TABLE IF NOT EXISTS carousel_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL CHECK (template_type IN ('educational', 'social_proof', 'tips_list', 'cover_cta')),
  layout_config JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Carousels (owned by users)
CREATE TABLE IF NOT EXISTS carousels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  theme TEXT,
  template_type TEXT NOT NULL CHECK (template_type IN ('educational', 'social_proof', 'tips_list', 'cover_cta')),
  template_id UUID REFERENCES carousel_templates(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'text_validated', 'images_generated', 'exported')),
  slide_count INTEGER DEFAULT 0,
  slide_format TEXT DEFAULT '1080x1080' CHECK (slide_format IN ('1080x1080', '1080x1350')),
  persona_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Carousel Slides
CREATE TABLE IF NOT EXISTS carousel_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carousel_id UUID NOT NULL REFERENCES carousels(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  headline TEXT DEFAULT '',
  body_text TEXT DEFAULT '',
  cta_text TEXT DEFAULT '',
  image_url TEXT,
  bg_color TEXT DEFAULT '#010101',
  accent_color TEXT DEFAULT '#0084C8',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(carousel_id, position)
);

-- Carousel Feedback (Learning Loop — captures user corrections)
CREATE TABLE IF NOT EXISTS carousel_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carousel_id UUID NOT NULL REFERENCES carousels(id) ON DELETE CASCADE,
  slide_position INTEGER NOT NULL,
  field TEXT NOT NULL CHECK (field IN ('headline', 'body_text', 'cta_text')),
  original_text TEXT NOT NULL,
  corrected_text TEXT NOT NULL,
  template_type TEXT,
  theme TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Writing Personas (user-specific voice/style profiles)
CREATE TABLE IF NOT EXISTS writing_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tone TEXT[] DEFAULT '{}',
  example_phrases TEXT[] DEFAULT '{}',
  words_to_use TEXT[] DEFAULT '{}',
  words_to_avoid TEXT[] DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_carousels_user_id ON carousels(user_id);
CREATE INDEX idx_carousels_status ON carousels(status);
CREATE INDEX idx_carousel_slides_carousel_id ON carousel_slides(carousel_id);
CREATE INDEX idx_carousel_feedback_carousel_id ON carousel_feedback(carousel_id);
CREATE INDEX idx_carousel_feedback_field ON carousel_feedback(field);
CREATE INDEX idx_writing_personas_user_id ON writing_personas(user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE carousel_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE carousels ENABLE ROW LEVEL SECURITY;
ALTER TABLE carousel_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE carousel_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE writing_personas ENABLE ROW LEVEL SECURITY;

-- Force RLS (even for table owners — prevents bypass)
ALTER TABLE carousel_templates FORCE ROW LEVEL SECURITY;
ALTER TABLE carousels FORCE ROW LEVEL SECURITY;
ALTER TABLE carousel_slides FORCE ROW LEVEL SECURITY;
ALTER TABLE carousel_feedback FORCE ROW LEVEL SECURITY;
ALTER TABLE writing_personas FORCE ROW LEVEL SECURITY;

-- Revoke anon access (API key alone is not enough — must be authenticated)
REVOKE ALL ON carousel_templates FROM anon;
REVOKE ALL ON carousels FROM anon;
REVOKE ALL ON carousel_slides FROM anon;
REVOKE ALL ON carousel_feedback FROM anon;
REVOKE ALL ON writing_personas FROM anon;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Templates: read-only for authenticated users (admin manages via service role)
CREATE POLICY "templates_select_authenticated" ON carousel_templates
  FOR SELECT TO authenticated USING (true);

-- Carousels: users own their own records
CREATE POLICY "carousels_select_own" ON carousels
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "carousels_insert_own" ON carousels
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "carousels_update_own" ON carousels
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "carousels_delete_own" ON carousels
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Slides: access via carousel ownership
CREATE POLICY "slides_select_own" ON carousel_slides
  FOR SELECT TO authenticated USING (
    carousel_id IN (SELECT id FROM carousels WHERE user_id = auth.uid())
  );
CREATE POLICY "slides_insert_own" ON carousel_slides
  FOR INSERT TO authenticated WITH CHECK (
    carousel_id IN (SELECT id FROM carousels WHERE user_id = auth.uid())
  );
CREATE POLICY "slides_update_own" ON carousel_slides
  FOR UPDATE TO authenticated USING (
    carousel_id IN (SELECT id FROM carousels WHERE user_id = auth.uid())
  );
CREATE POLICY "slides_delete_own" ON carousel_slides
  FOR DELETE TO authenticated USING (
    carousel_id IN (SELECT id FROM carousels WHERE user_id = auth.uid())
  );

-- Feedback: access via carousel ownership
CREATE POLICY "feedback_select_own" ON carousel_feedback
  FOR SELECT TO authenticated USING (
    carousel_id IN (SELECT id FROM carousels WHERE user_id = auth.uid())
  );
CREATE POLICY "feedback_insert_own" ON carousel_feedback
  FOR INSERT TO authenticated WITH CHECK (
    carousel_id IN (SELECT id FROM carousels WHERE user_id = auth.uid())
  );

-- Writing Personas: users own their own personas
CREATE POLICY "personas_select_own" ON writing_personas
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "personas_insert_own" ON writing_personas
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "personas_update_own" ON writing_personas
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "personas_delete_own" ON writing_personas
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- TRIGGERS: updated_at auto-update
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_carousels_updated_at
  BEFORE UPDATE ON carousels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_carousel_slides_updated_at
  BEFORE UPDATE ON carousel_slides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_carousel_templates_updated_at
  BEFORE UPDATE ON carousel_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_writing_personas_updated_at
  BEFORE UPDATE ON writing_personas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SEED: Default Templates
-- ============================================================

INSERT INTO carousel_templates (name, description, template_type, layout_config, is_default) VALUES
(
  'Educacional',
  'Carrossel educacional com passo a passo técnico',
  'educational',
  '{
    "slides": [
      {"type": "cover", "headline": {"x": 60, "y": 200, "w": 960, "h": 200, "fontSize": 72, "font": "heading", "color": "#FFFFFF", "align": "left"}, "body": {"x": 60, "y": 450, "w": 960, "h": 300, "fontSize": 32, "font": "body", "color": "#76777A", "align": "left"}, "bg": "#010101", "accent": "#0084C8"},
      {"type": "content", "headline": {"x": 60, "y": 80, "w": 960, "h": 120, "fontSize": 48, "font": "subtitle", "color": "#0084C8", "align": "left"}, "body": {"x": 60, "y": 240, "w": 960, "h": 600, "fontSize": 28, "font": "body", "color": "#FFFFFF", "align": "left"}, "imageArea": {"x": 60, "y": 860, "w": 960, "h": 160}, "bg": "#010101"},
      {"type": "cta", "headline": {"x": 60, "y": 300, "w": 960, "h": 200, "fontSize": 56, "font": "heading", "color": "#FFFFFF", "align": "center"}, "cta": {"x": 260, "y": 600, "w": 560, "h": 80, "fontSize": 32, "font": "subtitle", "color": "#FFFFFF", "bg": "#0084C8", "align": "center"}, "bg": "#010101"}
    ]
  }',
  true
),
(
  'Prova Social',
  'Carrossel com resultados e depoimentos de alunos',
  'social_proof',
  '{
    "slides": [
      {"type": "cover", "headline": {"x": 60, "y": 150, "w": 960, "h": 300, "fontSize": 64, "font": "heading", "color": "#FFFFFF", "align": "center"}, "body": {"x": 60, "y": 500, "w": 960, "h": 200, "fontSize": 28, "font": "body", "color": "#76777A", "align": "center"}, "bg": "#010101", "accent": "#0084C8"},
      {"type": "testimonial", "headline": {"x": 60, "y": 60, "w": 960, "h": 100, "fontSize": 36, "font": "subtitle", "color": "#0084C8", "align": "left"}, "imageArea": {"x": 60, "y": 180, "w": 960, "h": 600}, "body": {"x": 60, "y": 800, "w": 960, "h": 200, "fontSize": 24, "font": "body", "color": "#FFFFFF", "align": "left"}, "bg": "#010101"},
      {"type": "cta", "headline": {"x": 60, "y": 300, "w": 960, "h": 200, "fontSize": 56, "font": "heading", "color": "#FFFFFF", "align": "center"}, "cta": {"x": 260, "y": 600, "w": 560, "h": 80, "fontSize": 32, "font": "subtitle", "color": "#FFFFFF", "bg": "#0084C8", "align": "center"}, "bg": "#010101"}
    ]
  }',
  true
),
(
  'Lista de Dicas',
  'Carrossel com dicas numeradas',
  'tips_list',
  '{
    "slides": [
      {"type": "cover", "headline": {"x": 60, "y": 250, "w": 960, "h": 250, "fontSize": 72, "font": "heading", "color": "#FFFFFF", "align": "center"}, "body": {"x": 60, "y": 550, "w": 960, "h": 150, "fontSize": 28, "font": "body", "color": "#76777A", "align": "center"}, "bg": "#010101", "accent": "#0084C8"},
      {"type": "tip", "number": {"x": 60, "y": 60, "w": 200, "h": 200, "fontSize": 120, "font": "heading", "color": "#0084C8", "align": "left"}, "headline": {"x": 280, "y": 80, "w": 740, "h": 120, "fontSize": 40, "font": "subtitle", "color": "#FFFFFF", "align": "left"}, "body": {"x": 60, "y": 300, "w": 960, "h": 500, "fontSize": 26, "font": "body", "color": "#FFFFFF", "align": "left"}, "bg": "#010101"},
      {"type": "cta", "headline": {"x": 60, "y": 300, "w": 960, "h": 200, "fontSize": 56, "font": "heading", "color": "#FFFFFF", "align": "center"}, "cta": {"x": 260, "y": 600, "w": 560, "h": 80, "fontSize": 32, "font": "subtitle", "color": "#FFFFFF", "bg": "#0084C8", "align": "center"}, "bg": "#010101"}
    ]
  }',
  true
),
(
  'Capa/CTA',
  'Slide único com chamada chamativa',
  'cover_cta',
  '{
    "slides": [
      {"type": "fullscreen", "headline": {"x": 60, "y": 200, "w": 960, "h": 400, "fontSize": 80, "font": "heading", "color": "#FFFFFF", "align": "center"}, "cta": {"x": 200, "y": 700, "w": 680, "h": 100, "fontSize": 36, "font": "subtitle", "color": "#FFFFFF", "bg": "#0084C8", "align": "center"}, "bg": "#010101", "gradient": "linear-gradient(180deg, #0E4C93 0%, #010101 100%)"}
    ]
  }',
  true
);

-- ============================================================
-- SEED: Default Writing Persona (run AFTER creating your user)
-- Replace USER_ID with the actual UUID from auth.users
-- ============================================================

-- INSERT INTO writing_personas (user_id, name, tone, example_phrases, words_to_use, words_to_avoid, is_default) VALUES
-- (
--   'USER_ID',
--   'Tom Climatrônico',
--   ARRAY['direto', 'motivacional', 'técnico', 'acessível'],
--   ARRAY[
--     'E minha pergunta é: Porque você também não conseguiria?',
--     'Para mais conteúdos, basta me seguir',
--     'Já salva esse vídeo quando for precisar'
--   ],
--   ARRAY['climatrônico', 'renda extra', 'placa eletrônica', 'reparo', 'faturar'],
--   ARRAY['grátis', 'promoção', 'limitado'],
--   true
-- );
