'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/auth.store';

export default function DashboardIndexPage() {
  const router = useRouter();
  const { activeHomeId, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    } else if (activeHomeId) {
      router.replace(`/homes/${activeHomeId}/residents`);
    }
    // If authenticated but no homeId, show the page as-is (user needs to select a home)
  }, [activeHomeId, isAuthenticated, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold text-xl">C</span>
        </div>
        <p className="text-sm text-slate-500">Loading your dashboard…</p>
      </div>
    </div>
  );
}
