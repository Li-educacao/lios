import express, { Request, Response, NextFunction } from 'express';
import { config } from './config.js';
import { corsMiddleware } from './middleware/cors.js';
import apiRouter from './routes/index.js';

const app = express();

// Middleware
app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Health check
app.get('/health', (_req: Request, res: Response): void => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// API routes
app.use('/api', apiRouter);

// 404 handler
app.use((_req: Request, res: Response): void => {
  res.status(404).json({ error: { message: 'Not found', code: 'NOT_FOUND' } });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  console.error(err.message);
  res.status(500).json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } });
});

app.listen(config.port, (): void => {
  console.log(`LIOS API running on http://localhost:${config.port}`);
  console.log(`Health: http://localhost:${config.port}/health`);
});

export default app;
