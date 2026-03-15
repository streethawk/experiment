'use client';

import { Shield } from 'lucide-react';

export default function IncidentsPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-slate-900">Incidents</h1>
        <p className="text-sm text-slate-500 mt-0.5">Incident reporting and safeguarding workflow</p>
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-200 mx-auto mb-4">
          <Shield className="h-7 w-7 text-slate-400" />
        </div>
        <h2 className="text-base font-semibold text-slate-600 mb-1">Coming in Phase 4</h2>
        <p className="text-sm text-slate-400 max-w-sm mx-auto">
          Incident reporting, safeguarding workflow, CQC-notifiable events, and investigation tracking.
        </p>
      </div>
    </div>
  );
}
