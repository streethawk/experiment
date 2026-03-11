'use client';

import { useAuthStore } from '../store/auth.store';
import type { UserRole } from '../types/auth.types';

/** Primary auth hook — use this in components */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const activeHomeId = useAuthStore((s) => s.activeHomeId);
  const mfaPending = useAuthStore((s) => s.mfaPending);

  const login = useAuthStore((s) => s.login);
  const verifyMfa = useAuthStore((s) => s.verifyMfa);
  const logout = useAuthStore((s) => s.logout);
  const setActiveHome = useAuthStore((s) => s.setActiveHome);
  const clearError = useAuthStore((s) => s.clearError);

  const hasRole = (...roles: UserRole[]) => !!user && roles.includes(user.role);

  const isManager = hasRole(
    'home_manager', 'registered_manager', 'group_admin', 'platform_admin',
  );

  const canAccessFinance = hasRole(
    'finance_admin', 'home_manager', 'registered_manager', 'group_admin', 'platform_admin',
  );

  const canAdministerMedications = hasRole(
    'senior_carer', 'nurse', 'home_manager', 'registered_manager',
  );

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    activeHomeId,
    mfaPending,
    // Actions
    login,
    verifyMfa,
    logout,
    setActiveHome,
    clearError,
    // Permission helpers
    hasRole,
    isManager,
    canAccessFinance,
    canAdministerMedications,
  };
}
