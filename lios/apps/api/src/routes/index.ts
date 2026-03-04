import { Router, Request, Response } from 'express';
import socialMediaRouter from '../modules/social-media/index.js';

const router = Router();

router.get('/', (_req: Request, res: Response): void => {
  res.json({ message: 'LIOS API', version: '1.0.0' });
});

// Mount social-media module at v1 (preserves existing /api/v1/carousels, /api/v1/feedback, etc.)
router.use('/v1', socialMediaRouter);

export default router;
