import { useState, useCallback } from 'react';
import { api } from '../../../lib/api';
import { supabase } from '../../../lib/supabase';
import type { Carousel, CarouselSlide } from '@carousel/shared';

// ─── Response types ────────────────────────────────────────────────────────────

interface ExportDataResponse {
  carousel: Carousel;
  slides: CarouselSlide[];
  suggested_caption: string;
  suggested_hashtags: string[];
}

interface MarkExportedResponse {
  carousel: Carousel;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseExportReturn {
  loading: boolean;
  error: string | null;
  clearError: () => void;
  getExportData: (carouselId: string) => Promise<ExportDataResponse | null>;
  downloadZip: (carouselId: string, title: string) => Promise<boolean>;
  downloadSlide: (imageUrl: string, position: number) => Promise<void>;
  markExported: (carouselId: string) => Promise<MarkExportedResponse | null>;
}

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function useExport(): UseExportReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const getExportData = useCallback(async (carouselId: string) => {
    setLoading(true);
    setError(null);

    const { data, error: apiError } = await api.get<ExportDataResponse>(
      `/api/v1/carousels/${carouselId}/export`
    );

    setLoading(false);

    if (apiError) {
      setError(apiError.message);
      return null;
    }

    return data;
  }, []);

  const downloadZip = useCallback(async (carouselId: string, title: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(
        `${BASE_URL}/api/v1/carousels/${carouselId}/export/zip`,
        {
          method: 'GET',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (!response.ok) {
        let message = `Erro ${response.status}`;
        try {
          const body = await response.json() as { error?: { message: string } };
          message = body.error?.message ?? message;
        } catch {
          // ignore parse error
        }
        setError(message);
        setLoading(false);
        return false;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const safeTitle = title.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 50);

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${safeTitle}-slides.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      setLoading(false);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao baixar ZIP';
      setError(message);
      setLoading(false);
      return false;
    }
  }, []);

  const downloadSlide = useCallback(async (imageUrl: string, position: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `slide-${String(position).padStart(2, '0')}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao baixar slide';
      setError(message);
    }
  }, []);

  const markExported = useCallback(async (carouselId: string) => {
    setLoading(true);
    setError(null);

    const { data, error: apiError } = await api.patch<MarkExportedResponse>(
      `/api/v1/carousels/${carouselId}/mark-exported`,
      {}
    );

    setLoading(false);

    if (apiError) {
      setError(apiError.message);
      return null;
    }

    return data;
  }, []);

  return {
    loading,
    error,
    clearError,
    getExportData,
    downloadZip,
    downloadSlide,
    markExported,
  };
}
