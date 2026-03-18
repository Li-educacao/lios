import { Router, Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../../middleware/auth.js';
import { createSupabaseClient } from '../../../lib/supabase.js';

const router = Router();

/**
 * GET /api/v1/pedagogico/webhook-logs
 * List webhook logs with filters.
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { token } = req as AuthenticatedRequest;
  const supabase = createSupabaseClient(token);

  const {
    status,
    event_type,
    page = '1',
    limit = '20',
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  let query = supabase
    .from('ped_webhook_logs')
    .select('*', { count: 'exact' });

  if (status) query = query.eq('status', status);
  if (event_type) query = query.eq('event_type', event_type);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limitNum - 1);

  if (error) {
    res.status(500).json({ error: { message: error.message, code: 'QUERY_ERROR' } });
    return;
  }

  res.json({ data, total: count ?? 0, page: pageNum, limit: limitNum });
});

export default router;
