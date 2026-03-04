import { Request, Response, NextFunction } from 'express';
import type { User } from '@supabase/supabase-js';
import { supabaseAdmin } from '../lib/supabase.js';

export interface AuthenticatedRequest extends Request {
  user: User;
  token: string;
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: { message: 'Token não fornecido', code: 'NO_TOKEN' } });
    return;
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: { message: 'Token inválido', code: 'INVALID_TOKEN' } });
    return;
  }

  (req as AuthenticatedRequest).user = user;
  (req as AuthenticatedRequest).token = token;
  next();
}
