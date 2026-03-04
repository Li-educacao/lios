import { Router } from 'express';
import carouselRoutes from './routes/carousel.routes.js';
import exportRoutes from './routes/export.routes.js';
import feedbackRoutes from './routes/feedback.routes.js';
import personaRoutes from './routes/persona.routes.js';
import renderRoutes from './routes/render.routes.js';
import templateRoutes from './routes/template.routes.js';

const socialMediaRouter = Router();

socialMediaRouter.use('/carousels', carouselRoutes);
socialMediaRouter.use('/carousels', renderRoutes);
socialMediaRouter.use('/carousels', exportRoutes);
socialMediaRouter.use('/feedback', feedbackRoutes);
socialMediaRouter.use('/personas', personaRoutes);
socialMediaRouter.use('/templates', templateRoutes);

export default socialMediaRouter;
