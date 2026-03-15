'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { residentsApi, type CarePlanFull } from '@/lib/residents-api';

// ─── Section labels ────────────────────────────────────────────────────────────

const SECTION_LABELS: Record<string, string> = {
  personal_care:     'Personal Care',
  nutrition:         'Nutrition',
  hydration:         'Hydration',
  medication:        'Medication Management',
  mobility:          'Mobility & Moving Handling',
  continence:        'Continence',
  sleep:             'Sleep',
  mood_behaviour:    'Mood & Behaviour',
  medical:           'Medical Needs',
  social_activity:   'Social & Activities',
  wound_care:        'Wound Care',
  communication:     'Communication',
  skin_care:         'Skin Care',
  end_of_life:       'End of Life',
};

const STATUS_STYLE: Record<string, string> = {
  current:    'bg-teal-100 text-teal-800',
  draft:      'bg-yellow-100 text-yellow-800',
  superseded: 'bg-gray-100 text-gray-600',
  archived:   'bg-gray-100 text-gray-500',
};

function sectionLabel(key: string): string {
  return SECTION_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CarePlanPage() {
  const { homeId, residentId, planId } = useParams<{
    homeId: string; residentId: string; planId: string;
  }>();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [plan, setPlan] = useState<CarePlanFull | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    residentsApi.getCarePlan(homeId, residentId, planId, accessToken)
      .then(setPlan)
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [homeId, residentId, planId, accessToken]);

  if (isLoading) return <Skeleton />;

  if (error || !plan) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-red-600 font-medium mb-3">{error ?? 'Care plan not found'}</p>
        <Link href={`/homes/${homeId}/residents/${residentId}`}
          className="text-sm text-blue-600 hover:underline">← Back to resident</Link>
      </div>
    );
  }

  const sections = Object.entries(plan.sections ?? {});
  const reviewDate = plan.next_review_date ? new Date(plan.next_review_date) : null;
  const isOverdue = reviewDate && reviewDate < new Date();

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-slate-500 mb-4 flex items-center gap-1.5">
        <Link href={`/homes/${homeId}/residents`} className="hover:text-slate-800">Residents</Link>
        <span>/</span>
        <Link href={`/homes/${homeId}/residents/${residentId}`} className="hover:text-slate-800">Profile</Link>
        <span>/</span>
        <span className="text-slate-800 font-medium">Care Plan v{plan.version}</span>
      </nav>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Care Plan — Version {plan.version}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${STATUS_STYLE[plan.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {plan.status}
              </span>
              {plan.approved_at && (
                <span className="text-xs text-slate-500">
                  Approved {new Date(plan.approved_at).toLocaleDateString('en-GB')}
                </span>
              )}
              <span className="text-xs text-slate-400">
                Updated {new Date(plan.updated_at).toLocaleDateString('en-GB')}
              </span>
            </div>
          </div>
          <Link
            href={`/homes/${homeId}/residents/${residentId}`}
            className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1"
          >
            ← Back to profile
          </Link>
        </div>

        {/* Review date */}
        {reviewDate && (
          <div className={`mt-4 rounded-lg px-4 py-3 text-sm ${
            isOverdue
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-amber-50 border border-amber-200 text-amber-700'
          }`}>
            {isOverdue ? '⚠ Review overdue — ' : '📅 Next review: '}
            <strong>{reviewDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
          </div>
        )}
      </div>

      {/* Sections */}
      {sections.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
          No sections recorded in this care plan.
        </div>
      ) : (
        <div className="space-y-4">
          {sections.map(([key, content]) => (
            <Section key={key} title={sectionLabel(key)} content={content} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function Section({
  title,
  content,
}: {
  title: string;
  content: { goals?: string; interventions?: string; notes?: string; [key: string]: unknown };
}) {
  const extras = Object.entries(content).filter(
    ([k]) => !['goals', 'interventions', 'notes'].includes(k),
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-4">
        {content.goals && (
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Goals</h3>
            <p className="text-sm text-slate-800 whitespace-pre-wrap">{content.goals}</p>
          </div>
        )}
        {content.interventions && (
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Interventions</h3>
            <p className="text-sm text-slate-800 whitespace-pre-wrap">{content.interventions}</p>
          </div>
        )}
        {content.notes && (
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notes</h3>
            <p className="text-sm text-slate-700 italic whitespace-pre-wrap">{content.notes}</p>
          </div>
        )}
        {extras.map(([k, v]) => (
          <div key={k}>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              {k.replace(/_/g, ' ')}
            </h3>
            <p className="text-sm text-slate-800">{typeof v === 'string' ? v : JSON.stringify(v)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4 animate-pulse">
      <div className="h-4 bg-slate-100 rounded w-64" />
      <div className="bg-white rounded-2xl border border-slate-200 p-6 h-32" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 h-12" />
          <div className="px-6 py-5 space-y-3">
            <div className="h-3 bg-slate-100 rounded w-24" />
            <div className="h-3 bg-slate-100 rounded w-full" />
            <div className="h-3 bg-slate-100 rounded w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
