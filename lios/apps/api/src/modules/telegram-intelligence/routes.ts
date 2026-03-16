import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.js';
import { createSupabaseClient } from '../../lib/supabase.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/v1/telegram/groups
router.get('/groups', async (req, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const sb = createSupabaseClient(authReq.token);

  const { data, error } = await sb
    .from('tg_groups')
    .select('*')
    .order('name');

  if (error) {
    res.status(500).json({ error: { message: error.message, code: 'DB_ERROR' } });
    return;
  }

  res.json({ data: data || [], total: data?.length || 0 });
});

// GET /api/v1/telegram/groups/:id
router.get('/groups/:id', async (req, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const sb = createSupabaseClient(authReq.token);

  const { data, error } = await sb
    .from('tg_groups')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error) {
    res.status(404).json({ error: { message: 'Grupo não encontrado', code: 'NOT_FOUND' } });
    return;
  }

  res.json(data);
});

// GET /api/v1/telegram/groups/:id/summaries
router.get('/groups/:id/summaries', async (req, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const sb = createSupabaseClient(authReq.token);

  const { data, error } = await sb
    .from('tg_summaries')
    .select('*')
    .eq('group_id', req.params.id)
    .order('period_end', { ascending: false });

  if (error) {
    res.status(500).json({ error: { message: error.message, code: 'DB_ERROR' } });
    return;
  }

  res.json({ data: data || [] });
});

// GET /api/v1/telegram/groups/:id/members
router.get('/groups/:id/members', async (req, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const sb = createSupabaseClient(authReq.token);

  const { data, error } = await sb
    .from('tg_notable_members')
    .select('*')
    .eq('group_id', req.params.id)
    .order('substantive_count', { ascending: false });

  if (error) {
    res.status(500).json({ error: { message: error.message, code: 'DB_ERROR' } });
    return;
  }

  res.json({ data: data || [] });
});

// GET /api/v1/telegram/insights
router.get('/insights', async (req, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const sb = createSupabaseClient(authReq.token);

  let query = sb
    .from('tg_insights')
    .select('*')
    .order('relevance_score', { ascending: false })
    .order('created_at', { ascending: false });

  const { group_id, category, limit, offset } = req.query;

  if (group_id && typeof group_id === 'string') {
    query = query.eq('group_id', group_id);
  }

  if (category && typeof category === 'string') {
    query = query.eq('category', category);
  }

  if (limit && typeof limit === 'string') {
    query = query.limit(parseInt(limit, 10));
  }

  if (offset && typeof offset === 'string') {
    query = query.range(parseInt(offset, 10), parseInt(offset, 10) + parseInt((limit as string) || '20', 10) - 1);
  }

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ error: { message: error.message, code: 'DB_ERROR' } });
    return;
  }

  res.json({ data: data || [], total: data?.length || 0 });
});

// GET /api/v1/telegram/stats
router.get('/stats', async (req, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const sb = createSupabaseClient(authReq.token);

  const [groupsRes, messagesRes, insightsRes, lastAnalysis] = await Promise.all([
    sb.from('tg_groups').select('id', { count: 'exact', head: true }).eq('is_active', true),
    sb.from('tg_messages').select('id', { count: 'exact', head: true }),
    sb.from('tg_insights').select('id', { count: 'exact', head: true }),
    sb.from('tg_summaries').select('created_at').order('created_at', { ascending: false }).limit(1),
  ]);

  res.json({
    total_groups: groupsRes.count || 0,
    total_messages: messagesRes.count || 0,
    total_insights: insightsRes.count || 0,
    last_analysis: lastAnalysis.data?.[0]?.created_at || null,
  });
});

export default router;
