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

// Helper: classify a message sender as support (Waldeir) or community
function isSupportSender(senderTelegramId: number | null): boolean {
  // NULL telegram_id = channel admin = Waldeir (only admin in these groups)
  // 7052154409 = Waldeir's personal account (rare)
  return senderTelegramId === null || senderTelegramId === 7052154409;
}

// Acknowledgment words — short messages matching these are not real questions
const ACK_WORDS = new Set([
  'ok', 'obrigado', 'obg', 'vlw', 'valeu', 'entendi', 'certo',
  'sim', 'não', 'top', 'show', 'boa', 'blz', 'beleza', 'tmj',
]);

// Helper: classify a message as a student question (substantive non-support message)
function isStudentQuestion(msg: { sender_telegram_id: number | null; message_text: string | null; message_type: string }): boolean {
  if (isSupportSender(msg.sender_telegram_id)) return false;
  const msgType = msg.message_type || '';
  if (['sticker', 'forward', 'poll'].includes(msgType)) return false;
  if (msgType === 'text') {
    const text = (msg.message_text || '').trim();
    if (text.length < 3) return false;
    if (ACK_WORDS.has(text.toLowerCase().replace(/[.!,]+$/, ''))) return false;
    return true;
  }
  // Photos, voice, video, documents — students send board photos, voice questions
  return ['photo', 'voice', 'video', 'document'].includes(msgType);
}

// GET /api/v1/telegram/metrics — aggregated SLA, engagement, defects, response time
// SLA/engagement/defects from analyze_responses.py (17,182 Q&A pairs, recalculated 2026-03-17)
// daily_volume computed live from tg_messages (last 14 days) split into questions vs responses
router.get('/metrics', async (req, res: Response): Promise<void> => {
  let dailyVolume: Array<{ date: string; weekday: string; total: number; support: number; community: number; questions: number; responses: number }> = [];

  try {
    const authReq = req as AuthenticatedRequest;
    const sb = createSupabaseClient(authReq.token);

    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentMsgs } = await sb
      .from('tg_messages')
      .select('sender_telegram_id, sender_name, message_text, message_type, sent_at')
      .gte('sent_at', cutoff)
      .order('sent_at')
      .limit(5000);

    const WEEKDAYS: Record<number, string> = {
      0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb',
    };

    const dayMap = new Map<string, { total: number; support: number; community: number; questions: number; responses: number }>();
    for (const msg of recentMsgs || []) {
      const d = new Date(msg.sent_at);
      const dateKey = d.toISOString().slice(0, 10);
      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, { total: 0, support: 0, community: 0, questions: 0, responses: 0 });
      }
      const entry = dayMap.get(dateKey)!;
      entry.total++;
      if (isSupportSender(msg.sender_telegram_id)) {
        entry.support++;
        entry.responses++;
      } else {
        entry.community++;
        if (isStudentQuestion(msg)) {
          entry.questions++;
        }
      }
    }

    dailyVolume = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({
        date,
        weekday: WEEKDAYS[new Date(date + 'T12:00:00Z').getUTCDay()],
        ...counts,
      }));
  } catch {
    // daily_volume fails gracefully — returns empty array
  }

  res.json({
    sla: {
      promised: '24h úteis (seg-sex)',
      // Weighted averages from both groups (Start n=9073 + Expert n=830)
      support_weekday_median_min: 31,
      support_weekend_median_min: 300,
      group_weekday_median_min: 34,
      group_weekend_median_min: 130,
      support_commercial_median_min: 32,
      group_commercial_median_min: 31,
    },
    engagement: {
      total_participants: 346,
      high: 111,
      medium: 116,
      low: 102,
      zero: 17,
    },
    top_defects: [
      { name: 'Erro de Comunicação', count: 187 },
      { name: 'Chaveador/Fonte (TNY276)', count: 133 },
      { name: 'Capacitor Defeituoso', count: 97 },
      { name: 'Micro Defeituoso', count: 49 },
      { name: 'Sensor Alterado', count: 45 },
      { name: 'Compressor Não Parte', count: 38 },
      { name: 'IPM em Curto', count: 37 },
      { name: 'Trilha Aberta/Rompida', count: 36 },
    ],
    top_brand_defects: [
      { brand: 'Samsung', count: 214 },
      { brand: 'LG', count: 178 },
      { brand: 'Midea/Springer', count: 143 },
      { brand: 'Consul/Brastemp', count: 112 },
      { brand: 'Electrolux', count: 89 },
      { brand: 'Daikin', count: 67 },
      { brand: 'Fujitsu', count: 52 },
      { brand: 'Gree', count: 41 },
    ],
    response_time: {
      support_first_pct: 71,
      group_first_pct: 29,
      total_responses: 13664,
    },
    daily_volume: dailyVolume,
  });
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
