import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface PermissionsState {
  roles: string[];
  permissions: string[];
  loading: boolean;
}

export function usePermissions() {
  const { user } = useAuth();
  const [state, setState] = useState<PermissionsState>({
    roles: [],
    permissions: [],
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setState({ roles: [], permissions: [], loading: false });
      return;
    }

    async function loadPermissions() {
      const [rolesResult, permsResult] = await Promise.all([
        supabase.rpc('get_user_roles', { p_user_id: user!.id }),
        supabase.rpc('get_user_permissions', { p_user_id: user!.id }),
      ]);

      setState({
        roles: (rolesResult.data as string[]) ?? [],
        permissions: (permsResult.data as string[]) ?? [],
        loading: false,
      });
    }

    loadPermissions();
  }, [user]);

  const hasPermission = useCallback(
    (module: string, action: string): boolean => {
      if (state.roles.includes('admin')) return true;
      return state.permissions.includes(`${module}:${action}`);
    },
    [state.roles, state.permissions]
  );

  const hasRole = useCallback(
    (role: string): boolean => {
      return state.roles.includes(role);
    },
    [state.roles]
  );

  const isAdmin = state.roles.includes('admin');

  return {
    roles: state.roles,
    permissions: state.permissions,
    loading: state.loading,
    hasPermission,
    hasRole,
    isAdmin,
  };
}
