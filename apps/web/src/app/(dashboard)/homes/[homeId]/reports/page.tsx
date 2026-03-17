'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';

const AVAILABLE_REPORTS = [
  {
    icon: '📅',
    title: 'Weekly Attendance Report',
    description: 'Staff hours worked, absent shifts, and agency usage for any week.',
    href: (homeId: string) => `/homes/${homeId}/rota`,
    badge: 'Available',
    badgeColour: 'bg-green-100 text-green-700',
  },
  {
    icon: '💊',
    title: 'Controlled Drugs Register',
    description: 'Running balance, administration log, and stock levels for all scheduled medicines.',
    href: (homeId: string) => `/homes/${homeId}/medications`,
    badge: 'Available',
    badgeColour: 'bg-green-100 text-green-700',
  },
];

const PLANNED_REPORTS = [
  {
    icon: '🏠',
    title: 'Occupancy & Admissions',
    description: 'Bed occupancy rate, admission and discharge trends over time.',
  },
  {
    icon: '📊',
    title: 'Medication Compliance',
    description: 'MAR completion rates, PRN usage, and missed administration trends.',
  },
  {
    icon: '🛡️',
    title: 'Incidents Summary',
    description: 'Incident frequency by type, location, and outcome — CQC-ready.',
  },
  {
    icon: '🌡️',
    title: 'Resident Wellbeing',
    description: 'Mood scores, nutrition, and hydration trends across residents.',
  },
  {
    icon: '👤',
    title: 'Staff Hours & Payroll Export',
    description: 'Hours worked, overtime, and agency spend — exportable to CSV.',
  },
];

export default function ReportsPage() {
  const { homeId } = useParams<{ homeId: string }>();

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500 mt-0.5">Analytics, occupancy trends, and compliance reports</p>
      </div>

      {/* Available now */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Available now</h2>
        <div className="space-y-3">
          {AVAILABLE_REPORTS.map((r) => (
            <Link
              key={r.title}
              href={r.href(homeId)}
              className="bg-white rounded-xl border border-slate-200 px-4 py-4 flex items-start gap-4 hover:border-blue-300 hover:shadow-sm transition-all group"
            >
              <span className="text-2xl shrink-0">{r.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-slate-800">{r.title}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.badgeColour}`}>{r.badge}</span>
                </div>
                <div className="text-sm text-slate-500">{r.description}</div>
              </div>
              <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-500 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </section>

      {/* Planned */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Planned — Phase 7</h2>
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">Coming soon</span>
        </div>
        <div className="space-y-3">
          {PLANNED_REPORTS.map((r) => (
            <div key={r.title} className="bg-slate-50 rounded-xl border border-slate-200 px-4 py-4 flex items-start gap-4 opacity-70">
              <span className="text-2xl shrink-0">{r.icon}</span>
              <div>
                <div className="text-sm font-semibold text-slate-600">{r.title}</div>
                <div className="text-sm text-slate-400 mt-0.5">{r.description}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
