import { useState, useCallback } from 'react';
import { api } from '../../../lib/api';
import type { WritingPersona } from '@carousel/shared';

// ─── Response types ────────────────────────────────────────────────────────────

interface PersonaListResponse {
  data: WritingPersona[];
}

interface PersonaResponse {
  persona: WritingPersona;
}

export interface PersonaFormData {
  name: string;
  tone: string[];
  example_phrases: string[];
  words_to_use: string[];
  words_to_avoid: string[];
  is_default: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UsePersonasReturn {
  loading: boolean;
  error: string | null;
  clearError: () => void;
  getPersonas: () => Promise<WritingPersona[] | null>;
  createPersona: (data: PersonaFormData) => Promise<WritingPersona | null>;
  updatePersona: (id: string, data: Partial<PersonaFormData>) => Promise<WritingPersona | null>;
  deletePersona: (id: string) => Promise<boolean>;
}

export function usePersonas(): UsePersonasReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const getPersonas = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: apiError } = await api.get<PersonaListResponse>('/api/v1/personas');

    setLoading(false);

    if (apiError) {
      setError(apiError.message);
      return null;
    }

    return data?.data ?? null;
  }, []);

  const createPersona = useCallback(async (formData: PersonaFormData) => {
    setLoading(true);
    setError(null);

    const { data, error: apiError } = await api.post<PersonaResponse>('/api/v1/personas', formData);

    setLoading(false);

    if (apiError) {
      setError(apiError.message);
      return null;
    }

    return data?.persona ?? null;
  }, []);

  const updatePersona = useCallback(async (id: string, formData: Partial<PersonaFormData>) => {
    setLoading(true);
    setError(null);

    const { data, error: apiError } = await api.put<PersonaResponse>(`/api/v1/personas/${id}`, formData);

    setLoading(false);

    if (apiError) {
      setError(apiError.message);
      return null;
    }

    return data?.persona ?? null;
  }, []);

  const deletePersona = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    const { error: apiError } = await api.delete(`/api/v1/personas/${id}`);

    setLoading(false);

    if (apiError) {
      setError(apiError.message);
      return false;
    }

    return true;
  }, []);

  return {
    loading,
    error,
    clearError,
    getPersonas,
    createPersona,
    updatePersona,
    deletePersona,
  };
}
