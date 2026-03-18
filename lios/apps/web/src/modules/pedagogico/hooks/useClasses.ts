import { useState, useCallback } from 'react';
import { api } from '../../../lib/api';
import type { PedClass } from '../types';

interface UseClassesReturn {
  classes: PedClass[];
  loading: boolean;
  error: string | null;
  fetchClasses: (status?: string) => Promise<void>;
  fetchClass: (id: string) => Promise<PedClass | null>;
  createClass: (data: Partial<PedClass>) => Promise<PedClass | null>;
  updateClass: (id: string, data: Partial<PedClass>) => Promise<boolean>;
}

export function useClasses(): UseClassesReturn {
  const [classes, setClasses] = useState<PedClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClasses = useCallback(async (status?: string) => {
    setLoading(true);
    setError(null);

    const path = status ? `/api/v1/pedagogico/classes?status=${status}` : '/api/v1/pedagogico/classes';
    const { data, error: apiError } = await api.get<{ data: PedClass[] }>(path);

    setLoading(false);
    if (apiError) {
      setError(apiError.message);
      return;
    }
    if (data) setClasses(data.data);
  }, []);

  const fetchClass = useCallback(async (id: string): Promise<PedClass | null> => {
    const { data, error: apiError } = await api.get<{ data: PedClass }>(`/api/v1/pedagogico/classes/${id}`);
    if (apiError) {
      setError(apiError.message);
      return null;
    }
    return data?.data ?? null;
  }, []);

  const createClass = useCallback(async (classData: Partial<PedClass>): Promise<PedClass | null> => {
    const { data, error: apiError } = await api.post<{ data: PedClass }>('/api/v1/pedagogico/classes', classData);
    if (apiError) {
      setError(apiError.message);
      return null;
    }
    return data?.data ?? null;
  }, []);

  const updateClass = useCallback(async (id: string, updates: Partial<PedClass>): Promise<boolean> => {
    const { error: apiError } = await api.patch(`/api/v1/pedagogico/classes/${id}`, updates);
    if (apiError) {
      setError(apiError.message);
      return false;
    }
    return true;
  }, []);

  return { classes, loading, error, fetchClasses, fetchClass, createClass, updateClass };
}
