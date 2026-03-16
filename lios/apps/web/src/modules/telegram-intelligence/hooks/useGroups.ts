import { useState, useCallback } from 'react';
import { api } from '../../../lib/api';
import type { TgGroup } from '../types';

interface GroupsResponse {
  data: TgGroup[];
  total: number;
}

interface UseGroupsReturn {
  groups: TgGroup[];
  total: number;
  loading: boolean;
  error: string | null;
  fetchGroups: () => Promise<void>;
  fetchGroup: (id: string) => Promise<TgGroup | null>;
}

export function useGroups(): UseGroupsReturn {
  const [groups, setGroups] = useState<TgGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: apiError } = await api.get<GroupsResponse>('/api/v1/telegram/groups');

    setLoading(false);

    if (apiError) {
      setError(apiError.message);
      return;
    }

    if (data) {
      setGroups(data.data);
      setTotal(data.total);
    }
  }, []);

  const fetchGroup = useCallback(async (id: string): Promise<TgGroup | null> => {
    setLoading(true);
    setError(null);

    const { data, error: apiError } = await api.get<TgGroup>(`/api/v1/telegram/groups/${id}`);

    setLoading(false);

    if (apiError) {
      setError(apiError.message);
      return null;
    }

    return data;
  }, []);

  return { groups, total, loading, error, fetchGroups, fetchGroup };
}
