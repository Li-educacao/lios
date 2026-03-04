import { supabase } from './supabase';

const BASE_URL = import.meta.env.VITE_API_URL || '';

interface ApiError {
  message: string;
  code: string;
  empty_positions?: number[];
}

interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const headers = await getAuthHeaders();

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers ?? {}),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro de conexão com o servidor';
    return { data: null, error: { message, code: 'NETWORK_ERROR' } };
  }

  // 204 No Content
  if (response.status === 204) {
    return { data: null, error: null };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { data: null, error: { message: 'Resposta inválida do servidor', code: 'PARSE_ERROR' } };
  }

  if (!response.ok) {
    const errBody = body as { error?: ApiError };
    return {
      data: null,
      error: errBody.error ?? { message: `Erro ${response.status}`, code: 'HTTP_ERROR' },
    };
  }

  return { data: body as T, error: null };
}

export const api = {
  get<T>(path: string): Promise<ApiResponse<T>> {
    return request<T>(path, { method: 'GET' });
  },

  post<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  patch<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  put<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  delete<T = null>(path: string): Promise<ApiResponse<T>> {
    return request<T>(path, { method: 'DELETE' });
  },
};
