'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { residentsApi, type ResidentSummary } from '@/lib/residents-api';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'hospital', label: 'In hospital' },
  { value: 'leave', label: 'On leave' },
  { value: 'discharged', label: 'Discharged' },
];

const CARE_TYPE_LABELS: Record<string, string> = {
  residential: 'Residential',
  nursing: 'Nursing',
  dementia: 'Dementia',
  emi: 'EMI',
  respite: 'Respite',
  end_of_life: 'End of life',
};

const SEVERITY_COLOURS: Record<string, string> = {
  mild: 'bg-yellow-100 text-yellow-800',
  moderate: 'bg-orange-100 text-orange-800',
  severe: 'bg-red-100 text-red-800',
  life_threatening: 'bg-red-600 text-white',
};

export default function ResidentsPage() {
  const { homeId } = useParams<{ homeId: string }>();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [residents, setResidents] = useState<ResidentSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState('active');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const load = useCallback(
    async (cursor?: string) => {
      if (!accessToken) return;

      cursor ? setIsLoadingMore(true) : setIsLoading(true);
      setError(null);

      try {
        const res = await residentsApi.list(homeId, { status, search, cursor, limit: 25 }, accessToken);

        setResidents((prev) => (cursor ? [...prev, ...res.data] : res.data));
        setNextCursor(res.next_cursor);
        setHasMore(res.has_more);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [homeId, accessToken, status, search],
  );

  useEffect(() => {
    setResidents([]);
    setNextCursor(null);
    load();
  }, [load]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const age = (dob: string) => {
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Residents</h1>
          {!isLoading && (
            <p className="text-sm text-slate-500 mt-0.5">{residents.length} shown</p>
          )}
        </div>
        <Link
          href={`/homes/${homeId}/residents/new`}
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white
                     hover:bg-blue-800 transition-colors"
        >
          + Admit resident
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        {/* Status tabs */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatus(opt.value)}
              className={`px-3 py-1.5 transition-colors ${
                status === opt.value
                  ? 'bg-blue-700 text-white font-medium'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <input
            type="search"
            placeholder="Search by name, NHS number, room…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-lg border border-slate-300 pl-9 pr-4 py-1.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
          />
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 mb-4">
          {error}
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : residents.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <UserIcon className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="font-medium">No residents found</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-2">
          {residents.map((r) => (
            <Link
              key={r.id}
              href={`/homes/${homeId}/residents/${r.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-300
                         hover:shadow-sm transition-all group"
            >
              <div className="flex items-start gap-4">
                {/* Avatar placeholder */}
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center
                                shrink-0 text-slate-600 font-semibold text-sm">
                  {(r.preferred_name ?? r.full_name).charAt(0)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-semibold text-slate-900 group-hover:text-blue-700">
                      {r.full_name}
                      {r.preferred_name && r.preferred_name !== r.full_name && (
                        <span className="text-slate-400 font-normal ml-1">
                          "{r.preferred_name}"
                        </span>
                      )}
                    </h2>

                    {/* DNAR badge */}
                    {r.dnar_in_place && (
                      <span className="text-xs bg-red-100 text-red-700 border border-red-200
                                       px-1.5 py-0.5 rounded font-semibold">
                        DNAR
                      </span>
                    )}

                    {/* MCA badge */}
                    {r.mca_lacks_capacity && (
                      <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200
                                       px-1.5 py-0.5 rounded">
                        MCA
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                    <span>{age(r.date_of_birth)} yrs</span>
                    <span>·</span>
                    <span>{CARE_TYPE_LABELS[r.care_type] ?? r.care_type}</span>
                    {r.room && (
                      <>
                        <span>·</span>
                        <span>
                          {r.room.wing_name ? `${r.room.wing_name} / ` : ''}
                          Room {r.room.room_number}
                        </span>
                      </>
                    )}
                    {r.nhs_number && (
                      <>
                        <span>·</span>
                        <span>NHS {r.nhs_number.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3')}</span>
                      </>
                    )}
                  </div>

                  {/* Critical allergies */}
                  {r.critical_allergies.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {r.critical_allergies.map((a, i) => (
                        <span
                          key={i}
                          className={`text-xs px-1.5 py-0.5 rounded font-medium ${SEVERITY_COLOURS[a.severity] ?? SEVERITY_COLOURS.severe}`}
                        >
                          ⚠ {a.substance}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <ChevronRightIcon className="w-4 h-4 text-slate-400 shrink-0 mt-1 group-hover:text-blue-600" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => load(nextCursor ?? undefined)}
            disabled={isLoadingMore}
            className="rounded-lg border border-slate-300 px-6 py-2 text-sm text-slate-600
                       hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            {isLoadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
