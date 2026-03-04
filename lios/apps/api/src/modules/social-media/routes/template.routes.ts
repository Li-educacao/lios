import { Router, Request, Response } from 'express';
import { authMiddleware, type AuthenticatedRequest } from '../../../middleware/auth.js';
import { supabaseAdmin } from '../../../lib/supabase.js';

const router = Router();

// ─── GET / — List all templates ───────────────────────────────────────────────
// Public — no auth required for listing templates
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabaseAdmin
    .from('carousel_templates')
    .select('*')
    .order('is_default', { ascending: false })
    .order('name');

  if (error) {
    console.error('[templates/list]', error);
    res.status(500).json({ error: { message: 'Falha ao buscar templates', code: 'DB_ERROR' } });
    return;
  }

  res.json({ data: data ?? [] });
});

// ─── GET /:id — Get single template ──────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  const { data, error } = await supabaseAdmin
    .from('carousel_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    res.status(404).json({ error: { message: 'Template não encontrado', code: 'NOT_FOUND' } });
    return;
  }

  res.json({ template: data });
});

// ─── POST / — Create custom template (auth required) ─────────────────────────
router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthenticatedRequest;
  const { name, description, layout_config } = req.body as {
    name?: string;
    description?: string;
    layout_config?: Record<string, unknown>;
  };

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: { message: 'Campo "name" é obrigatório', code: 'VALIDATION_ERROR' } });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('carousel_templates')
    .insert({
      name: name.trim(),
      description: description?.trim() ?? '',
      layout_config: layout_config ?? {},
      is_default: false,
      created_by: user.id,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('[templates/create]', error);
    res.status(500).json({ error: { message: 'Falha ao criar template', code: 'DB_ERROR' } });
    return;
  }

  res.status(201).json({ template: data });
});

// ─── PUT /:id — Update custom template ───────────────────────────────────────
router.put('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthenticatedRequest;
  const { id } = req.params as { id: string };

  // Fetch template and verify it is non-default and owned by user
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('carousel_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    res.status(404).json({ error: { message: 'Template não encontrado', code: 'NOT_FOUND' } });
    return;
  }

  const tmpl = existing as Record<string, unknown>;

  if (tmpl['is_default'] === true) {
    res.status(403).json({ error: { message: 'Templates padrão não podem ser editados', code: 'FORBIDDEN' } });
    return;
  }

  if (tmpl['created_by'] !== user.id) {
    res.status(403).json({ error: { message: 'Sem permissão para editar este template', code: 'FORBIDDEN' } });
    return;
  }

  const { name, description, layout_config } = req.body as {
    name?: string;
    description?: string;
    layout_config?: Record<string, unknown>;
  };

  const updatePayload: Record<string, unknown> = {};
  if (name !== undefined) updatePayload['name'] = name.trim();
  if (description !== undefined) updatePayload['description'] = description.trim();
  if (layout_config !== undefined) updatePayload['layout_config'] = layout_config;

  if (Object.keys(updatePayload).length === 0) {
    res.status(400).json({ error: { message: 'Nenhum campo para atualizar', code: 'VALIDATION_ERROR' } });
    return;
  }

  const { data, error: updateError } = await supabaseAdmin
    .from('carousel_templates')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (updateError || !data) {
    console.error('[templates/update]', updateError);
    res.status(500).json({ error: { message: 'Falha ao atualizar template', code: 'DB_ERROR' } });
    return;
  }

  res.json({ template: data });
});

// ─── DELETE /:id — Delete custom template ────────────────────────────────────
router.delete('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthenticatedRequest;
  const { id } = req.params as { id: string };

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('carousel_templates')
    .select('id, is_default, created_by')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    res.status(404).json({ error: { message: 'Template não encontrado', code: 'NOT_FOUND' } });
    return;
  }

  const tmpl = existing as Record<string, unknown>;

  if (tmpl['is_default'] === true) {
    res.status(403).json({ error: { message: 'Templates padrão não podem ser excluídos', code: 'FORBIDDEN' } });
    return;
  }

  if (tmpl['created_by'] !== user.id) {
    res.status(403).json({ error: { message: 'Sem permissão para excluir este template', code: 'FORBIDDEN' } });
    return;
  }

  const { error: deleteError } = await supabaseAdmin
    .from('carousel_templates')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('[templates/delete]', deleteError);
    res.status(500).json({ error: { message: 'Falha ao excluir template', code: 'DB_ERROR' } });
    return;
  }

  res.status(204).send();
});

export default router;
