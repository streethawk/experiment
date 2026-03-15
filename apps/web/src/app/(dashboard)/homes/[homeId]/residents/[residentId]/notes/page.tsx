'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '../../../../../../../../../store/auth.store';
import {
  careNotesApi,
  type CareNote,
  type CareNoteShift,
  type CareNoteCategory,
} from '../../../../../../../../../lib/care-notes-api';

// ─── Constants ────────────────────────────────────────────────────────────────

const SHIFT_LABELS: Record<CareNoteShift, string> = {
  early: 'Early (07:00–15:00)',
  late:  'Late  (15:00–23:00)',
  night: 'Night (23:00–07:00)',
};

const SHIFT_COLOURS: Record<CareNoteShift, string> = {
  early: 'bg-amber-50 text-amber-700 border-amber-200',
  late:  'bg-blue-50 text-blue-700 border-blue-200',
  night: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

const CATEGORY_LABELS: Record<CareNoteCategory, string> = {
  personal_care:   'Personal care',
  nutrition:       'Nutrition',
  hydration:       'Hydration',
  medication:      'Medication',
  mobility:        'Mobility',
  continence:      'Continence',
  sleep:           'Sleep',
  mood_behaviour:  'Mood & behaviour',
  medical:         'Medical',
  social_activity: 'Social & activities',
  wound_care:      'Wound care',
  repositioning:   'Repositioning',
  handover:        'Handover',
  general:         'General',
};

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as CareNoteCategory[];
const ALL_SHIFTS: CareNoteShift[] = ['early', 'late', 'night'];

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function getMoodEmoji(score: number | null): string {
  if (score === null) return '';
  if (score >= 8) return '😊';
  if (score >= 5) return '😐';
  return '😔';
}

// ─── New note form ────────────────────────────────────────────────────────────

interface NewNoteFormProps {
  onSave: (data: object) => Promise<void>;
  onCancel: () => void;
}

function NewNoteForm({ onSave, onCancel }: NewNoteFormProps) {
  const [shift, setShift] = useState<CareNoteShift>('early');
  const [categories, setCategories] = useState<CareNoteCategory[]>(['general']);
  const [note, setNote] = useState('');
  const [moodScore, setMoodScore] = useState<string>('');
  const [foodPct, setFoodPct] = useState<string>('');
  const [fluidMl, setFluidMl] = useState<string>('');
  const [isFlagged, setIsFlagged] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  const toggleCategory = (cat: CareNoteCategory) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) { setError('Note text is required'); return; }
    if (categories.length === 0) { setError('Select at least one category'); return; }
    if (isFlagged && !flagReason.trim()) { setError('Please provide a flag reason'); return; }

    setSaving(true);
    setError('');
    try {
      await onSave({
        shift,
        categories,
        note: note.trim(),
        mood_score:      moodScore ? parseInt(moodScore, 10) : undefined,
        food_intake_pct: foodPct   ? parseInt(foodPct, 10)   : undefined,
        fluid_intake_ml: fluidMl   ? parseInt(fluidMl, 10)   : undefined,
        is_flagged:  isFlagged,
        flag_reason: isFlagged ? flagReason.trim() : undefined,
      });
    } catch (err: any) {
      setError(err.message ?? 'Failed to save note');
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-5">
      <h3 className="text-base font-semibold text-gray-900 mb-4">New care note</h3>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Shift */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Shift</label>
          <div className="flex gap-2">
            {ALL_SHIFTS.map((s) => (
              <button key={s} type="button" onClick={() => setShift(s)}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all capitalize ${
                  shift === s ? SHIFT_COLOURS[s] + ' ring-2 ring-offset-1 ring-current' : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_CATEGORIES.map((cat) => (
              <button key={cat} type="button" onClick={() => toggleCategory(cat)}
                className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-all ${
                  categories.includes(cat)
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-200 text-gray-600 bg-white hover:border-blue-300'
                }`}>
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Note text */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
          <textarea ref={textareaRef} rows={4} value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Describe the care provided, observations, and any concerns…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y" />
          <div className="text-right text-xs text-gray-400 mt-0.5">{note.length} chars</div>
        </div>

        {/* Observations row */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Mood (1–10)</label>
            <input type="number" min="1" max="10" value={moodScore}
              onChange={(e) => setMoodScore(e.target.value)}
              placeholder="—"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Food intake %</label>
            <input type="number" min="0" max="100" value={foodPct}
              onChange={(e) => setFoodPct(e.target.value)}
              placeholder="—"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Fluid (ml)</label>
            <input type="number" min="0" value={fluidMl}
              onChange={(e) => setFluidMl(e.target.value)}
              placeholder="—"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
        </div>

        {/* Flag */}
        <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
          <input id="flag" type="checkbox" checked={isFlagged}
            onChange={(e) => setIsFlagged(e.target.checked)}
            className="mt-0.5 rounded border-gray-300 text-red-600 focus:ring-red-500" />
          <div className="flex-1">
            <label htmlFor="flag" className="text-sm font-medium text-gray-700 cursor-pointer">
              Flag for manager attention
            </label>
            {isFlagged && (
              <input type="text" value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                placeholder="Reason for flagging…"
                className="mt-2 w-full border border-red-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none" />
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save note'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Note card ────────────────────────────────────────────────────────────────

function NoteCard({ note, onFlag }: { note: CareNote; onFlag: (note: CareNote) => void }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = note.note.length > 300;

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${note.is_flagged ? 'border-red-200' : 'border-gray-200'}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold capitalize ${SHIFT_COLOURS[note.shift]}`}>
            {note.shift}
          </span>
          {note.categories.map((cat) => (
            <span key={cat} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">
              {CATEGORY_LABELS[cat]}
            </span>
          ))}
          {note.is_flagged && (
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 text-xs font-semibold">
              🚩 {note.flag_reason}
            </span>
          )}
        </div>
        <time className="text-xs text-gray-400 shrink-0 mt-0.5">{formatDateTime(note.created_at)}</time>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <p className={`text-sm text-gray-800 whitespace-pre-wrap ${!expanded && isLong ? 'line-clamp-4' : ''}`}>
          {note.note}
        </p>
        {isLong && (
          <button onClick={() => setExpanded((v) => !v)}
            className="mt-1 text-xs text-blue-600 hover:underline">
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>

      {/* Observations */}
      {(note.mood_score !== null || note.food_intake_pct !== null || note.fluid_intake_ml !== null) && (
        <div className="px-4 pb-3 flex gap-4">
          {note.mood_score !== null && (
            <span className="text-xs text-gray-500">
              {getMoodEmoji(note.mood_score)} Mood: <strong>{note.mood_score}/10</strong>
            </span>
          )}
          {note.food_intake_pct !== null && (
            <span className="text-xs text-gray-500">
              🍽 Food: <strong>{note.food_intake_pct}%</strong>
            </span>
          )}
          {note.fluid_intake_ml !== null && (
            <span className="text-xs text-gray-500">
              💧 Fluid: <strong>{note.fluid_intake_ml}ml</strong>
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 pb-3 flex items-center justify-between">
        <div className="text-xs text-gray-400">
          {note.edit_history.length > 0 && (
            <span>Edited {note.edit_history.length}×</span>
          )}
        </div>
        {!note.is_flagged && (
          <button onClick={() => onFlag(note)}
            className="text-xs text-gray-400 hover:text-red-600 transition-colors">
            Flag
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CareNotesPage() {
  const { homeId, residentId } = useParams<{ homeId: string; residentId: string }>();
  const router = useRouter();
  const token = typeof window !== 'undefined' ? localStorage.getItem('cc_at') ?? '' : '';

  const [notes, setNotes] = useState<CareNote[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Filters
  const [shiftFilter, setShiftFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadNotes = useCallback(async (reset = true) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    setError('');
    try {
      const result = await careNotesApi.list(homeId, residentId, {
        shift:    shiftFilter    || undefined,
        category: categoryFilter || undefined,
        flagged:  flaggedOnly    || undefined,
        search:   search         || undefined,
        cursor:   reset ? undefined : cursor ?? undefined,
        limit: 20,
      }, token);
      setNotes((prev) => reset ? result.data : [...prev, ...result.data]);
      setCursor(result.next_cursor);
      setHasMore(result.has_more);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load care notes');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [homeId, residentId, shiftFilter, categoryFilter, flaggedOnly, search, token, cursor]);

  useEffect(() => { loadNotes(true); }, [shiftFilter, categoryFilter, flaggedOnly, search]); // eslint-disable-line

  const handleCreate = async (data: object) => {
    await careNotesApi.create(homeId, residentId, data, token);
    setShowForm(false);
    await loadNotes(true);
  };

  const handleFlag = async (note: CareNote) => {
    const reason = window.prompt('Flag reason (required):');
    if (!reason?.trim()) return;
    try {
      await careNotesApi.update(homeId, residentId, note.id, { is_flagged: true, flag_reason: reason.trim() }, token);
      await loadNotes(true);
    } catch (err: any) {
      alert(err.message ?? 'Failed to flag note');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600" aria-label="Back">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-900">Care Notes</h1>
            <p className="text-sm text-gray-500">Shift notes, observations &amp; handover</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            + New note
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6 space-y-5">

        {/* New note form */}
        {showForm && (
          <NewNoteForm onSave={handleCreate} onCancel={() => setShowForm(false)} />
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex flex-wrap gap-3 items-center shadow-sm">
          {/* Search */}
          <input
            type="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search notes…"
            className="flex-1 min-w-[200px] border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />

          {/* Shift filter */}
          <select value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
            <option value="">All shifts</option>
            {ALL_SHIFTS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>

          {/* Category filter */}
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
            <option value="">All categories</option>
            {ALL_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>

          {/* Flagged toggle */}
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)}
              className="rounded border-gray-300 text-red-600 focus:ring-red-500" />
            Flagged only
          </label>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                <div className="flex gap-2 mb-3">
                  <div className="h-5 bg-gray-200 rounded-full w-16" />
                  <div className="h-5 bg-gray-100 rounded-full w-24" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-full" />
                  <div className="h-3 bg-gray-100 rounded w-4/5" />
                  <div className="h-3 bg-gray-100 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Notes timeline */}
        {!loading && notes.length > 0 && (
          <div className="space-y-3">
            {notes.map((note) => (
              <NoteCard key={note.id} note={note} onFlag={handleFlag} />
            ))}
          </div>
        )}

        {/* Load more */}
        {!loading && hasMore && (
          <div className="text-center">
            <button
              onClick={() => loadNotes(false)}
              disabled={loadingMore}
              className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && notes.length === 0 && !showForm && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📝</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No care notes yet</h3>
            <p className="text-sm text-gray-500 mb-5">
              {shiftFilter || categoryFilter || flaggedOnly || search
                ? 'No notes match the current filters.'
                : 'Start recording shift notes for this resident.'}
            </p>
            {!(shiftFilter || categoryFilter || flaggedOnly || search) && (
              <button onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                Write first note
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
