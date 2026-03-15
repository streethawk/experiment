'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/auth.store';

export default function DashboardPage() {
  const router = useRouter();
  const activeHomeId = useAuthStore(s => s.activeHomeId);

  useEffect(() => {
    if (activeHomeId) {
      router.replace(`/homes/${activeHomeId}/residents`);
    }
  }, [activeHomeId, router]);

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
