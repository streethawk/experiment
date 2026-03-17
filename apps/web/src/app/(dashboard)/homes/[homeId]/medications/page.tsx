'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { medicationsApi, type CdSummaryItem } from '@/lib/medications-api';
import { residentsApi, type ResidentSummary } from '@/lib/residents-api';

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

// ─── Controlled Drugs panel ───────────────────────────────────────────────────

function CdPanel({ homeId, token }: { homeId: string; token: string }) {
  const [items, setItems]   = useState<CdSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    medicationsApi.getCdSummary(homeId, token)
      .then(setItems)
      .catch((e) => setError(e.message ?? 'Failed to load CD register'))
      .finally(() => setLoading(false));
  }, [homeId, token]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse space-y-2">
        <div className="h-4 bg-slate-200 rounded w-40" />
        <div className="h-3 bg-slate-100 rounded w-full" />
        <div className="h-3 bg-slate-100 rounded w-2/3" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
    );
  }

  const lowStock = items.filter((i) => i.status === 'active' && i.stock_on_hand <= 10);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">Controlled Drugs Register</h2>
        {lowStock.length > 0 && (
          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
            {lowStock.length} low stock
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-slate-400">No controlled drugs recorded</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((item) => {
            const isLow = item.status === 'active' && item.stock_on_hand <= 10;
            return (
              <Link
                key={item.medication_id}
                href={`/homes/${homeId}/residents/${item.resident.id}/mar`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 truncate">{item.drug_name}</span>
                    {item.strength && <span className="text-xs text-slate-400">{item.strength}</span>}
                    {item.cd_schedule && (
                      <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                        Sch {item.cd_schedule}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {item.resident.preferred_name ?? item.resident.full_name} · {item.dose} {item.route}
                  </div>
                </div>
                <div className={`text-right shrink-0 ${isLow ? 'text-red-600' : 'text-slate-700'}`}>
                  <div className="text-sm font-semibold">{item.stock_on_hand}</div>
                  <div className="text-xs text-slate-400">in stock</div>
                </div>
                <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MedicationsPage() {
  const { homeId } = useParams<{ homeId: string }>();
  const token = typeof window !== 'undefined' ? localStorage.getItem('cc_at') ?? '' : '';

  const [residents, setResidents] = useState<ResidentSummary[]>([]);
  const [search, setSearch]       = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setLoading(true);
    setError('');
    residentsApi.list(homeId, { status: 'active', search: search || undefined, limit: 50 }, token)
      .then((res) => setResidents(res.data))
      .catch((e) => setError(e.message ?? 'Failed to load residents'))
      .finally(() => setLoading(false));
  }, [homeId, search, token]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Medications</h1>
        <p className="text-sm text-slate-500 mt-0.5">Controlled drugs register and MAR charts by resident</p>
      </div>

      <CdPanel homeId={homeId} token={token} />

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">MAR Charts — select a resident</h2>
        <div className="mb-3">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search residents…"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-3">{error}</div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
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
          <div className="text-center py-10 bg-white rounded-xl border border-slate-200">
            <p className="text-sm text-slate-400">
              {search ? 'No residents match your search.' : 'No active residents found.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {residents.map((r) => (
              <Link
                key={r.id}
                href={`/homes/${homeId}/residents/${r.id}/mar`}
                className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 hover:border-blue-300 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  {getInitials(r.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">
                    {r.preferred_name ? `${r.preferred_name} (${r.full_name})` : r.full_name}
                  </div>
                  {r.room && (
                    <div className="text-xs text-slate-400 mt-0.5">
                      Room {r.room.room_number}{r.room.wing_name ? ` · ${r.room.wing_name}` : ''}
                    </div>
                  )}
                </div>
                <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
