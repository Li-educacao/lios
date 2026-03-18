import { useState, useCallback } from 'react';
import { api } from '../../../lib/api';
import type { Student } from '../types';

interface StudentsResponse {
  data: Student[];
  total: number;
  page: number;
  limit: number;
}

interface UseStudentsReturn {
  students: Student[];
  total: number;
  loading: boolean;
  error: string | null;
  fetchStudents: (params?: { search?: string; class_id?: string; status?: string; page?: number }) => Promise<void>;
  fetchStudent: (id: string) => Promise<Student | null>;
  updateStudent: (id: string, data: Partial<Student>) => Promise<boolean>;
}

export function useStudents(): UseStudentsReturn {
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = useCallback(async (params?: { search?: string; class_id?: string; status?: string; page?: number }) => {
    setLoading(true);
    setError(null);

    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.class_id) query.set('class_id', params.class_id);
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', String(params.page));

    const path = `/api/v1/pedagogico/students${query.toString() ? `?${query}` : ''}`;
    const { data, error: apiError } = await api.get<StudentsResponse>(path);

    setLoading(false);
    if (apiError) {
      setError(apiError.message);
      return;
    }
    if (data) {
      setStudents(data.data);
      setTotal(data.total);
    }
  }, []);

  const fetchStudent = useCallback(async (id: string): Promise<Student | null> => {
    const { data, error: apiError } = await api.get<{ data: Student }>(`/api/v1/pedagogico/students/${id}`);
    if (apiError) {
      setError(apiError.message);
      return null;
    }
    return data?.data ?? null;
  }, []);

  const updateStudent = useCallback(async (id: string, updates: Partial<Student>): Promise<boolean> => {
    const { error: apiError } = await api.patch(`/api/v1/pedagogico/students/${id}`, updates);
    if (apiError) {
      setError(apiError.message);
      return false;
    }
    return true;
  }, []);

  return { students, total, loading, error, fetchStudents, fetchStudent, updateStudent };
}
