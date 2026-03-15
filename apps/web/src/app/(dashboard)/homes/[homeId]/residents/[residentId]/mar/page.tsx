'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { medicationsApi, type MarChart, type MarOutcome } from '@/lib/medications-api';

// ─── Outcome helpers ──────────────────────────────────────────────────────────

const OUTCOMES: { value: MarOutcome; label: string; colour: string }[] = [
  { value: 'given',            label: 'Given',           colour: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'refused',          label: 'Refused',         colour: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'not_available',    label: 'Not available',   colour: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'away',             label: 'Away',            colour: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'unable',           label: 'Unable',          colour: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: 'not_required',     label: 'Not required',    colour: 'bg-gray-100 text-gray-600 border-gray-200' },
  { value: 'self_administered',label: 'Self admin',      colour: 'bg-blue-100 text-blue-800 border-blue-200' },
];

function outcomeStyle(outcome: MarOutcome | null): string {
  if (!outcome) return 'bg-white border-gray-200 text-gray-400';
  return OUTCOMES.find((o) => o.value === outcome)?.colour ?? 'bg-gray-100 text-gray-600 border-gray-200';
}

function outcomeLabel(outcome: MarOutcome | null): string {
  if (!outcome) return '—';
  return OUTCOMES.find((o) => o.value === outcome)?.label ?? outcome;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ─── Administration modal ─────────────────────────────────────────────────────

interface AdminModalProps {
  medicationId: string;
  drugName: string;
  scheduledTime: string;
  isControlledDrug: boolean;
  isPrn: boolean;
  existingOutcome: MarOutcome | null;
  onClose: () => void;
  onSubmit: (data: {
    medication_id: string;
    scheduled_time: string;
    outcome: MarOutcome;
    witness_id?: string;
    notes?: string;
    is_prn?: boolean;
    prn_indication?: string;
  }) => Promise<void>;
}

function AdminModal({
  medicationId, drugName, scheduledTime,
  isControlledDrug, isPrn, existingOutcome,
  onClose, onSubmit,
}: AdminModalProps) {
  const [outcome, setOutcome] = useState<MarOutcome>('given');
  const [witnessId, setWitnessId] = useState('');
  const [notes, setNotes] = useState('');
  const [prnIndication, setPrnIndication] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (existingOutcome) return null; // already recorded — modal should not open

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isControlledDrug && outcome === 'given' && !witnessId.trim()) {
      setError('A witness ID is required for controlled drug administration.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit({
        medication_id: medicationId,
        scheduled_time: scheduledTime,
        outcome,
        witness_id: witnessId.trim() || undefined,
        notes: notes.trim() || undefined,
        is_prn: isPrn,
        prn_indication: isPrn ? prnIndication.trim() || undefined : undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Failed to record administration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Record Administration</h2>
        <p className="text-sm text-gray-500 mb-5">
          <span className="font-medium text-gray-700">{drugName}</span>
          {' · '}{formatTime(scheduledTime)}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Outcome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Outcome</label>
            <div className="grid grid-cols-2 gap-2">
              {OUTCOMES.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setOutcome(o.value)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    outcome === o.value
                      ? `${o.colour} ring-2 ring-offset-1 ring-current`
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* PRN indication */}
          {isPrn && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Indication <span className="text-gray-400 font-normal">(reason for PRN administration)</span>
              </label>
              <textarea
                rows={2}
                value={prnIndication}
                onChange={(e) => setPrnIndication(e.target.value)}
                placeholder="e.g. Resident requested for pain at 4/10"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          )}

          {/* Witness for CD */}
          {isControlledDrug && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Witness ID{' '}
                <span className="text-red-500">*</span>
                <span className="text-gray-400 font-normal ml-1">(required for controlled drugs)</span>
              </label>
              <input
                type="text"
                value={witnessId}
                onChange={(e) => setWitnessId(e.target.value)}
                placeholder="Staff UUID or ID"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MarChartPage() {
  const { homeId, residentId } = useParams<{ homeId: string; residentId: string }>();
  const router = useRouter();
  const { user, activeHomeId } = useAuthStore();
  const token = typeof window !== 'undefined' ? localStorage.getItem('cc_at') ?? '' : '';

  const [date, setDate] = useState(() => toDateInput(new Date()));
  const [chart, setChart] = useState<MarChart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Admin modal state
  const [modal, setModal] = useState<{
    medicationId: string;
    drugName: string;
    scheduledTime: string;
    isControlledDrug: boolean;
    isPrn: boolean;
    existingOutcome: MarOutcome | null;
  } | null>(null);

  const loadChart = useCallback(async (d: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await medicationsApi.getMarChart(homeId, residentId, d, token);
      setChart(data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load MAR chart');
    } finally {
      setLoading(false);
    }
  }, [homeId, residentId, token]);

  useEffect(() => { loadChart(date); }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdminister = async (data: Parameters<AdminModalProps['onSubmit']>[0]) => {
    await medicationsApi.recordAdministration(homeId, residentId, data, token);
    await loadChart(date); // refresh chart
  };

  const goDate = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(toDateInput(d));
  };

  const totalMeds = chart?.rows.length ?? 0;
  const regularRows = chart?.rows.filter((r) => !r.medication.is_prn) ?? [];
  const prnRows = chart?.rows.filter((r) => r.medication.is_prn) ?? [];

  // Compliance summary
  const totalSlots = regularRows.reduce((s, r) => s + r.slots.length, 0);
  const givenSlots = regularRows.reduce(
    (s, r) => s + r.slots.filter((sl) => sl.outcome === 'given' || sl.outcome === 'self_administered').length, 0,
  );
  const pendingSlots = regularRows.reduce(
    (s, r) => s + r.slots.filter((sl) => sl.outcome === null && new Date(sl.scheduled_time) < new Date()).length, 0,
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">MAR Chart</h1>
            <p className="text-sm text-gray-500">Medication Administration Record</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* Date navigator + summary cards */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Date picker */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
            <button
              onClick={() => goDate(-1)}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
              aria-label="Previous day"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-sm font-medium text-gray-800 border-none outline-none bg-transparent"
            />
            <button
              onClick={() => goDate(1)}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
              aria-label="Next day"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={() => setDate(toDateInput(new Date()))}
              className="ml-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              Today
            </button>
          </div>

          {/* Stats */}
          {chart && !loading && (
            <div className="flex gap-3 flex-wrap">
              <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm text-center min-w-[80px]">
                <div className="text-xl font-bold text-gray-900">{totalMeds}</div>
                <div className="text-xs text-gray-500">Medications</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 shadow-sm text-center min-w-[80px]">
                <div className="text-xl font-bold text-green-700">{givenSlots}</div>
                <div className="text-xs text-green-600">Given</div>
              </div>
              {pendingSlots > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 shadow-sm text-center min-w-[80px]">
                  <div className="text-xl font-bold text-red-700">{pendingSlots}</div>
                  <div className="text-xs text-red-600">Overdue</div>
                </div>
              )}
              <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm text-center min-w-[80px]">
                <div className="text-xl font-bold text-gray-900">{totalSlots}</div>
                <div className="text-xs text-gray-500">Total slots</div>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
                <div className="flex gap-2">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-10 bg-gray-100 rounded-lg w-20" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Regular medications */}
        {!loading && regularRows.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Regular Medications
            </h2>
            <div className="space-y-3">
              {regularRows.map((row) => (
                <div
                  key={row.medication.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                >
                  {/* Med header */}
                  <div className="px-4 py-3 border-b border-gray-100 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{row.medication.drug_name}</span>
                        {row.medication.strength && (
                          <span className="text-sm text-gray-500">{row.medication.strength}</span>
                        )}
                        {row.medication.form && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {row.medication.form}
                          </span>
                        )}
                        {row.medication.is_controlled_drug && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                            CD Sch.{row.medication.cd_schedule ?? '?'}
                          </span>
                        )}
                        {row.medication.status === 'on_hold' && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                            ON HOLD
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {row.medication.dose} · {row.medication.route} · {row.medication.frequency.replace(/_/g, ' ')}
                      </p>
                      {row.medication.instructions && (
                        <p className="text-xs text-blue-600 mt-1 italic">{row.medication.instructions}</p>
                      )}
                    </div>
                    {row.medication.is_controlled_drug && row.medication.stock_on_hand !== null && (
                      <div className="shrink-0 text-right">
                        <div className={`text-sm font-bold ${row.medication.stock_on_hand <= 7 ? 'text-red-600' : 'text-gray-700'}`}>
                          {row.medication.stock_on_hand}
                        </div>
                        <div className="text-xs text-gray-400">in stock</div>
                      </div>
                    )}
                  </div>

                  {/* Time slots */}
                  <div className="px-4 py-3">
                    {row.slots.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">No scheduled times set</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {row.slots.map((slot) => {
                          const isPast = new Date(slot.scheduled_time) < new Date();
                          const isOverdue = isPast && !slot.outcome;
                          return (
                            <button
                              key={slot.scheduled_time}
                              onClick={() => {
                                if (slot.outcome || row.medication.status === 'on_hold') return;
                                setModal({
                                  medicationId: row.medication.id,
                                  drugName: row.medication.drug_name,
                                  scheduledTime: slot.scheduled_time,
                                  isControlledDrug: row.medication.is_controlled_drug,
                                  isPrn: false,
                                  existingOutcome: null,
                                });
                              }}
                              className={`
                                min-w-[80px] px-3 py-2 rounded-lg border text-xs font-medium
                                transition-all text-center
                                ${isOverdue
                                  ? 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100'
                                  : slot.outcome
                                    ? `${outcomeStyle(slot.outcome)} cursor-default`
                                    : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50'
                                }
                                ${row.medication.status === 'on_hold' ? 'opacity-50 cursor-not-allowed' : ''}
                              `}
                            >
                              <div className="font-semibold">{formatTime(slot.scheduled_time)}</div>
                              <div className="mt-0.5 truncate">
                                {slot.outcome ? outcomeLabel(slot.outcome) : isOverdue ? 'Overdue' : 'Due'}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PRN medications */}
        {!loading && prnRows.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              PRN (When Required)
            </h2>
            <div className="space-y-3">
              {prnRows.map((row) => (
                <div
                  key={row.medication.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                >
                  {/* Med header */}
                  <div className="px-4 py-3 border-b border-gray-100 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{row.medication.drug_name}</span>
                        {row.medication.strength && (
                          <span className="text-sm text-gray-500">{row.medication.strength}</span>
                        )}
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          PRN
                        </span>
                        {row.medication.is_controlled_drug && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                            CD
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {row.medication.dose} · {row.medication.route}
                      </p>
                      {row.medication.prn_criteria && (
                        <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-1">
                          {row.medication.prn_criteria}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setModal({
                        medicationId: row.medication.id,
                        drugName: row.medication.drug_name,
                        scheduledTime: new Date().toISOString(),
                        isControlledDrug: row.medication.is_controlled_drug,
                        isPrn: true,
                        existingOutcome: null,
                      })}
                      className="shrink-0 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"
                    >
                      + Record
                    </button>
                  </div>

                  {/* PRN entries for the day */}
                  <div className="px-4 py-3">
                    {row.prn_entries.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">No administrations recorded today</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {row.prn_entries.map((entry) => (
                          <div
                            key={entry.mar_entry_id}
                            className={`px-3 py-2 rounded-lg border text-xs ${outcomeStyle(entry.outcome)}`}
                          >
                            <div className="font-semibold">{formatTime(entry.scheduled_time)}</div>
                            <div>{outcomeLabel(entry.outcome)}</div>
                            {entry.prn_indication && (
                              <div className="mt-1 text-gray-500 max-w-[120px] truncate" title={entry.prn_indication}>
                                {entry.prn_indication}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {!loading && chart && chart.rows.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">💊</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No active medications</h3>
            <p className="text-sm text-gray-500">
              There are no active or on-hold medications for this resident.
            </p>
          </div>
        )}
      </main>

      {/* Administration modal */}
      {modal && !modal.existingOutcome && (
        <AdminModal
          {...modal}
          onClose={() => setModal(null)}
          onSubmit={handleAdminister}
        />
      )}
    </div>
  );
}
