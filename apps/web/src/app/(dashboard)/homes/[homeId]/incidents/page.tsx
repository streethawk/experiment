'use client';

const PLANNED_FEATURES = [
  {
    icon: '📋',
    title: 'Incident reporting',
    description: 'Log falls, medication errors, behavioural incidents, and near-misses with structured forms.',
  },
  {
    icon: '🔔',
    title: 'CQC-notifiable events',
    description: 'Auto-flag events that require statutory notification under the Health & Social Care Act.',
  },
  {
    icon: '🛡️',
    title: 'Safeguarding workflow',
    description: 'Raise and track safeguarding concerns with escalation to the registered manager.',
  },
  {
    icon: '🔍',
    title: 'Investigation tracking',
    description: 'Assign investigators, record actions taken, and close incidents with root-cause analysis.',
  },
  {
    icon: '📊',
    title: 'Trends & reporting',
    description: 'Identify patterns across incident types, locations, and time periods.',
  },
];

export default function IncidentsPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Incidents</h1>
        <p className="text-sm text-slate-500 mt-0.5">Incident reporting and safeguarding workflow</p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 mb-6 flex items-start gap-3">
        <span className="text-lg mt-0.5">🚧</span>
        <div>
          <p className="text-sm font-semibold text-amber-800">Coming in Phase 4</p>
          <p className="text-sm text-amber-700 mt-0.5">
            The incidents module is under development. Here&apos;s what&apos;s planned:
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {PLANNED_FEATURES.map((f) => (
          <div key={f.title} className="bg-white rounded-xl border border-slate-200 px-4 py-4 flex items-start gap-4">
            <span className="text-2xl shrink-0">{f.icon}</span>
            <div>
              <div className="text-sm font-semibold text-slate-800">{f.title}</div>
              <div className="text-sm text-slate-500 mt-0.5">{f.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
