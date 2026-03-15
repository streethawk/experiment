'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authApi } from '../lib/auth-api';
import type { AuthUser, UserRole, MANAGER_ROLES } from '../types/auth.types';

// ─── Storage keys ─────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  ACCESS_TOKEN:  'cc_at',
  REFRESH_TOKEN: 'cc_rt',
  HOME_ID:       'cc_hid',
  ORG_ID:        'cc_oid',
  DEVICE_ID:     'cc_did',
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface MfaPendingState {
  mfaToken: string;
  expiresAt: number;
}

interface AuthState {
  // Auth state
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  // Current home context (staff can be in multiple homes)
  activeHomeId: string | null;

  // MFA flow (transient — not persisted)
  mfaPending: MfaPendingState | null;

  // Loading / error
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<'success' | 'mfa_required'>;
  verifyMfa: (code: string, trustDevice: boolean) => Promise<void>;
  logout: () => Promise<void>;
  setActiveHome: (homeId: string) => void;
  clearError: () => void;
  refreshAccessToken: () => Promise<boolean>;
  hydrateFromStorage: () => Promise<void>;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      activeHomeId: null,
      mfaPending: null,
      isLoading: false,
      error: null,

      // ─── Login ─────────────────────────────────────────────────────────────
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(email, password);

          if (response.requires_mfa) {
            set({
              mfaPending: {
                mfaToken: response.mfa_token,
                expiresAt: Date.now() + response.expires_in * 1000,
              },
              isLoading: false,
            });
            return 'mfa_required';
          }

          // Full auth — store tokens and user
          const activeHomeId = response.user.home_ids[0] ?? null;
          set({
            user: response.user,
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
            activeHomeId,
            isAuthenticated: true,
            isLoading: false,
          });

          // Sync to localStorage for API client
          syncToStorage(response.access_token, response.refresh_token, activeHomeId, response.user.organisation_id);

          return 'success';
        } catch (err: any) {
          const message = err.response?.data?.detail ?? err.response?.data?.message ?? 'Login failed';
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      // ─── MFA verification ──────────────────────────────────────────────────
      verifyMfa: async (code, trustDevice) => {
        const { mfaPending } = get();
        if (!mfaPending) throw new Error('No MFA session in progress');
        if (Date.now() > mfaPending.expiresAt) {
          set({ mfaPending: null, error: 'MFA session expired. Please log in again.' });
          throw new Error('MFA session expired');
        }

        set({ isLoading: true, error: null });
        try {
          const response = await authApi.verifyMfa(mfaPending.mfaToken, code, trustDevice);
          const activeHomeId = response.user.home_ids[0] ?? null;

          if (trustDevice && response.device_id) {
            localStorage.setItem(STORAGE_KEYS.DEVICE_ID, response.device_id);
          }

          set({
            user: response.user,
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
            activeHomeId,
            isAuthenticated: true,
            mfaPending: null,
            isLoading: false,
          });

          syncToStorage(response.access_token, response.refresh_token, activeHomeId, response.user.organisation_id);
        } catch (err: any) {
          const message = err.response?.data?.detail ?? 'Invalid code — try again';
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      // ─── Logout ────────────────────────────────────────────────────────────
      logout: async () => {
        const { accessToken, refreshToken } = get();
        try {
          if (accessToken && refreshToken) {
            await authApi.logout(accessToken, refreshToken);
          }
        } finally {
          clearStorage();
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            activeHomeId: null,
            isAuthenticated: false,
            mfaPending: null,
            error: null,
          });
        }
      },

      // ─── Switch home ───────────────────────────────────────────────────────
      setActiveHome: (homeId) => {
        set({ activeHomeId: homeId });
        localStorage.setItem(STORAGE_KEYS.HOME_ID, homeId);
      },

      clearError: () => set({ error: null }),

      // ─── Token refresh ─────────────────────────────────────────────────────
      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return false;

        try {
          const tokens = await authApi.refresh(refreshToken);
          const { activeHomeId, user } = get();

          set({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token });
          syncToStorage(tokens.access_token, tokens.refresh_token, activeHomeId, user?.organisation_id ?? null);

          return true;
        } catch {
          clearStorage();
          set({
            user: null, accessToken: null, refreshToken: null,
            isAuthenticated: false, activeHomeId: null,
          });
          return false;
        }
      },

      // ─── Hydrate on page load (for SSR/navigation) ─────────────────────────
      hydrateFromStorage: async () => {
        const at = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (!at) return;

        // Token already in store — nothing to do
        if (get().accessToken) return;

        try {
          const user = await authApi.me(at);
          const homeId = localStorage.getItem(STORAGE_KEYS.HOME_ID);
          set({ user, accessToken: at, refreshToken: localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN), isAuthenticated: true, activeHomeId: homeId });
        } catch {
          // Access token expired — try refresh
          const success = await get().refreshAccessToken();
          if (success) {
            const newAt = get().accessToken!;
            const user = await authApi.me(newAt);
            set({ user, isAuthenticated: true });
          }
        }
      },
    }),

    {
      name: 'carecore-auth',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
      // Only persist non-sensitive state — tokens are also in localStorage via syncToStorage
      partialize: (state) => ({
        user: state.user,
        activeHomeId: state.activeHomeId,
        isAuthenticated: state.isAuthenticated,
        // Do NOT persist raw tokens in Zustand persist middleware
        // (they live separately in localStorage for the API client)
      }),
    },
  ),
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function syncToStorage(
  accessToken: string,
  refreshToken: string,
  homeId: string | null,
  orgId: string | null,
) {
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  if (homeId) localStorage.setItem(STORAGE_KEYS.HOME_ID, homeId);
  if (orgId) localStorage.setItem(STORAGE_KEYS.ORG_ID, orgId);
}

function clearStorage() {
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem('carecore-auth'); // Zustand persist key
}

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectUser = (s: AuthState) => s.user;
export const selectIsAuthenticated = (s: AuthState) => s.isAuthenticated;
export const selectActiveHomeId = (s: AuthState) => s.activeHomeId;
export const selectRole = (s: AuthState) => s.user?.role ?? null;
export const selectIsManager = (s: AuthState) =>
  ['home_manager', 'registered_manager', 'group_admin', 'platform_admin'].includes(s.user?.role ?? '');
