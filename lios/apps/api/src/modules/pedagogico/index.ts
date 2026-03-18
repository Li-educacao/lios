import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';

const pedagogicoRouter = Router();

// All pedagogico routes require authentication + pedagogico:read permission
pedagogicoRouter.use(authMiddleware);
pedagogicoRouter.use(requirePermission('pedagogico', 'read'));

// Routes will be added in Story 1.3 (Student CRUD & Class Management)
// pedagogicoRouter.use('/students', studentRoutes);
// pedagogicoRouter.use('/classes', classRoutes);
// pedagogicoRouter.use('/enrollments', enrollmentRoutes);

export default pedagogicoRouter;
