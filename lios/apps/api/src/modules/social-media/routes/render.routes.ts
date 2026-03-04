import { Router, Request, Response } from 'express';
import { authMiddleware, type AuthenticatedRequest } from '../../../middleware/auth.js';
import { supabaseAdmin } from '../../../lib/supabase.js';
import { renderCarouselById, renderSingleSlide } from '../services/renderer.service.js';

const router = Router();

router.use(authMiddleware);

// ─── POST /:id/render — Render all slides ─────────────────────────────────────
router.post('/:id/render', async (req: Request, res: Response): Promise<void> => {
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

  let images: { position: number; url: string }[];
  try {
    images = await renderCarouselById(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao renderizar';
    console.error('[render/all] Error:', message);
    res.status(500).json({ error: { message, code: 'RENDER_ERROR' } });
    return;
  }

  res.json({ images });
});

// ─── POST /:id/slides/:position/render — Re-render single slide ───────────────
router.post('/:id/slides/:position/render', async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthenticatedRequest;
  const { id, position } = req.params as { id: string; position: string };
  const slidePosition = Number(position);

  if (!Number.isInteger(slidePosition) || slidePosition < 1) {
    res.status(400).json({ error: { message: 'Posição de slide inválida', code: 'VALIDATION_ERROR' } });
    return;
  }

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

  let result: { position: number; url: string };
  try {
    result = await renderSingleSlide(id, slidePosition);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao renderizar slide';
    console.error(`[render/slide] Error position ${slidePosition}:`, message);
    res.status(500).json({ error: { message, code: 'RENDER_ERROR' } });
    return;
  }

  res.json(result);
});

export default router;
