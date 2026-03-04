import { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth.js';
import { supabaseAdmin } from '../lib/supabase.js';

/**
 * RBAC middleware factory.
 * Checks if the authenticated user has the required permission.
 * Must be used AFTER authMiddleware.
 *
 * Usage: router.use(requirePermission('social-media', 'read'))
 */
export function requirePermission(module: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { user } = req as AuthenticatedRequest;

    if (!user) {
      res.status(401).json({ error: { message: 'Não autenticado', code: 'UNAUTHORIZED' } });
      return;
    }

    const { data: hasPermission, error } = await supabaseAdmin.rpc('has_permission', {
      p_user_id: user.id,
      p_module: module,
      p_action: action,
    });

    if (error) {
      console.error('[rbac] Permission check error:', error.message);
      res.status(500).json({ error: { message: 'Erro ao verificar permissão', code: 'RBAC_ERROR' } });
      return;
    }

    if (!hasPermission) {
      res.status(403).json({
        error: {
          message: `Sem permissão: ${module}:${action}`,
          code: 'FORBIDDEN',
        },
      });
      return;
    }

    next();
  };
}

/**
 * Require one of the specified roles.
 * Must be used AFTER authMiddleware.
 */
export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { user } = req as AuthenticatedRequest;

    if (!user) {
      res.status(401).json({ error: { message: 'Não autenticado', code: 'UNAUTHORIZED' } });
      return;
    }

    const { data: userRoles, error } = await supabaseAdmin.rpc('get_user_roles', {
      p_user_id: user.id,
    });

    if (error) {
      console.error('[rbac] Role check error:', error.message);
      res.status(500).json({ error: { message: 'Erro ao verificar role', code: 'RBAC_ERROR' } });
      return;
    }

    const userRoleList = (userRoles as string[]) ?? [];
    const hasRole = roles.some((r) => userRoleList.includes(r));

    if (!hasRole) {
      res.status(403).json({
        error: {
          message: `Requer role: ${roles.join(' ou ')}`,
          code: 'FORBIDDEN',
        },
      });
      return;
    }

    next();
  };
}
