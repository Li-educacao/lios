import { useState, useCallback } from 'react';
import { api } from '../../../lib/api';
import type { TgInsight, InsightCategory } from '../types';

interface InsightsParams {
  group_id?: string;
  category?: InsightCategory;
  limit?: number;
  offset?: number;
}

interface InsightsResponse {
  data: TgInsight[];
  total: number;
}

interface UseInsightsReturn {
  insights: TgInsight[];
  total: number;
  loading: boolean;
  error: string | null;
  fetchInsights: (params?: InsightsParams) => Promise<void>;
}

export function useInsights(): UseInsightsReturn {
  const [insights, setInsights] = useState<TgInsight[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async (params: InsightsParams = {}) => {
    setLoading(true);
    setError(null);

    const qs = new URLSearchParams();
    if (params.group_id) qs.set('group_id', params.group_id);
    if (params.category) qs.set('category', params.category);
    if (params.limit !== undefined) qs.set('limit', String(params.limit));
    if (params.offset !== undefined) qs.set('offset', String(params.offset));

    const path = `/api/v1/telegram/insights${qs.toString() ? `?${qs.toString()}` : ''}`;
    const { data, error: apiError } = await api.get<InsightsResponse>(path);

    setLoading(false);

    if (apiError) {
      setError(apiError.message);
      return;
    }

    if (data) {
      setInsights(data.data);
      setTotal(data.total);
    }
  }, []);

  return { insights, total, loading, error, fetchInsights };
}
