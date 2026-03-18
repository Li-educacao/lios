import { Router, Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../../middleware/auth.js';
import { createSupabaseClient } from '../../../lib/supabase.js';

const router = Router();

/**
 * GET /api/v1/pedagogico/enrollments
 * List enrollments with optional filters (student_id, class_id).
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { token } = req as AuthenticatedRequest;
  const supabase = createSupabaseClient(token);

  const { student_id, class_id, status } = req.query as Record<string, string>;

  let query = supabase
    .from('ped_enrollments')
    .select(`
      *,
      ped_students ( id, full_name, email ),
      ped_classes ( id, name, abbreviation )
    `);

  if (student_id) query = query.eq('student_id', student_id);
  if (class_id) query = query.eq('class_id', class_id);
  if (status) query = query.eq('status', status);

  const { data, error } = await query.order('enrolled_at', { ascending: false });

  if (error) {
    res.status(500).json({ error: { message: error.message, code: 'QUERY_ERROR' } });
    return;
  }

  res.json({ data });
});

export default router;
