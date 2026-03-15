'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { woundsApi, type Wound, type WoundStatus, type WoundAssessment } from '../../../../../../../../../lib/wounds-api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<WoundStatus, string> = {
  open:          'bg-red-100 text-red-800 border-red-200',
  deteriorating: 'bg-orange-100 text-orange-800 border-orange-200',
  healing:       'bg-blue-100 text-blue-800 border-blue-200',
  healed:        'bg-green-100 text-green-800 border-green-200',
};

const STATUS_LABELS: Record<WoundStatus, string> = {
  open: 'Open', deteriorating: 'Deteriorating', healing: 'Healing', healed: 'Healed',
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isDressingDue(nextChange: string | null | undefined): boolean {
  if (!nextChange) return false;
  return new Date(nextChange) <= new Date();
}

// ─── Assessment modal ─────────────────────────────────────────────────────────

interface AssessmentModalProps {
  woundSite: string;
  onClose: () => void;
  onSave: (data: object) => Promise<void>;
}

function AssessmentModal({ woundSite, onClose, onSave }: AssessmentModalProps) {
  const [assessedAt, setAssessedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [lengthMm, setLengthMm] = useState('');
  const [widthMm, setWidthMm] = useState('');
  const [pushScore, setPushScore] = useState('');
  const [dressing, setDressing] = useState('');
  const [nextChange, setNextChange] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await onSave({
        assessed_at:    new Date(assessedAt).toISOString(),
        length_mm:      lengthMm   ? parseInt(lengthMm, 10)  : undefined,
        width_mm:       widthMm    ? parseInt(widthMm, 10)   : undefined,
        push_score:     pushScore  ? parseInt(pushScore, 10) : undefined,
        dressing_used:  dressing   || undefined,
        next_change_date: nextChange || undefined,
        notes:          notes      || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Failed to save assessment');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">New Wound Assessment</h2>
        <p className="text-sm text-gray-500 mb-5">{woundSite}</p>
        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assessment date &amp; time</label>
            <input type="datetime-local" value={assessedAt} onChange={(e) => setAssessedAt(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Length (mm)</label>
              <input type="number" min="0" value={lengthMm} onChange={(e) => setLengthMm(e.target.value)}
                placeholder="—"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Width (mm)</label>
              <input type="number" min="0" value={widthMm} onChange={(e) => setWidthMm(e.target.value)}
                placeholder="—"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">PUSH score (0–17)</label>
              <input type="number" min="0" max="17" value={pushScore} onChange={(e) => setPushScore(e.target.value)}
                placeholder="—"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dressing used</label>
            <input type="text" value={dressing} onChange={(e) => setDressing(e.target.value)}
              placeholder="e.g. Mepilex Border, Aquacel Ag"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Next dressing change</label>
            <input type="date" value={nextChange} onChange={(e) => setNextChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-y" />
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{error}</div>}

          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save assessment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Wound card ───────────────────────────────────────────────────────────────

function pushScoreBadge(score: number | null | undefined): string {
  if (score === null || score === undefined) return '';
  if (score >= 13) return 'bg-red-100 text-red-700';
  if (score >= 7)  return 'bg-orange-100 text-orange-700';
  return 'bg-green-100 text-green-700';
}

interface WoundCardProps {
  wound: Wound;
  onAddAssessment: (wound: Wound) => void;
  onUpdateStatus: (wound: Wound) => void;
}

function WoundCard({ wound, onAddAssessment, onUpdateStatus }: WoundCardProps) {
  const [expanded, setExpanded] = useState(false);
  const latest = wound.assessments[0] ?? null;
  const dressingDue = isDressingDue(latest?.next_change_date);

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
      wound.status === 'deteriorating' ? 'border-orange-300' :
      wound.status === 'healed'        ? 'border-green-200 opacity-75' : 'border-gray-200'
    }`}>
      {/* Header */}
      <div className="px-4 py-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-gray-900">{wound.site}</span>
            <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${STATUS_STYLE[wound.status]}`}>
              {STATUS_LABELS[wound.status]}
            </span>
            {wound.wound_type && (
              <span className="text-xs text-gray-500">{wound.wound_type}</span>
            )}
          </div>
          <p className="text-xs text-gray-400">
            Onset: {formatDate(wound.onset_date)}
            {wound.healed_date && ` · Healed: ${formatDate(wound.healed_date)}`}
          </p>
        </div>

        {wound.status !== 'healed' && (
          <div className="flex gap-2 shrink-0">
            <button onClick={() => onUpdateStatus(wound)}
              className="px-3 py-1 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
              Status
            </button>
            <button onClick={() => onAddAssessment(wound)}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              + Assess
            </button>
          </div>
        )}
      </div>

      {/* Latest assessment summary */}
      {latest && (
        <div className={`px-4 py-3 border-t ${dressingDue ? 'bg-orange-50 border-orange-100' : 'border-gray-100 bg-gray-50'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">Last assessment: {formatDate(latest.assessed_at)}</span>
            {wound.assessments.length > 1 && (
              <button onClick={() => setExpanded((v) => !v)}
                className="text-xs text-blue-600 hover:underline">
                {expanded ? 'Hide history' : `${wound.assessments.length - 1} earlier`}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-4">
            {latest.push_score !== null && (
              <div className="text-center">
                <span className={`text-lg font-bold px-2 py-0.5 rounded ${pushScoreBadge(latest.push_score)}`}>
                  {latest.push_score}
                </span>
                <div className="text-xs text-gray-400 mt-0.5">PUSH score</div>
              </div>
            )}
            {(latest.length_mm || latest.width_mm) && (
              <div className="text-center">
                <span className="text-sm font-semibold text-gray-700">
                  {latest.length_mm ?? '?'}×{latest.width_mm ?? '?'} mm
                </span>
                <div className="text-xs text-gray-400 mt-0.5">Dimensions</div>
              </div>
            )}
            {latest.dressing_used && (
              <div>
                <span className="text-xs text-gray-600">{latest.dressing_used}</span>
                <div className="text-xs text-gray-400">Dressing</div>
              </div>
            )}
            {latest.next_change_date && (
              <div>
                <span className={`text-xs font-medium ${dressingDue ? 'text-orange-700' : 'text-gray-600'}`}>
                  {dressingDue ? '⚠ Overdue — ' : ''}{formatDate(latest.next_change_date)}
                </span>
                <div className="text-xs text-gray-400">Next change</div>
              </div>
            )}
          </div>
          {latest.notes && <p className="mt-2 text-xs text-gray-500 italic">{latest.notes}</p>}
        </div>
      )}

      {/* Assessment history */}
      {expanded && wound.assessments.slice(1).map((a) => (
        <div key={a.id} className="px-4 py-3 border-t border-gray-100 bg-white">
          <div className="text-xs text-gray-400 mb-1">{formatDate(a.assessed_at)}</div>
          <div className="flex flex-wrap gap-3">
            {a.push_score !== null && <span className="text-xs text-gray-600">PUSH: <strong>{a.push_score}</strong></span>}
            {(a.length_mm || a.width_mm) && (
              <span className="text-xs text-gray-600">{a.length_mm}×{a.width_mm} mm</span>
            )}
            {a.dressing_used && <span className="text-xs text-gray-600">{a.dressing_used}</span>}
            {a.notes && <span className="text-xs text-gray-500 italic">{a.notes}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Status update modal ──────────────────────────────────────────────────────

function StatusModal({
  wound,
  onClose,
  onSave,
}: { wound: Wound; onClose: () => void; onSave: (data: object) => Promise<void> }) {
  const [status, setStatus] = useState<WoundStatus>(wound.status);
  const [healedDate, setHealedDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await onSave({ status, healed_date: status === 'healed' ? healedDate : undefined });
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Failed to update status');
      setSaving(false);
    }
  };

  const statuses: WoundStatus[] = ['open', 'healing', 'deteriorating', 'healed'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Update Wound Status</h2>
        <p className="text-sm text-gray-500 mb-5">{wound.site}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {statuses.map((s) => (
              <button key={s} type="button" onClick={() => setStatus(s)}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                  status === s ? `${STATUS_STYLE[s]} ring-2 ring-offset-1 ring-current` : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'
                }`}>
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          {status === 'healed' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Healed date</label>
              <input type="date" value={healedDate} onChange={(e) => setHealedDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          )}
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WoundsPage() {
  const { homeId, residentId } = useParams<{ homeId: string; residentId: string }>();
  const router = useRouter();
  const token = typeof window !== 'undefined' ? localStorage.getItem('cc_at') ?? '' : '';

  const [wounds, setWounds] = useState<Wound[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [includeHealed, setIncludeHealed] = useState(false);

  const [assessModal, setAssessModal] = useState<Wound | null>(null);
  const [statusModal, setStatusModal] = useState<Wound | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  // New wound form state
  const [newSite, setNewSite] = useState('');
  const [newType, setNewType] = useState('');
  const [newOnset, setNewOnset] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await woundsApi.list(homeId, residentId, includeHealed, token);
      setWounds(data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load wounds');
    } finally {
      setLoading(false);
    }
  }, [homeId, residentId, includeHealed, token]);

  useEffect(() => { load(); }, [includeHealed]); // eslint-disable-line

  const handleAddAssessment = async (wound: Wound, data: object) => {
    await woundsApi.addAssessment(homeId, residentId, wound.id, data, token);
    await load();
  };

  const handleUpdateStatus = async (wound: Wound, data: object) => {
    await woundsApi.updateStatus(homeId, residentId, wound.id, data as any, token);
    await load();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSite.trim()) { setCreateError('Site is required'); return; }
    setCreating(true); setCreateError('');
    try {
      await woundsApi.create(homeId, residentId, {
        site: newSite.trim(),
        wound_type: newType.trim() || undefined,
        onset_date: newOnset || undefined,
      }, token);
      setShowNewForm(false);
      setNewSite(''); setNewType(''); setNewOnset('');
      await load();
    } catch (err: any) {
      setCreateError(err.message ?? 'Failed to create wound');
      setCreating(false);
    }
  };

  const openWounds = wounds.filter((w) => w.status !== 'healed');
  const healedWounds = wounds.filter((w) => w.status === 'healed');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600" aria-label="Back">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-900">Wound Management</h1>
            <p className="text-sm text-gray-500">PUSH scores, dressing tracking &amp; healing progress</p>
          </div>
          <button onClick={() => setShowNewForm(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            + New wound
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-6 space-y-5">

        {/* New wound inline form */}
        {showNewForm && (
          <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Record new wound</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site <span className="text-red-500">*</span></label>
                <input type="text" value={newSite} onChange={(e) => setNewSite(e.target.value)}
                  placeholder="e.g. Sacrum, Left heel, Right elbow"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Wound type</label>
                <input type="text" value={newType} onChange={(e) => setNewType(e.target.value)}
                  placeholder="e.g. Category 2 pressure ulcer, Venous leg ulcer"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Onset date</label>
                <input type="date" value={newOnset} onChange={(e) => setNewOnset(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              {createError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{createError}</div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowNewForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {creating ? 'Creating…' : 'Create wound'}
                </button>
              </div>
            </form>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                <div className="flex gap-3 mb-3">
                  <div className="h-5 bg-gray-200 rounded w-32" />
                  <div className="h-5 bg-gray-100 rounded-full w-20" />
                </div>
                <div className="h-16 bg-gray-50 rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {/* Active wounds */}
        {!loading && openWounds.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Active wounds ({openWounds.length})
            </h2>
            {openWounds.map((w) => (
              <WoundCard key={w.id} wound={w}
                onAddAssessment={() => setAssessModal(w)}
                onUpdateStatus={() => setStatusModal(w)} />
            ))}
          </section>
        )}

        {/* Healed wounds toggle */}
        {!loading && (
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input type="checkbox" checked={includeHealed} onChange={(e) => setIncludeHealed(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              Show healed wounds
            </label>
            {healedWounds.length > 0 && includeHealed && (
              <span className="text-xs text-gray-400">({healedWounds.length} healed)</span>
            )}
          </div>
        )}

        {/* Healed wounds */}
        {!loading && includeHealed && healedWounds.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Healed</h2>
            {healedWounds.map((w) => (
              <WoundCard key={w.id} wound={w}
                onAddAssessment={() => {}}
                onUpdateStatus={() => {}} />
            ))}
          </section>
        )}

        {/* Empty state */}
        {!loading && wounds.length === 0 && !showNewForm && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🩹</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No wounds recorded</h3>
            <p className="text-sm text-gray-500 mb-5">Record a wound to start tracking its healing progress.</p>
            <button onClick={() => setShowNewForm(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
              Record first wound
            </button>
          </div>
        )}
      </main>

      {/* Modals */}
      {assessModal && (
        <AssessmentModal
          woundSite={assessModal.site}
          onClose={() => setAssessModal(null)}
          onSave={(data) => handleAddAssessment(assessModal, data)}
        />
      )}
      {statusModal && (
        <StatusModal
          wound={statusModal}
          onClose={() => setStatusModal(null)}
          onSave={(data) => handleUpdateStatus(statusModal, data)}
        />
      )}
    </div>
  );
}
