import { useState, useCallback } from 'react';
import { api } from '../../../lib/api';
import type { Carousel, CarouselSlide, TemplateType } from '@carousel/shared';

// ─── Response types ────────────────────────────────────────────────────────────

interface GenerateTextResponse {
  carousel: Carousel;
  slides: CarouselSlide[];
  generated_meta: {
    suggested_hashtags: string[];
    suggested_caption: string;
  };
}

interface CarouselListResponse {
  data: Carousel[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface CarouselDetailResponse {
  carousel: Carousel;
  slides: CarouselSlide[];
}

interface SlideUpdateResponse {
  slide: CarouselSlide;
}

interface ValidateResponse {
  carousel: Carousel;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface DuplicateResponse {
  carousel: Carousel;
}

interface UseCarouselReturn {
  loading: boolean;
  error: string | null;
  clearError: () => void;
  generateText: (
    theme: string,
    templateType: TemplateType,
    slideCount: number
  ) => Promise<GenerateTextResponse | null>;
  getCarousels: (
    page?: number,
    limit?: number,
    status?: string,
    search?: string
  ) => Promise<CarouselListResponse | null>;
  getCarousel: (id: string) => Promise<CarouselDetailResponse | null>;
  updateSlide: (
    carouselId: string,
    position: number,
    data: Partial<Pick<CarouselSlide, 'headline' | 'body_text' | 'cta_text'>>
  ) => Promise<SlideUpdateResponse | null>;
  validateCarousel: (id: string) => Promise<ValidateResponse | null>;
  deleteCarousel: (id: string) => Promise<boolean>;
  duplicateCarousel: (id: string) => Promise<DuplicateResponse | null>;
}

export function useCarousel(): UseCarouselReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const generateText = useCallback(
    async (theme: string, templateType: TemplateType, slideCount: number) => {
      setLoading(true);
      setError(null);

      const { data, error: apiError } = await api.post<GenerateTextResponse>(
        '/api/v1/carousels/generate-text',
        { theme, templateType, slideCount }
      );

      setLoading(false);

      if (apiError) {
        setError(apiError.message);
        return null;
      }

      return data;
    },
    []
  );

  const getCarousels = useCallback(
    async (page = 1, limit = 10, status?: string, search?: string) => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (status) params.set('status', status);
      if (search && search.trim().length > 0) params.set('search', search.trim());

      const { data, error: apiError } = await api.get<CarouselListResponse>(
        `/api/v1/carousels?${params.toString()}`
      );

      setLoading(false);

      if (apiError) {
        setError(apiError.message);
        return null;
      }

      return data;
    },
    []
  );

  const getCarousel = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    const { data, error: apiError } = await api.get<CarouselDetailResponse>(
      `/api/v1/carousels/${id}`
    );

    setLoading(false);

    if (apiError) {
      setError(apiError.message);
      return null;
    }

    return data;
  }, []);

  const updateSlide = useCallback(
    async (
      carouselId: string,
      position: number,
      slideData: Partial<Pick<CarouselSlide, 'headline' | 'body_text' | 'cta_text'>>
    ) => {
      // No loading state for auto-save to avoid UI flicker
      const { data, error: apiError } = await api.patch<SlideUpdateResponse>(
        `/api/v1/carousels/${carouselId}/slides/${position}`,
        slideData
      );

      if (apiError) {
        setError(apiError.message);
        return null;
      }

      return data;
    },
    []
  );

  const validateCarousel = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    const { data, error: apiError } = await api.patch<ValidateResponse>(
      `/api/v1/carousels/${id}/validate`,
      {}
    );

    setLoading(false);

    if (apiError) {
      setError(apiError.message);
      return null;
    }

    return data;
  }, []);

  const deleteCarousel = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    const { error: apiError } = await api.delete(`/api/v1/carousels/${id}`);

    setLoading(false);

    if (apiError) {
      setError(apiError.message);
      return false;
    }

    return true;
  }, []);

  const duplicateCarousel = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    const { data, error: apiError } = await api.post<DuplicateResponse>(
      `/api/v1/carousels/${id}/duplicate`,
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
    generateText,
    getCarousels,
    getCarousel,
    updateSlide,
    validateCarousel,
    deleteCarousel,
    duplicateCarousel,
  };
}
