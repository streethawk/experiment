'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { residentsApi, type ResidentProfile } from '@/lib/residents-api';

type Tab = 'overview' | 'care-plan' | 'medications' | 'notes' | 'risk' | 'contacts';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'care-plan', label: 'Care plan' },
  { id: 'risk', label: 'Risk assessments' },
  { id: 'medications', label: 'Medications' },
  { id: 'notes', label: 'Care notes' },
  { id: 'contacts', label: 'Contacts' },
];

const RISK_LEVEL_COLOURS: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-800',
  very_high: 'bg-red-100 text-red-800',
};

const SEVERITY_COLOURS: Record<string, string> = {
  mild: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  moderate: 'bg-orange-50 text-orange-800 border-orange-200',
  severe: 'bg-red-50 text-red-800 border-red-200',
  life_threatening: 'bg-red-600 text-white border-red-700',
};

const FUNDING_LABELS: Record<string, string> = {
  self_funded: 'Self-funded',
  local_authority: 'Local authority',
  chc: 'NHS Continuing Healthcare',
  chc_fast_track: 'CHC Fast Track',
  nhs_fnc: 'NHS-funded nursing care',
  mixed: 'Mixed funding',
  deferred_payment: 'Deferred payment',
};

export default function ResidentProfilePage() {
  const { homeId, residentId } = useParams<{ homeId: string; residentId: string }>();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [resident, setResident] = useState<ResidentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  useEffect(() => {
    if (!accessToken) return;
    setIsLoading(true);
    residentsApi.get(homeId, residentId, accessToken)
      .then(setResident)
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [homeId, residentId, accessToken]);

  if (isLoading) return <ResidentSkeleton />;
  if (error || !resident) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center text-slate-500">
        <p className="text-red-700 font-medium">{error ?? 'Resident not found'}</p>
        <Link href={`/homes/${homeId}/residents`} className="text-sm text-blue-600 hover:underline mt-2 inline-block">
          ← Back to residents
        </Link>
      </div>
    );
  }

  const age = Math.floor(
    (Date.now() - new Date(resident.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-slate-500 mb-4">
        <Link href={`/homes/${homeId}/residents`} className="hover:text-slate-800">
          Residents
        </Link>
        {' / '}
        <span className="text-slate-800 font-medium">{resident.full_name}</span>
      </nav>

      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center
                          text-slate-600 font-bold text-2xl shrink-0">
            {(resident.preferred_name ?? resident.full_name).charAt(0)}
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-xl font-semibold text-slate-900">
                  {resident.full_name}
                  {resident.preferred_name && resident.preferred_name !== resident.full_name && (
                    <span className="text-slate-400 font-normal ml-2 text-base">
                      "{resident.preferred_name}"
                    </span>
                  )}
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  {age} yrs · {resident.care_type.replace(/_/g, ' ')} · {FUNDING_LABELS[resident.primary_funding_source] ?? resident.primary_funding_source}
                </p>
              </div>

              {/* Alert badges */}
              <div className="flex flex-wrap gap-2">
                {resident.dnar_in_place && (
                  <span className="text-xs bg-red-100 text-red-700 border border-red-200
                                   px-2 py-1 rounded-md font-bold uppercase tracking-wide">
                    DNAR in place
                  </span>
                )}
                {resident.mca_lacks_capacity && (
                  <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200
                                   px-2 py-1 rounded-md font-semibold">
                    MCA — lacks capacity
                  </span>
                )}
                {resident.interpreter_required && (
                  <span className="text-xs bg-blue-100 text-blue-700 border border-blue-200
                                   px-2 py-1 rounded-md">
                    Interpreter required
                  </span>
                )}
              </div>
            </div>

            {/* Key info row */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <InfoCell label="Room" value={
                resident.room
                  ? `${resident.room.wing?.name ? resident.room.wing.name + ' / ' : ''}Room ${resident.room.room_number}`
                  : 'Unassigned'
              } />
              <InfoCell label="Admitted" value={new Date(resident.admission_date).toLocaleDateString('en-GB')} />
              <InfoCell label="NHS number" value={resident.nhs_number
                ? resident.nhs_number.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3')
                : 'Not recorded'
              } />
              <InfoCell label="GP" value={resident.gp_name ?? 'Not recorded'} />
            </div>

            {/* KPI chips */}
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="flex items-center gap-1 bg-slate-100 rounded-full px-3 py-1 text-slate-700">
                <span className="font-semibold text-blue-700">{resident.active_medications_count}</span> active medications
              </span>
              {resident.open_incidents_count > 0 && (
                <span className="flex items-center gap-1 bg-red-50 rounded-full px-3 py-1 text-red-700">
                  <span className="font-semibold">{resident.open_incidents_count}</span> open incident{resident.open_incidents_count > 1 ? 's' : ''}
                </span>
              )}
              {resident.allergies.length > 0 && (
                <span className="flex items-center gap-1 bg-orange-50 rounded-full px-3 py-1 text-orange-700">
                  <span className="font-semibold">{resident.allergies.length}</span> known allerg{resident.allergies.length > 1 ? 'ies' : 'y'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 mb-4 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm whitespace-nowrap rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-700 text-white font-medium'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        {activeTab === 'overview' && <OverviewTab resident={resident} />}
        {activeTab === 'contacts' && <ContactsTab contacts={resident.contacts} />}
        {activeTab === 'risk' && <RiskTab assessments={resident.latest_risk_assessments} />}
        {activeTab === 'care-plan' && (
          <CarePlanTab plan={resident.current_care_plan} homeId={homeId} residentId={residentId} />
        )}
        {(activeTab === 'medications' || activeTab === 'notes') && (
          <div className="text-center py-10 text-slate-400 text-sm">
            {activeTab === 'medications' ? 'Medications' : 'Care notes'} — Phase 3b/3c
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab components ───────────────────────────────────────────────────────────

function OverviewTab({ resident }: { resident: ResidentProfile }) {
  return (
    <div className="space-y-6">
      {/* Allergies */}
      {resident.allergies.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Known allergies</h3>
          <div className="space-y-2">
            {resident.allergies.map((a) => (
              <div
                key={a.id}
                className={`rounded-lg border p-3 ${SEVERITY_COLOURS[a.severity] ?? SEVERITY_COLOURS.moderate}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{a.substance}</span>
                  <span className="text-xs uppercase tracking-wide">
                    {a.severity.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-sm mt-0.5 opacity-80">{a.reaction}</p>
                {a.notes && <p className="text-xs mt-1 opacity-70">{a.notes}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Personal details */}
      <section>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Personal details</h3>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          {resident.religion && <DetailItem label="Religion" value={resident.religion} />}
          {resident.ethnicity && <DetailItem label="Ethnicity" value={resident.ethnicity} />}
          {resident.first_language && <DetailItem label="First language" value={resident.first_language} />}
          {resident.gp_practice && <DetailItem label="GP surgery" value={resident.gp_practice} />}
          {resident.gp_phone && <DetailItem label="GP phone" value={resident.gp_phone} />}
          <DetailItem label="Funding source" value={
            { self_funded: 'Self-funded', local_authority: 'Local authority', chc: 'NHS CHC' }[resident.primary_funding_source]
            ?? resident.primary_funding_source
          } />
        </dl>
      </section>
    </div>
  );
}

function ContactsTab({ contacts }: { contacts: ResidentProfile['contacts'] }) {
  if (!contacts.length) {
    return <p className="text-slate-500 text-sm text-center py-6">No contacts recorded</p>;
  }

  return (
    <div className="space-y-3">
      {contacts.map((c) => (
        <div key={c.id} className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-slate-900">{c.name}</p>
              <p className="text-sm text-slate-500">{c.relationship}</p>
            </div>
            <div className="flex gap-1.5 flex-wrap justify-end">
              {c.is_primary_nok && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                  Primary NOK
                </span>
              )}
              {c.has_lpa_welfare && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                  LPA (welfare)
                </span>
              )}
              {c.has_lpa_finance && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                  LPA (finance)
                </span>
              )}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-600">
            {c.phone_primary && <span>📞 {c.phone_primary}</span>}
            {c.email && <span>✉ {c.email}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function RiskTab({ assessments }: { assessments: ResidentProfile['latest_risk_assessments'] }) {
  if (!assessments.length) {
    return <p className="text-slate-500 text-sm text-center py-6">No risk assessments recorded</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {assessments.map((a) => {
        const isOverdue = a.valid_until && new Date(a.valid_until) < new Date();
        return (
          <div
            key={a.id}
            className={`rounded-lg border p-4 ${isOverdue ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-slate-800 capitalize">
                {a.type.replace(/_/g, ' ')}
              </h4>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${RISK_LEVEL_COLOURS[a.risk_level] ?? 'bg-slate-100'}`}>
                {a.risk_level.replace(/_/g, ' ')}
              </span>
            </div>
            {a.score !== null && (
              <p className="text-2xl font-bold text-slate-900 mb-1">{a.score}</p>
            )}
            <div className="text-xs text-slate-500 space-y-0.5">
              <p>Assessed: {new Date(a.assessed_at).toLocaleDateString('en-GB')}</p>
              {a.valid_until && (
                <p className={isOverdue ? 'text-red-600 font-medium' : ''}>
                  {isOverdue ? '⚠ Overdue since: ' : 'Review by: '}
                  {new Date(a.valid_until).toLocaleDateString('en-GB')}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CarePlanTab({
  plan,
  homeId,
  residentId,
}: {
  plan: ResidentProfile['current_care_plan'];
  homeId: string;
  residentId: string;
}) {
  if (!plan) {
    return (
      <div className="text-center py-10">
        <p className="text-slate-500 text-sm mb-3">No current care plan</p>
        <Link
          href={`/homes/${homeId}/residents/${residentId}/care-plans/new`}
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white
                     hover:bg-blue-800 transition-colors"
        >
          Create care plan
        </Link>
      </div>
    );
  }

  const reviewDate = plan.next_review_date ? new Date(plan.next_review_date) : null;
  const isOverdue = reviewDate && reviewDate < new Date();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-xs bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-medium">
            {plan.status}
          </span>
          <span className="ml-2 text-xs text-slate-500">Version {plan.version}</span>
          {plan.approved_at && (
            <span className="ml-2 text-xs text-slate-500">
              Approved {new Date(plan.approved_at).toLocaleDateString('en-GB')}
            </span>
          )}
        </div>
        <Link
          href={`/homes/${homeId}/residents/${residentId}/care-plans/${plan.id}`}
          className="text-sm text-blue-600 hover:underline"
        >
          View full plan →
        </Link>
      </div>

      {reviewDate && (
        <div className={`rounded-lg p-3 text-sm ${isOverdue
          ? 'bg-red-50 border border-red-200 text-red-700'
          : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
          {isOverdue ? '⚠ Review overdue — ' : 'Next review: '}
          {reviewDate.toLocaleDateString('en-GB')}
        </div>
      )}
    </div>
  );
}

// ─── Small shared components ──────────────────────────────────────────────────

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-sm font-medium text-slate-900 mt-0.5 truncate">{value}</dd>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-900 mt-0.5">{value}</dd>
    </div>
  );
}

function ResidentSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4 animate-pulse">
      <div className="h-4 bg-slate-100 rounded w-48" />
      <div className="bg-white rounded-2xl border border-slate-200 p-6 h-48" />
      <div className="h-10 bg-slate-100 rounded-xl" />
      <div className="bg-white rounded-2xl border border-slate-200 p-6 h-64" />
    </div>
  );
}
