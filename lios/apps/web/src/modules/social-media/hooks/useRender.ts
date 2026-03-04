import { useState, useCallback } from 'react';
import { api } from '../../../lib/api';
import { supabase } from '../../../lib/supabase';

// ─── Response types ────────────────────────────────────────────────────────────

interface RenderImage {
  position: number;
  url: string;
}

interface RenderCarouselResponse {
  images: RenderImage[];
}

interface RenderSlideResponse {
  position: number;
  url: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseRenderReturn {
  rendering: boolean;
  renderingSlides: Set<number>;
  error: string | null;
  clearError: () => void;
  renderCarousel: (carouselId: string) => Promise<RenderImage[] | null>;
  renderSlide: (carouselId: string, position: number) => Promise<RenderSlideResponse | null>;
  uploadImage: (
    carouselId: string,
    position: number,
    file: File,
    userId: string
  ) => Promise<string | null>;
}

export function useRender(): UseRenderReturn {
  const [rendering, setRendering] = useState(false);
  const [renderingSlides, setRenderingSlides] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const renderCarousel = useCallback(async (carouselId: string) => {
    setRendering(true);
    setError(null);

    const { data, error: apiError } = await api.post<RenderCarouselResponse>(
      `/api/v1/carousels/${carouselId}/render`,
      {}
    );

    setRendering(false);

    if (apiError) {
      setError(apiError.message);
      return null;
    }

    return data?.images ?? null;
  }, []);

  const renderSlide = useCallback(async (carouselId: string, position: number) => {
    setRenderingSlides((prev) => new Set([...prev, position]));
    setError(null);

    const { data, error: apiError } = await api.post<RenderSlideResponse>(
      `/api/v1/carousels/${carouselId}/slides/${position}/render`,
      {}
    );

    setRenderingSlides((prev) => {
      const next = new Set(prev);
      next.delete(position);
      return next;
    });

    if (apiError) {
      setError(apiError.message);
      return null;
    }

    return data;
  }, []);

  const uploadImage = useCallback(
    async (carouselId: string, position: number, file: File, userId: string) => {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const storagePath = `${userId}/${carouselId}/upload-${position}.${ext}`;

      setRenderingSlides((prev) => new Set([...prev, position]));
      setError(null);

      const { error: uploadError } = await supabase.storage
        .from('carousel-assets')
        .upload(storagePath, file, { upsert: true });

      if (uploadError) {
        setRenderingSlides((prev) => {
          const next = new Set(prev);
          next.delete(position);
          return next;
        });
        setError('Falha ao fazer upload da imagem');
        return null;
      }

      const { data: signedData, error: signError } = await supabase.storage
        .from('carousel-assets')
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

      setRenderingSlides((prev) => {
        const next = new Set(prev);
        next.delete(position);
        return next;
      });

      if (signError || !signedData?.signedUrl) {
        setError('Falha ao obter URL da imagem');
        return null;
      }

      return signedData.signedUrl;
    },
    []
  );

  return {
    rendering,
    renderingSlides,
    error,
    clearError,
    renderCarousel,
    renderSlide,
    uploadImage,
  };
}
