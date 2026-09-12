import {
  LoginRequest,
  LoginResponse,
  RefreshTokenResponse,
  CurrentUserResponse,
  ChangePasswordRequest,
} from '@/types/auth';
import { request, apiClient } from './apiClient';

export const authApi = {
  login: async (req: LoginRequest): Promise<LoginResponse> => {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(req),
      credentials: 'include',
    });
  },

  refresh: async (): Promise<RefreshTokenResponse> => {
    return request<RefreshTokenResponse>('/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
  },

  logout: async (): Promise<void> => {
    try {
      await request<void>('/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      // Ignore network errors on logout
    }
  },

  me: async (): Promise<CurrentUserResponse> => {
    return apiClient.get<CurrentUserResponse>('/auth/me');
  },

  changePassword: async (req: ChangePasswordRequest): Promise<void> => {
    return apiClient.post<void>('/auth/change-password', req);
  },
};
