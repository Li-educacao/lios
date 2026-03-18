import { Router, Request, Response } from 'express';
import socialMediaRouter from '../modules/social-media/index.js';
import telegramRouter from '../modules/telegram-intelligence/routes.js';
import pedagogicoRouter from '../modules/pedagogico/index.js';
import webhookRoutes from '../modules/pedagogico/routes/webhook.routes.js';

const router = Router();

router.get('/', (_req: Request, res: Response): void => {
  res.json({ message: 'LIOS API', version: '1.0.0' });
});

// Mount social-media module at v1 (preserves existing /api/v1/carousels, /api/v1/feedback, etc.)
router.use('/v1', socialMediaRouter);

// Mount telegram intelligence module
router.use('/v1/telegram', telegramRouter);

// Mount pedagógico module (authenticated)
router.use('/v1/pedagogico', pedagogicoRouter);

// Mount webhook routes (public — validated by hottok, NOT JWT)
router.use('/v1/webhooks', webhookRoutes);

export default router;
