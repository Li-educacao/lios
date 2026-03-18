import { Router, Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/rbac.js';
import { createSupabaseClient } from '../../../lib/supabase.js';

const router = Router();

/**
 * GET /api/v1/pedagogico/classes
 * List all classes with student count.
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { token } = req as AuthenticatedRequest;
  const supabase = createSupabaseClient(token);

  const { status } = req.query as Record<string, string>;

  let query = supabase
    .from('ped_classes')
    .select(`
      *,
      ped_enrollments ( id, status )
    `);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    res.status(500).json({ error: { message: error.message, code: 'QUERY_ERROR' } });
    return;
  }

  // Add student_count to each class
  const enriched = data?.map(cls => {
    const enrollments = (cls as Record<string, unknown>).ped_enrollments as Array<{ status: string }> | null;
    const activeCount = enrollments?.filter(e => ['active', 'accessed'].includes(e.status)).length ?? 0;
    const totalCount = enrollments?.length ?? 0;
    const { ped_enrollments: _, ...rest } = cls as Record<string, unknown>;
    return { ...rest, student_count: activeCount, total_enrollments: totalCount };
  });

  res.json({ data: enriched });
});

/**
 * POST /api/v1/pedagogico/classes
 * Create a new class.
 */
router.post('/', requirePermission('pedagogico', 'write'), async (req: Request, res: Response): Promise<void> => {
  const { token } = req as AuthenticatedRequest;
  const supabase = createSupabaseClient(token);

  const { name, abbreviation, product_hotmart_id, product_name, start_date, end_date, status, metadata } = req.body;

  if (!name || !abbreviation) {
    res.status(400).json({ error: { message: 'Nome e sigla são obrigatórios', code: 'VALIDATION_ERROR' } });
    return;
  }

  const { data, error } = await supabase
    .from('ped_classes')
    .insert({
      name,
      abbreviation: abbreviation.toUpperCase(),
      product_hotmart_id: product_hotmart_id || null,
      product_name: product_name || null,
      start_date: start_date || null,
      end_date: end_date || null,
      status: status || 'active',
      metadata: metadata || {},
    })
    .select()
    .single();

  if (error) {
    const code = error.code === '23505' ? 'DUPLICATE_ABBREVIATION' : 'INSERT_ERROR';
    const message = error.code === '23505' ? `Sigla "${abbreviation}" já existe` : error.message;
    res.status(error.code === '23505' ? 409 : 500).json({ error: { message, code } });
    return;
  }

  res.status(201).json({ data });
});

/**
 * GET /api/v1/pedagogico/classes/:id
 * Get class detail with enrolled students.
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { token } = req as AuthenticatedRequest;
  const supabase = createSupabaseClient(token);

  const { data, error } = await supabase
    .from('ped_classes')
    .select(`
      *,
      ped_enrollments (
        id, status, purchase_date, amount_paid, enrolled_at,
        ped_students ( id, full_name, email, phone, status )
      )
    `)
    .eq('id', req.params.id)
    .single();

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500;
    res.status(status).json({ error: { message: error.code === 'PGRST116' ? 'Turma não encontrada' : error.message, code: error.code } });
    return;
  }

  res.json({ data });
});

/**
 * PATCH /api/v1/pedagogico/classes/:id
 * Update class data.
 */
router.patch('/:id', requirePermission('pedagogico', 'write'), async (req: Request, res: Response): Promise<void> => {
  const { token } = req as AuthenticatedRequest;
  const supabase = createSupabaseClient(token);

  const allowedFields = ['name', 'abbreviation', 'product_hotmart_id', 'product_name', 'start_date', 'end_date', 'status', 'metadata'];
  const updates: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  if (updates.abbreviation) {
    updates.abbreviation = (updates.abbreviation as string).toUpperCase();
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: { message: 'Nenhum campo válido para atualizar', code: 'NO_UPDATES' } });
    return;
  }

  const { data, error } = await supabase
    .from('ped_classes')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: { message: error.message, code: 'UPDATE_ERROR' } });
    return;
  }

  res.json({ data });
});

export default router;
