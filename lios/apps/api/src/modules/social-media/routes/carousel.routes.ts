import { Router, Request, Response } from 'express';
import { authMiddleware, type AuthenticatedRequest } from '../../../middleware/auth.js';
import { supabaseAdmin } from '../../../lib/supabase.js';
import { getGeminiService, type WritingPersona } from '../services/gemini.service.js';
import { LearningService } from '../services/learning.service.js';

const router = Router();

// All carousel routes require authentication
router.use(authMiddleware);

// ─── POST /generate-text ──────────────────────────────────────────────────────
// Generate carousel text via Gemini and save as draft
router.post('/generate-text', async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthenticatedRequest;
  const { theme, templateType, slideCount, personaId } = req.body as {
    theme?: string;
    templateType?: string;
    slideCount?: unknown;
    personaId?: string;
  };

  // Validate required fields
  if (!theme || typeof theme !== 'string' || theme.trim().length === 0) {
    res.status(400).json({ error: { message: 'Campo "theme" é obrigatório', code: 'VALIDATION_ERROR' } });
    return;
  }
  if (!templateType || typeof templateType !== 'string') {
    res.status(400).json({ error: { message: 'Campo "templateType" é obrigatório', code: 'VALIDATION_ERROR' } });
    return;
  }

  const validTemplates = ['educational', 'social_proof', 'tips_list', 'cover_cta'];
  if (!validTemplates.includes(templateType)) {
    res.status(400).json({ error: { message: `templateType inválido. Use: ${validTemplates.join(', ')}`, code: 'VALIDATION_ERROR' } });
    return;
  }

  const count = Number(slideCount);
  if (!Number.isInteger(count) || count < 3 || count > 10) {
    res.status(400).json({ error: { message: 'slideCount deve ser um número inteiro entre 3 e 10', code: 'VALIDATION_ERROR' } });
    return;
  }

  // Optionally fetch full persona for enriched context
  let personaData: WritingPersona | null = null;
  if (personaId) {
    const { data: persona } = await supabaseAdmin
      .from('writing_personas')
      .select('name, tone, example_phrases, words_to_use, words_to_avoid')
      .eq('id', personaId)
      .eq('user_id', user.id)
      .single();

    if (persona) {
      personaData = {
        name: persona.name as string,
        tone: persona.tone as string[] | undefined,
        example_phrases: persona.example_phrases as string[] | undefined,
        words_to_use: persona.words_to_use as string[] | undefined,
        words_to_avoid: persona.words_to_avoid as string[] | undefined,
      };
    }
  }

  // Optionally fetch learning examples (non-fatal if fails)
  let learningExamples: string | undefined;
  try {
    const learningService = new LearningService(supabaseAdmin);
    const isActive = await learningService.isLearningActive(user.id);
    if (isActive) {
      const examples = await learningService.getRelevantExamples(user.id, templateType, theme.trim());
      if (examples.length > 0) {
        learningExamples = learningService.buildFewShotExamples(examples);
        console.log(`[carousel/generate-text] Learning active — ${examples.length} examples injected`);
      }
    }
  } catch (err) {
    console.error('[carousel/generate-text] Learning service error (non-fatal):', err);
  }

  // Generate text via Gemini
  const gemini = getGeminiService();
  let generated;
  try {
    generated = await gemini.generateCarouselText({
      theme: theme.trim(),
      templateType,
      slideCount: count,
      persona: personaData,
      learningExamples,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[carousel/generate-text] Gemini error:', message);
    res.status(502).json({ error: { message: 'Falha ao gerar texto com IA. Tente novamente.', code: 'AI_ERROR' } });
    return;
  }

  // Persist carousel record
  const { data: carousel, error: carouselError } = await supabaseAdmin
    .from('carousels')
    .insert({
      user_id: user.id,
      title: generated.title,
      theme: theme.trim(),
      template_type: templateType,
      status: 'draft',
      slide_count: count,
      persona_id: personaId ?? null,
    })
    .select()
    .single();

  if (carouselError || !carousel) {
    console.error('[carousel/generate-text] DB insert carousel error:', carouselError);
    res.status(500).json({ error: { message: 'Falha ao salvar carrossel', code: 'DB_ERROR' } });
    return;
  }

  // Persist slides
  const slidesPayload = generated.slides.map((slide) => ({
    carousel_id: carousel.id,
    position: slide.position,
    headline: slide.headline ?? '',
    body_text: slide.body_text ?? '',
    cta_text: slide.cta_text ?? '',
  }));

  const { error: slidesError } = await supabaseAdmin
    .from('carousel_slides')
    .insert(slidesPayload);

  if (slidesError) {
    // Cleanup orphaned carousel
    await supabaseAdmin.from('carousels').delete().eq('id', carousel.id);
    console.error('[carousel/generate-text] DB insert slides error:', slidesError);
    res.status(500).json({ error: { message: 'Falha ao salvar slides', code: 'DB_ERROR' } });
    return;
  }

  // Fetch freshly inserted slides
  const { data: slides } = await supabaseAdmin
    .from('carousel_slides')
    .select('*')
    .eq('carousel_id', carousel.id)
    .order('position');

  res.status(201).json({
    carousel,
    slides: slides ?? [],
    generated_meta: {
      suggested_hashtags: generated.suggested_hashtags,
      suggested_caption: generated.suggested_caption,
    },
  });
});

// ─── GET / — List user's carousels ───────────────────────────────────────────
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthenticatedRequest;
  const page = Math.max(1, Number(req.query['page']) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query['limit']) || 10));
  const status = req.query['status'] as string | undefined;
  const search = req.query['search'] as string | undefined;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('carousels')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const validStatuses = ['draft', 'text_validated', 'images_generated', 'exported'];
  if (status && validStatuses.includes(status)) {
    query = query.eq('status', status);
  }

  if (search && search.trim().length > 0) {
    // Search by title or theme (case-insensitive)
    query = query.or(`title.ilike.%${search.trim()}%,theme.ilike.%${search.trim()}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[carousels/list]', error);
    res.status(500).json({ error: { message: 'Falha ao buscar carrosséis', code: 'DB_ERROR' } });
    return;
  }

  res.json({
    data: data ?? [],
    pagination: {
      page,
      limit,
      total: count ?? 0,
      pages: Math.ceil((count ?? 0) / limit),
    },
  });
});

// ─── GET /:id — Get carousel with slides ─────────────────────────────────────
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthenticatedRequest;
  const { id } = req.params as { id: string };

  const { data: carousel, error: carouselError } = await supabaseAdmin
    .from('carousels')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (carouselError || !carousel) {
    res.status(404).json({ error: { message: 'Carrossel não encontrado', code: 'NOT_FOUND' } });
    return;
  }

  const { data: slides, error: slidesError } = await supabaseAdmin
    .from('carousel_slides')
    .select('*')
    .eq('carousel_id', id)
    .order('position');

  if (slidesError) {
    console.error('[carousels/get]', slidesError);
    res.status(500).json({ error: { message: 'Falha ao buscar slides', code: 'DB_ERROR' } });
    return;
  }

  res.json({ carousel, slides: slides ?? [] });
});

// ─── PATCH /:id/slides/:position — Update slide text ─────────────────────────
router.patch('/:id/slides/:position', async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthenticatedRequest;
  const { id, position } = req.params as { id: string; position: string };
  const slidePosition = Number(position);

  if (!Number.isInteger(slidePosition) || slidePosition < 1) {
    res.status(400).json({ error: { message: 'Posição de slide inválida', code: 'VALIDATION_ERROR' } });
    return;
  }

  const { headline, body_text, cta_text } = req.body as {
    headline?: string;
    body_text?: string;
    cta_text?: string;
  };

  // Verify ownership
  const { data: carousel, error: ownershipError } = await supabaseAdmin
    .from('carousels')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (ownershipError || !carousel) {
    res.status(404).json({ error: { message: 'Carrossel não encontrado', code: 'NOT_FOUND' } });
    return;
  }

  // Fetch current slide to compare for feedback
  const { data: currentSlide, error: fetchError } = await supabaseAdmin
    .from('carousel_slides')
    .select('*')
    .eq('carousel_id', id)
    .eq('position', slidePosition)
    .single();

  if (fetchError || !currentSlide) {
    res.status(404).json({ error: { message: 'Slide não encontrado', code: 'NOT_FOUND' } });
    return;
  }

  // Build update payload (only provided fields)
  const updatePayload: Record<string, string> = {};
  if (headline !== undefined) updatePayload['headline'] = headline;
  if (body_text !== undefined) updatePayload['body_text'] = body_text;
  if (cta_text !== undefined) updatePayload['cta_text'] = cta_text;

  if (Object.keys(updatePayload).length === 0) {
    res.status(400).json({ error: { message: 'Nenhum campo para atualizar', code: 'VALIDATION_ERROR' } });
    return;
  }

  const { data: updatedSlide, error: updateError } = await supabaseAdmin
    .from('carousel_slides')
    .update(updatePayload)
    .eq('carousel_id', id)
    .eq('position', slidePosition)
    .select()
    .single();

  if (updateError || !updatedSlide) {
    console.error('[carousels/update-slide]', updateError);
    res.status(500).json({ error: { message: 'Falha ao atualizar slide', code: 'DB_ERROR' } });
    return;
  }

  // Save feedback for changed fields (learning loop)
  const feedbackEntries: Array<{
    carousel_id: string;
    slide_position: number;
    field: string;
    original_text: string;
    corrected_text: string;
  }> = [];

  const fieldsToCheck: Array<'headline' | 'body_text' | 'cta_text'> = ['headline', 'body_text', 'cta_text'];
  for (const field of fieldsToCheck) {
    const newValue = updatePayload[field];
    if (newValue !== undefined && newValue !== (currentSlide[field] as string)) {
      feedbackEntries.push({
        carousel_id: id,
        slide_position: slidePosition,
        field,
        original_text: (currentSlide[field] as string) ?? '',
        corrected_text: newValue,
      });
    }
  }

  if (feedbackEntries.length > 0) {
    const { error: feedbackError } = await supabaseAdmin
      .from('carousel_feedback')
      .insert(feedbackEntries);

    if (feedbackError) {
      console.error('[carousels/update-slide] feedback insert error:', feedbackError);
      // Non-fatal — slide update already succeeded
    }
  }

  res.json({ slide: updatedSlide });
});

// ─── PATCH /:id/validate — Mark as text_validated ────────────────────────────
router.patch('/:id/validate', async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthenticatedRequest;
  const { id } = req.params as { id: string };

  // Verify ownership
  const { data: carousel, error: ownershipError } = await supabaseAdmin
    .from('carousels')
    .select('id, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (ownershipError || !carousel) {
    res.status(404).json({ error: { message: 'Carrossel não encontrado', code: 'NOT_FOUND' } });
    return;
  }

  // Verify all slides have headlines (business rule)
  const { data: slides, error: slidesError } = await supabaseAdmin
    .from('carousel_slides')
    .select('position, headline')
    .eq('carousel_id', id);

  if (slidesError) {
    res.status(500).json({ error: { message: 'Falha ao verificar slides', code: 'DB_ERROR' } });
    return;
  }

  const emptySlides = (slides ?? []).filter((s) => !s.headline || (s.headline as string).trim().length === 0);
  if (emptySlides.length > 0) {
    const positions = emptySlides.map((s) => s.position).join(', ');
    res.status(422).json({
      error: {
        message: `Slides sem headline: posições ${positions}. Preencha todos antes de validar.`,
        code: 'VALIDATION_FAILED',
        empty_positions: emptySlides.map((s) => s.position),
      },
    });
    return;
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('carousels')
    .update({ status: 'text_validated' })
    .eq('id', id)
    .select()
    .single();

  if (updateError || !updated) {
    console.error('[carousels/validate]', updateError);
    res.status(500).json({ error: { message: 'Falha ao validar carrossel', code: 'DB_ERROR' } });
    return;
  }

  res.json({ carousel: updated });
});

// ─── DELETE /:id ──────────────────────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthenticatedRequest;
  const { id } = req.params as { id: string };

  const { error } = await supabaseAdmin
    .from('carousels')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('[carousels/delete]', error);
    res.status(500).json({ error: { message: 'Falha ao excluir carrossel', code: 'DB_ERROR' } });
    return;
  }

  res.status(204).send();
});

// ─── POST /:id/duplicate — Clone a carousel (status=draft, no images) ─────────
router.post('/:id/duplicate', async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthenticatedRequest;
  const { id } = req.params as { id: string };

  // Fetch original carousel + verify ownership
  const { data: original, error: fetchError } = await supabaseAdmin
    .from('carousels')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !original) {
    res.status(404).json({ error: { message: 'Carrossel não encontrado', code: 'NOT_FOUND' } });
    return;
  }

  // Create new carousel record
  const { data: newCarousel, error: createError } = await supabaseAdmin
    .from('carousels')
    .insert({
      user_id: user.id,
      title: `${(original as Record<string, unknown>)['title'] as string} (cópia)`,
      theme: (original as Record<string, unknown>)['theme'] as string,
      template_type: (original as Record<string, unknown>)['template_type'] as string,
      status: 'draft',
      slide_count: (original as Record<string, unknown>)['slide_count'] as number,
      persona_id: (original as Record<string, unknown>)['persona_id'] ?? null,
    })
    .select()
    .single();

  if (createError || !newCarousel) {
    console.error('[carousels/duplicate] create error:', createError);
    res.status(500).json({ error: { message: 'Falha ao duplicar carrossel', code: 'DB_ERROR' } });
    return;
  }

  // Fetch original slides
  const { data: originalSlides, error: slidesError } = await supabaseAdmin
    .from('carousel_slides')
    .select('position, headline, body_text, cta_text')
    .eq('carousel_id', id)
    .order('position');

  if (slidesError) {
    console.error('[carousels/duplicate] slides fetch error:', slidesError);
    // Rollback new carousel
    await supabaseAdmin.from('carousels').delete().eq('id', (newCarousel as Record<string, unknown>)['id'] as string);
    res.status(500).json({ error: { message: 'Falha ao buscar slides do original', code: 'DB_ERROR' } });
    return;
  }

  // Insert cloned slides (no image_url — status is draft)
  if (originalSlides && originalSlides.length > 0) {
    const clonedSlides = originalSlides.map((s) => ({
      carousel_id: (newCarousel as Record<string, unknown>)['id'] as string,
      position: s.position as number,
      headline: s.headline as string ?? '',
      body_text: s.body_text as string ?? '',
      cta_text: s.cta_text as string ?? '',
    }));

    const { error: insertSlidesError } = await supabaseAdmin
      .from('carousel_slides')
      .insert(clonedSlides);

    if (insertSlidesError) {
      console.error('[carousels/duplicate] insert slides error:', insertSlidesError);
      await supabaseAdmin.from('carousels').delete().eq('id', (newCarousel as Record<string, unknown>)['id'] as string);
      res.status(500).json({ error: { message: 'Falha ao clonar slides', code: 'DB_ERROR' } });
      return;
    }
  }

  res.status(201).json({ carousel: newCarousel });
});

export default router;
