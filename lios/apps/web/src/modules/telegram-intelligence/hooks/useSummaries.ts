import { useState, useCallback } from 'react';
import { api } from '../../../lib/api';
import type { TgSummary } from '../types';

interface SummariesResponse {
  data: TgSummary[];
  total: number;
}

interface UseSummariesReturn {
  summaries: TgSummary[];
  total: number;
  loading: boolean;
  error: string | null;
  fetchSummaries: (groupId: string) => Promise<void>;
}

export function useSummaries(): UseSummariesReturn {
  const [summaries, setSummaries] = useState<TgSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummaries = useCallback(async (groupId: string) => {
    setLoading(true);
    setError(null);

    const { data, error: apiError } = await api.get<SummariesResponse>(
      `/api/v1/telegram/groups/${groupId}/summaries`
    );

    setLoading(false);

    if (apiError) {
      setError(apiError.message);
      return;
    }

    if (data) {
      setSummaries(data.data);
      setTotal(data.total);
    }
  }, []);

  return { summaries, total, loading, error, fetchSummaries };
}
