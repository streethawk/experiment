'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { residentsApi, type ResidentSummary } from '@/lib/residents-api';

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function StatusBadge({ status }: { status: string }) {
  const colours: Record<string, string> = {
    active:    'bg-green-100 text-green-700',
    discharged:'bg-gray-100 text-gray-500',
    deceased:  'bg-slate-100 text-slate-500',
    on_leave:  'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${colours[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export default function CareNotesPage() {
  const { homeId } = useParams<{ homeId: string }>();
  const token = typeof window !== 'undefined' ? localStorage.getItem('cc_at') ?? '' : '';

  const [residents, setResidents] = useState<ResidentSummary[]>([]);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setLoading(true);
    setError('');
    residentsApi.list(homeId, { status: 'active', search: search || undefined, limit: 50 }, token)
      .then((res) => setResidents(res.data))
      .catch((err) => setError(err.message ?? 'Failed to load residents'))
      .finally(() => setLoading(false));
  }, [homeId, search, token]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Care Notes</h1>
        <p className="text-sm text-slate-500 mt-0.5">Select a resident to view or add shift notes</p>
      </div>

      <div className="mb-4">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search residents…"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">{error}</div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-slate-200 rounded w-2/3" />
                <div className="h-3 bg-slate-100 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : residents.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm text-slate-500">
            {search ? 'No residents match your search.' : 'No active residents found.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {residents.map((r) => (
            <Link
              key={r.id}
              href={`/homes/${homeId}/residents/${r.id}/notes`}
              className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 hover:border-blue-300 hover:shadow-sm transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                {getInitials(r.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900 truncate">
                  {r.preferred_name ? `${r.preferred_name} (${r.full_name})` : r.full_name}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <StatusBadge status={r.status} />
                  {r.room && (
                    <span className="text-xs text-slate-400">
                      Room {r.room.room_number}{r.room.wing_name ? ` · ${r.room.wing_name}` : ''}
                    </span>
                  )}
                </div>
              </div>
              <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
