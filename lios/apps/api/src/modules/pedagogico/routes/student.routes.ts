import { Router, Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/rbac.js';
import { createSupabaseClient } from '../../../lib/supabase.js';

const router = Router();

/**
 * GET /api/v1/pedagogico/students
 * List students with filters, search, and pagination.
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { token } = req as AuthenticatedRequest;
  const supabase = createSupabaseClient(token);

  const {
    search,
    class_id,
    status,
    page = '1',
    limit = '20',
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  let query = supabase
    .from('ped_students')
    .select(`
      *,
      ped_enrollments (
        id,
        class_id,
        status,
        purchase_date,
        amount_paid,
        ped_classes ( id, name, abbreviation )
      )
    `, { count: 'exact' });

  // Text search (name or email)
  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  // Filter by status
  if (status) {
    query = query.eq('status', status);
  }

  // Filter by class (via enrollment)
  if (class_id) {
    // Get student IDs enrolled in this class
    const { data: enrollments } = await supabase
      .from('ped_enrollments')
      .select('student_id')
      .eq('class_id', class_id);

    const studentIds = enrollments?.map(e => e.student_id) || [];
    if (studentIds.length === 0) {
      res.json({ data: [], total: 0, page: pageNum, limit: limitNum });
      return;
    }
    query = query.in('id', studentIds);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limitNum - 1);

  if (error) {
    res.status(500).json({ error: { message: error.message, code: 'QUERY_ERROR' } });
    return;
  }

  res.json({ data, total: count ?? 0, page: pageNum, limit: limitNum });
});

/**
 * GET /api/v1/pedagogico/students/:id
 * Get student detail with enrollments.
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { token } = req as AuthenticatedRequest;
  const supabase = createSupabaseClient(token);

  const { data, error } = await supabase
    .from('ped_students')
    .select(`
      *,
      ped_enrollments (
        *,
        ped_classes ( id, name, abbreviation, status )
      ),
      ped_contracts (
        id, status, drive_url, sent_at, created_at
      )
    `)
    .eq('id', req.params.id)
    .single();

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500;
    res.status(status).json({ error: { message: error.code === 'PGRST116' ? 'Aluno não encontrado' : error.message, code: error.code } });
    return;
  }

  res.json({ data });
});

/**
 * PATCH /api/v1/pedagogico/students/:id
 * Update student data.
 */
router.patch('/:id', requirePermission('pedagogico', 'write'), async (req: Request, res: Response): Promise<void> => {
  const { token } = req as AuthenticatedRequest;
  const supabase = createSupabaseClient(token);

  const allowedFields = ['full_name', 'email', 'phone', 'cpf', 'status', 'notes'];
  const updates: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: { message: 'Nenhum campo válido para atualizar', code: 'NO_UPDATES' } });
    return;
  }

  const { data, error } = await supabase
    .from('ped_students')
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

/**
 * DELETE /api/v1/pedagogico/students/:id
 * Soft delete (set status to inactive).
 */
router.delete('/:id', requirePermission('pedagogico', 'write'), async (req: Request, res: Response): Promise<void> => {
  const { token } = req as AuthenticatedRequest;
  const supabase = createSupabaseClient(token);

  const { error } = await supabase
    .from('ped_students')
    .update({ status: 'inactive' })
    .eq('id', req.params.id);

  if (error) {
    res.status(500).json({ error: { message: error.message, code: 'DELETE_ERROR' } });
    return;
  }

  res.json({ message: 'Aluno desativado com sucesso' });
});

export default router;
