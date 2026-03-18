import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import studentRoutes from './routes/student.routes.js';
import classRoutes from './routes/class.routes.js';
import enrollmentRoutes from './routes/enrollment.routes.js';
import webhookLogRoutes from './routes/webhook-log.routes.js';

const pedagogicoRouter = Router();

// All pedagogico routes require authentication + pedagogico:read permission
pedagogicoRouter.use(authMiddleware);
pedagogicoRouter.use(requirePermission('pedagogico', 'read'));

// Mount sub-routes
pedagogicoRouter.use('/students', studentRoutes);
pedagogicoRouter.use('/classes', classRoutes);
pedagogicoRouter.use('/enrollments', enrollmentRoutes);
pedagogicoRouter.use('/webhook-logs', webhookLogRoutes);

export default pedagogicoRouter;
