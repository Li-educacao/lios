import { Router, Request, Response } from 'express';
import { authMiddleware, type AuthenticatedRequest } from '../../../middleware/auth.js';
import { supabaseAdmin } from '../../../lib/supabase.js';

const router = Router();

// All persona routes require authentication
router.use(authMiddleware);

// ─── GET / — List user's personas ────────────────────────────────────────────
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthenticatedRequest;

  const { data, error } = await supabaseAdmin
    .from('writing_personas')
    .select('*')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[personas/list]', error);
    res.status(500).json({ error: { message: 'Falha ao buscar personas', code: 'DB_ERROR' } });
    return;
  }

  res.json({ data: data ?? [] });
});

// ─── GET /:id — Get single persona ───────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthenticatedRequest;
  const { id } = req.params as { id: string };

  const { data, error } = await supabaseAdmin
    .from('writing_personas')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    res.status(404).json({ error: { message: 'Persona não encontrada', code: 'NOT_FOUND' } });
    return;
  }

  res.json({ persona: data });
});

// ─── POST / — Create persona ──────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthenticatedRequest;
  const { name, tone, example_phrases, words_to_use, words_to_avoid, is_default } = req.body as {
    name?: string;
    tone?: string[];
    example_phrases?: string[];
    words_to_use?: string[];
    words_to_avoid?: string[];
    is_default?: boolean;
  };

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: { message: 'Campo "name" é obrigatório', code: 'VALIDATION_ERROR' } });
    return;
  }

  // If is_default, unset current default first
  if (is_default) {
    const { error: unsetError } = await supabaseAdmin
      .from('writing_personas')
      .update({ is_default: false })
      .eq('user_id', user.id)
      .eq('is_default', true);

    if (unsetError) {
      console.error('[personas/create] unset default error:', unsetError);
      res.status(500).json({ error: { message: 'Falha ao atualizar persona padrão', code: 'DB_ERROR' } });
      return;
    }
  }

  const { data, error } = await supabaseAdmin
    .from('writing_personas')
    .insert({
      user_id: user.id,
      name: name.trim(),
      tone: Array.isArray(tone) ? tone : [],
      example_phrases: Array.isArray(example_phrases) ? example_phrases : [],
      words_to_use: Array.isArray(words_to_use) ? words_to_use : [],
      words_to_avoid: Array.isArray(words_to_avoid) ? words_to_avoid : [],
      is_default: is_default ?? false,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('[personas/create]', error);
    res.status(500).json({ error: { message: 'Falha ao criar persona', code: 'DB_ERROR' } });
    return;
  }

  res.status(201).json({ persona: data });
});

// ─── PUT /:id — Update persona ────────────────────────────────────────────────
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthenticatedRequest;
  const { id } = req.params as { id: string };
  const { name, tone, example_phrases, words_to_use, words_to_avoid, is_default } = req.body as {
    name?: string;
    tone?: string[];
    example_phrases?: string[];
    words_to_use?: string[];
    words_to_avoid?: string[];
    is_default?: boolean;
  };

  // Verify ownership
  const { data: existing, error: ownershipError } = await supabaseAdmin
    .from('writing_personas')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (ownershipError || !existing) {
    res.status(404).json({ error: { message: 'Persona não encontrada', code: 'NOT_FOUND' } });
    return;
  }

  // If setting as default, unset current default first
  if (is_default) {
    const { error: unsetError } = await supabaseAdmin
      .from('writing_personas')
      .update({ is_default: false })
      .eq('user_id', user.id)
      .eq('is_default', true)
      .neq('id', id);

    if (unsetError) {
      console.error('[personas/update] unset default error:', unsetError);
      res.status(500).json({ error: { message: 'Falha ao atualizar persona padrão', code: 'DB_ERROR' } });
      return;
    }
  }

  // Build update payload
  const updatePayload: Record<string, unknown> = {};
  if (name !== undefined) updatePayload['name'] = name.trim();
  if (tone !== undefined) updatePayload['tone'] = Array.isArray(tone) ? tone : [];
  if (example_phrases !== undefined) updatePayload['example_phrases'] = Array.isArray(example_phrases) ? example_phrases : [];
  if (words_to_use !== undefined) updatePayload['words_to_use'] = Array.isArray(words_to_use) ? words_to_use : [];
  if (words_to_avoid !== undefined) updatePayload['words_to_avoid'] = Array.isArray(words_to_avoid) ? words_to_avoid : [];
  if (is_default !== undefined) updatePayload['is_default'] = is_default;

  if (Object.keys(updatePayload).length === 0) {
    res.status(400).json({ error: { message: 'Nenhum campo para atualizar', code: 'VALIDATION_ERROR' } });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('writing_personas')
    .update(updatePayload)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !data) {
    console.error('[personas/update]', error);
    res.status(500).json({ error: { message: 'Falha ao atualizar persona', code: 'DB_ERROR' } });
    return;
  }

  res.json({ persona: data });
});

// ─── DELETE /:id — Delete persona ─────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthenticatedRequest;
  const { id } = req.params as { id: string };

  const { error } = await supabaseAdmin
    .from('writing_personas')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('[personas/delete]', error);
    res.status(500).json({ error: { message: 'Falha ao excluir persona', code: 'DB_ERROR' } });
    return;
  }

  res.status(204).send();
});

export default router;
