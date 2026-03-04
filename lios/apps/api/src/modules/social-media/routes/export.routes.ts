import { Router, Request, Response } from 'express';
import archiver from 'archiver';
import { authMiddleware, type AuthenticatedRequest } from '../../../middleware/auth.js';
import { supabaseAdmin } from '../../../lib/supabase.js';

const router = Router();

router.use(authMiddleware);

// ─── GET /:id/export — Get export data (caption, hashtags, slide image URLs) ───
router.get('/:id/export', async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthenticatedRequest;
  const { id } = req.params as { id: string };

  // Fetch carousel with ownership check
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

  // Fetch slides
  const { data: slides, error: slidesError } = await supabaseAdmin
    .from('carousel_slides')
    .select('*')
    .eq('carousel_id', id)
    .order('position');

  if (slidesError) {
    console.error('[export/get]', slidesError);
    res.status(500).json({ error: { message: 'Falha ao buscar slides', code: 'DB_ERROR' } });
    return;
  }

  const carouselData = carousel as Record<string, unknown>;

  // Build suggested caption from carousel theme
  const suggestedCaption = `${carouselData['title'] as string}\n\nTema: ${carouselData['theme'] as string}\n\nCriado com Carousel Creator`;

  // Build hashtags from theme words
  const themeWords = (carouselData['theme'] as string)
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 5)
    .map((w) => `#${w.replace(/[^a-z0-9]/gi, '')}`);

  const suggestedHashtags = [...new Set([...themeWords, '#carousel', '#instagram', '#climatronico'])];

  res.json({
    carousel,
    slides: slides ?? [],
    suggested_caption: suggestedCaption,
    suggested_hashtags: suggestedHashtags,
  });
});

// ─── GET /:id/export/zip — Download all slides as ZIP ─────────────────────────
router.get('/:id/export/zip', async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthenticatedRequest;
  const { id } = req.params as { id: string };

  // Fetch carousel with ownership check
  const { data: carousel, error: carouselError } = await supabaseAdmin
    .from('carousels')
    .select('id, title, user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (carouselError || !carousel) {
    res.status(404).json({ error: { message: 'Carrossel não encontrado', code: 'NOT_FOUND' } });
    return;
  }

  // Fetch slides with image URLs
  const { data: slides, error: slidesError } = await supabaseAdmin
    .from('carousel_slides')
    .select('position, image_url')
    .eq('carousel_id', id)
    .order('position');

  if (slidesError) {
    console.error('[export/zip]', slidesError);
    res.status(500).json({ error: { message: 'Falha ao buscar slides', code: 'DB_ERROR' } });
    return;
  }

  const slidesWithImages = (slides ?? []).filter(
    (s) => s.image_url && (s.image_url as string).length > 0
  );

  if (slidesWithImages.length === 0) {
    res.status(422).json({
      error: {
        message: 'Nenhuma imagem gerada. Renderize os slides antes de exportar.',
        code: 'NO_IMAGES',
      },
    });
    return;
  }

  const carouselData = carousel as Record<string, unknown>;
  const safeTitle = (carouselData['title'] as string)
    .replace(/[^a-z0-9]/gi, '-')
    .toLowerCase()
    .slice(0, 50);

  // Set response headers for ZIP download
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}-slides.zip"`);

  const archive = archiver('zip', { zlib: { level: 6 } });

  archive.on('error', (err: Error) => {
    console.error('[export/zip] archiver error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: { message: 'Falha ao criar ZIP', code: 'ZIP_ERROR' } });
    }
  });

  archive.pipe(res);

  // Fetch each slide image and append to ZIP
  for (const slide of slidesWithImages) {
    const imageUrl = slide.image_url as string;
    const position = slide.position as number;
    const fileName = `slide-${String(position).padStart(2, '0')}.png`;

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        console.warn(`[export/zip] Failed to fetch slide ${position}: ${response.status}`);
        continue;
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      archive.append(buffer, { name: fileName });
    } catch (err) {
      console.warn(`[export/zip] Error fetching slide ${position}:`, err);
      // Non-fatal — continue with other slides
    }
  }

  await archive.finalize();
});

// ─── PATCH /:id/mark-exported — Update status to exported ─────────────────────
router.patch('/:id/mark-exported', async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthenticatedRequest;
  const { id } = req.params as { id: string };

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

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('carousels')
    .update({ status: 'exported' })
    .eq('id', id)
    .select()
    .single();

  if (updateError || !updated) {
    console.error('[export/mark-exported]', updateError);
    res.status(500).json({ error: { message: 'Falha ao atualizar status', code: 'DB_ERROR' } });
    return;
  }

  res.json({ carousel: updated });
});

export default router;
