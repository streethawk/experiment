'use client';

import { useEffect } from 'react';
import { useAuthStore } from '../store/auth.store';

/**
 * Restores the access token from localStorage into the Zustand store
 * on every page load. The token is intentionally not Zustand-persisted
 * (lives in localStorage separately), so we must rehydrate on mount.
 */
export function HydrationProvider({ children }: { children: React.ReactNode }) {
  const hydrateFromStorage = useAuthStore(s => s.hydrateFromStorage);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  return <>{children}</>;
}
