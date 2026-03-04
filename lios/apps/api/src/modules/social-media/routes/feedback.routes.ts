import { Router, Request, Response } from 'express';
import { authMiddleware, type AuthenticatedRequest } from '../../../middleware/auth.js';
import { supabaseAdmin } from '../../../lib/supabase.js';
import { LearningService } from '../services/learning.service.js';

const router = Router();

// All feedback routes require authentication
router.use(authMiddleware);

// ─── GET /stats — Get feedback statistics for current user ────────────────────
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthenticatedRequest;

  try {
    const service = new LearningService(supabaseAdmin);
    const stats = await service.getStats(user.id);
    res.json(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[feedback/stats]', message);
    res.status(500).json({ error: { message, code: 'DB_ERROR' } });
  }
});

export default router;
