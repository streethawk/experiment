'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { rotaApi, type WeekRota, type Shift, type TodayShift, type ClockMethod } from '@/lib/rota-api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SHIFT_COLOURS: Record<string, string> = {
  early:  'bg-amber-50 border-amber-200 text-amber-800',
  late:   'bg-blue-50 border-blue-200 text-blue-800',
  night:  'bg-indigo-50 border-indigo-200 text-indigo-800',
  split:  'bg-purple-50 border-purple-200 text-purple-800',
  custom: 'bg-gray-50 border-gray-200 text-gray-700',
};

const STATUS_DOT: Record<string, string> = {
  scheduled:   'bg-gray-300',
  confirmed:   'bg-blue-400',
  in_progress: 'bg-green-400 animate-pulse',
  completed:   'bg-green-500',
  absent:      'bg-red-500',
  cancelled:   'bg-gray-200',
};

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function toMonday(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + n);
  return toDateStr(d);
}

function shortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ─── Clock-in/out panel ───────────────────────────────────────────────────────

interface ClockPanelProps {
  shift: TodayShift;
  homeId: string;
  token: string;
  onDone: () => void;
}

function ClockPanel({ shift, homeId, token, onDone }: ClockPanelProps) {
  const [method, setMethod] = useState<ClockMethod>('pin');
  const [overrideReason, setOverrideReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isIn = shift.clock_status === 'not_clocked_in';
  const label = isIn ? 'Clock in' : 'Clock out';

  const METHODS: { value: ClockMethod; label: string }[] = [
    { value: 'pin',       label: 'PIN' },
    { value: 'qr_code',   label: 'QR code' },
    { value: 'nfc',       label: 'NFC' },
    { value: 'manual',    label: 'Manual override' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (isIn) {
        await rotaApi.clockIn(homeId, shift.id, {
          method,
          override_reason: method === 'manual' ? overrideReason : undefined,
        }, token);
      } else {
        await rotaApi.clockOut(homeId, shift.id, {
          method,
          override_reason: method === 'manual' ? overrideReason : undefined,
        }, token);
      }
      onDone();
    } catch (err: any) {
      setError(err.message ?? 'Failed');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
      <div className="flex gap-2 flex-wrap">
        {METHODS.map((m) => (
          <button key={m.value} type="button" onClick={() => setMethod(m.value)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              method === m.value ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-600 bg-white hover:border-blue-300'
            }`}>
            {m.label}
          </button>
        ))}
      </div>
      {method === 'manual' && (
        <input type="text" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)}
          placeholder="Override reason (required)"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button type="submit" disabled={saving}
        className={`w-full py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 ${
          isIn ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'
        }`}>
        {saving ? 'Saving…' : label}
      </button>
    </form>
  );
}

// ─── Today panel ─────────────────────────────────────────────────────────────

function TodayPanel({ homeId, token }: { homeId: string; token: string }) {
  const [shifts, setShifts] = useState<TodayShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeClockShift, setActiveClockShift] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await rotaApi.getToday(homeId, token);
      setShifts(data);
    } finally {
      setLoading(false);
    }
  }, [homeId, token]);

  useEffect(() => { load(); }, []); // eslint-disable-line

  if (loading) return <div className="animate-pulse h-24 bg-gray-100 rounded-xl" />;
  if (shifts.length === 0) return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 text-sm text-gray-400 text-center">
      No shifts scheduled today
    </div>
  );

  return (
    <div className="space-y-2">
      {shifts.map((s) => (
        <div key={s.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
          s.clock_status === 'clocked_in' ? 'border-green-300' : 'border-gray-200'
        }`}>
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[s.status]}`} />
                <span className="font-medium text-gray-900 truncate">{s.staff.full_name}</span>
                <span className={`px-2 py-0.5 rounded-full border text-xs font-medium capitalize ${SHIFT_COLOURS[s.shift_type]}`}>
                  {s.shift_type}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 ml-4">
                {formatTime(s.start_time)} – {formatTime(s.end_time)} · {s.role_on_shift.replace(/_/g, ' ')}
                {s.clock_status === 'clocked_in' && s.attendance?.clocked_in_at && (
                  <span className="text-green-600 font-medium"> · In since {formatTime(s.attendance.clocked_in_at)}</span>
                )}
                {s.clock_status === 'clocked_out' && s.hours_worked !== null && (
                  <span className="text-gray-600"> · {s.hours_worked}h worked</span>
                )}
              </p>
            </div>
            {s.clock_status !== 'clocked_out' && (
              <button
                onClick={() => setActiveClockShift(activeClockShift === s.id ? null : s.id)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-white ${
                  s.clock_status === 'not_clocked_in' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'
                }`}>
                {s.clock_status === 'not_clocked_in' ? 'Clock in' : 'Clock out'}
              </button>
            )}
            {s.clock_status === 'clocked_out' && (
              <span className="shrink-0 text-xs text-gray-400">✓ Done</span>
            )}
          </div>
          {activeClockShift === s.id && (
            <div className="px-4 pb-3">
              <ClockPanel shift={s} homeId={homeId} token={token}
                onDone={() => { setActiveClockShift(null); load(); }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Weekly grid ──────────────────────────────────────────────────────────────

function ShiftChip({ shift }: { shift: Shift }) {
  return (
    <div className={`px-2 py-1.5 rounded-lg border text-xs mb-1.5 ${SHIFT_COLOURS[shift.shiftType ?? shift.shift_type ?? 'custom']} ${shift.status === 'cancelled' ? 'opacity-40 line-through' : ''}`}>
      <div className="flex items-center gap-1">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[shift.status]}`} />
        <span className="font-medium truncate">{shift.staff?.fullName ?? shift.staff?.full_name ?? '—'}</span>
      </div>
      <div className="text-gray-500 mt-0.5 ml-2.5">
        {formatTime(shift.startTime ?? shift.start_time)} – {formatTime(shift.endTime ?? shift.end_time)}
      </div>
    </div>
  );
}

function WeekGrid({ rota }: { rota: WeekRota }) {
  const days = Object.entries(rota.by_day);

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {/* Day headers */}
      {days.map(([date], i) => {
        const isToday = date === toDateStr(new Date());
        return (
          <div key={date} className={`text-center pb-2 ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
            <div className="text-xs font-semibold">{DAY_NAMES[i]}</div>
            <div className={`text-sm font-bold mt-0.5 ${isToday ? 'bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center mx-auto' : ''}`}>
              {new Date(date).getUTCDate()}
            </div>
          </div>
        );
      })}

      {/* Shift cells */}
      {days.map(([date, shifts]) => {
        const summary = rota.summary.find((s) => s.date === date);
        return (
          <div key={date} className="min-h-[100px] bg-white rounded-xl border border-gray-100 p-1.5">
            {shifts.length === 0 ? (
              <div className="text-center text-xs text-gray-300 mt-4">—</div>
            ) : (
              <>
                {shifts.map((s) => <ShiftChip key={s.id} shift={s} />)}
                {summary && summary.absent > 0 && (
                  <div className="text-center text-xs text-red-500 mt-1">{summary.absent} absent</div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type View = 'week' | 'today';

export default function RotaPage() {
  const { homeId } = useParams<{ homeId: string }>();
  const token = typeof window !== 'undefined' ? localStorage.getItem('cc_at') ?? '' : '';

  const [view, setView] = useState<View>('today');
  const [weekStart, setWeekStart] = useState(() => toDateStr(toMonday(new Date())));
  const [rota, setRota] = useState<WeekRota | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadWeek = useCallback(async (ws: string) => {
    setLoading(true); setError('');
    try {
      const data = await rotaApi.getWeek(homeId, ws, token);
      setRota(data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load rota');
    } finally {
      setLoading(false);
    }
  }, [homeId, token]);

  useEffect(() => {
    if (view === 'week') loadWeek(weekStart);
  }, [view, weekStart]); // eslint-disable-line

  const goWeek = (delta: number) => setWeekStart((ws) => addDays(ws, delta * 7));

  // Week summary totals
  const weekTotals = rota?.summary.reduce(
    (acc, d) => ({
      total: acc.total + d.total_shifts,
      confirmed: acc.confirmed + d.confirmed,
      absent: acc.absent + d.absent,
      agency: acc.agency + d.agency,
    }),
    { total: 0, confirmed: 0, absent: 0, agency: 0 },
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Rota</h1>
            <p className="text-sm text-gray-500">Shift scheduling &amp; attendance</p>
          </div>
          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
            {(['today', 'week'] as View[]).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${
                  view === v ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {v === 'today' ? "Today's shifts" : 'Week view'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-5">

        {/* ── Today view ── */}
        {view === 'today' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">
                {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h2>
            </div>
            <TodayPanel homeId={homeId} token={token} />
          </>
        )}

        {/* ── Week view ── */}
        {view === 'week' && (
          <>
            {/* Week navigator */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
                <button onClick={() => goWeek(-1)}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="Previous week">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-sm font-medium text-gray-800 min-w-[160px] text-center">
                  {shortDate(weekStart)} – {shortDate(addDays(weekStart, 6))}
                </span>
                <button onClick={() => goWeek(1)}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="Next week">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button onClick={() => setWeekStart(toDateStr(toMonday(new Date())))}
                  className="ml-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg">
                  This week
                </button>
              </div>

              {/* Summary chips */}
              {weekTotals && !loading && (
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: 'Shifts', value: weekTotals.total, colour: 'bg-white text-gray-700 border-gray-200' },
                    { label: 'Confirmed', value: weekTotals.confirmed, colour: 'bg-blue-50 text-blue-700 border-blue-200' },
                    { label: 'Absent', value: weekTotals.absent, colour: weekTotals.absent > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-gray-400 border-gray-200' },
                    { label: 'Agency', value: weekTotals.agency, colour: 'bg-purple-50 text-purple-700 border-purple-200' },
                  ].map((chip) => (
                    <div key={chip.label} className={`px-3 py-1.5 rounded-xl border text-xs font-medium ${chip.colour}`}>
                      {chip.value} {chip.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            {loading && (
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: 14 }).map((_, i) => (
                  <div key={i} className={`h-${i < 7 ? 8 : 24} bg-white rounded-xl border border-gray-100 animate-pulse`} />
                ))}
              </div>
            )}

            {!loading && rota && <WeekGrid rota={rota} />}

            {/* Legend */}
            <div className="flex gap-4 flex-wrap pt-1">
              {Object.entries(SHIFT_COLOURS).map(([type, cls]) => (
                <div key={type} className="flex items-center gap-1.5">
                  <span className={`w-3 h-3 rounded border ${cls}`} />
                  <span className="text-xs text-gray-500 capitalize">{type}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-gray-500">In progress</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs text-gray-500">Absent</span>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
