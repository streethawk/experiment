import axios from 'axios';
import type {
  LoginResponse,
  MfaVerifyResponse,
  TokenPair,
  AuthUser,
} from '../types/auth.types';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1';

const http = axios.create({ baseURL: BASE, timeout: 15_000 });

// ─── Auth API calls (no auth interceptor — these establish auth) ──────────────

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const { data } = await http.post<LoginResponse>('/auth/login', { email, password });
    return data;
  },

  verifyMfa: async (
    mfaToken: string,
    code: string,
    trustDevice: boolean,
  ): Promise<MfaVerifyResponse> => {
    const { data } = await http.post<MfaVerifyResponse>('/auth/mfa/verify', {
      mfa_token: mfaToken,
      code,
      trust_device: trustDevice,
    });
    return data;
  },

  refresh: async (refreshToken: string): Promise<TokenPair> => {
    const { data } = await http.post<TokenPair>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return data;
  },

  logout: async (accessToken: string, refreshToken: string): Promise<void> => {
    await http.delete('/auth/logout', {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { refresh_token: refreshToken },
    });
  },

  me: async (accessToken: string): Promise<AuthUser> => {
    const { data } = await http.get<AuthUser>('/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return data;
  },

  requestPasswordReset: async (email: string): Promise<void> => {
    await http.post('/auth/password/reset-request', { email });
  },

  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await http.post('/auth/password/reset', { token, new_password: newPassword });
  },
};
