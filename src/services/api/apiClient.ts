import { useAuthStore } from '@/stores/useAuthStore';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export class ApiError extends Error {
  code?: string;
  status: number;
  data?: any;

  constructor(message: string, status: number, code?: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const token = useAuthStore.getState().accessToken;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: options.credentials || 'include',
  });

  if (response.status === 204) {
    return {} as T;
  }

  // Handle 401 Unauthorized for silent refresh
  const isAuthEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/auth/refresh');
  if (response.status === 401 && !isAuthEndpoint) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshResponse = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          const newToken = data.accessToken;
          useAuthStore.getState().setAccessToken(newToken);
          isRefreshing = false;
          onRefreshed(newToken);

          // Retry original request
          headers['Authorization'] = `Bearer ${newToken}`;
          const retryResponse = await fetch(url, {
            ...options,
            headers,
            credentials: 'include',
          });

          if (retryResponse.status === 204) return {} as T;
          return await parseResponse<T>(retryResponse);
        } else {
          isRefreshing = false;
          refreshSubscribers = [];
          useAuthStore.getState().logout();
        }
      } catch (err) {
        isRefreshing = false;
        refreshSubscribers = [];
        useAuthStore.getState().logout();
      }
    } else {
      // Wait for refresh to complete and retry
      return new Promise<T>((resolve, reject) => {
        subscribeTokenRefresh(async (newToken: string) => {
          try {
            headers['Authorization'] = `Bearer ${newToken}`;
            const retryResponse = await fetch(url, {
              ...options,
              headers,
              credentials: 'include',
            });
            if (retryResponse.status === 204) resolve({} as T);
            else resolve(await parseResponse<T>(retryResponse));
          } catch (e) {
            reject(e);
          }
        });
      });
    }
  }

  return parseResponse<T>(response);
}

async function parseResponse<T>(response: Response): Promise<T> {
  let data: any;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg =
      data?.message || data?.title || response.statusText || 'An API error occurred';
    throw new ApiError(errorMsg, response.status, data?.code, data);
  }

  return data as T;
}

export const apiClient = {
  get: <T>(endpoint: string, params?: Record<string, any>): Promise<T> => {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') {
          searchParams.append(k, String(v));
        }
      }
      const qs = searchParams.toString();
      if (qs) {
        url += (url.includes('?') ? '&' : '?') + qs;
      }
    }
    return request<T>(url, { method: 'GET' });
  },

  post: <T>(endpoint: string, body?: any): Promise<T> => {
    return request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put: <T>(endpoint: string, body?: any): Promise<T> => {
    return request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete: <T>(endpoint: string, body?: any): Promise<T> => {
    return request<T>(endpoint, {
      method: 'DELETE',
      body: body ? JSON.stringify(body) : undefined,
    });
  },
};
