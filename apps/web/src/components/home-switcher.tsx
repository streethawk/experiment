'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/use-auth';
import { useAuthStore } from '../store/auth.store';

interface HomeOption {
  id: string;
  name: string;
  city: string;
  last_cqc_rating: string;
  active_residents: number;
  bed_capacity: number;
}

const CQC_COLOURS: Record<string, string> = {
  outstanding: 'bg-green-100 text-green-800',
  good: 'bg-teal-100 text-teal-800',
  requires_improvement: 'bg-amber-100 text-amber-800',
  inadequate: 'bg-red-100 text-red-800',
  not_yet_rated: 'bg-slate-100 text-slate-600',
};

interface HomeSwitcherProps {
  homes: HomeOption[];
}

export function HomeSwitcher({ homes }: HomeSwitcherProps) {
  const { activeHomeId, setActiveHome } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const active = homes.find((h) => h.id === activeHomeId) ?? homes[0];

  // Single home — no switcher needed
  if (homes.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100">
        <HomeIcon className="w-4 h-4 text-slate-500 shrink-0" />
        <span className="text-sm font-medium text-slate-800 truncate max-w-[160px]">
          {homes[0]?.name ?? 'No home assigned'}
        </span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200
                   transition-colors text-left max-w-[220px] w-full"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <HomeIcon className="w-4 h-4 text-slate-500 shrink-0" />
        <span className="flex-1 text-sm font-medium text-slate-800 truncate">
          {active?.name ?? 'Select home'}
        </span>
        <ChevronIcon className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div
            role="listbox"
            aria-label="Select care home"
            className="absolute top-full mt-1 left-0 z-20 w-72 bg-white rounded-xl shadow-lg
                       border border-slate-200 py-1 overflow-hidden"
          >
            {homes.map((home) => (
              <button
                key={home.id}
                role="option"
                aria-selected={home.id === activeHomeId}
                type="button"
                onClick={() => {
                  setActiveHome(home.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors
                            border-b border-slate-100 last:border-0
                            ${home.id === activeHomeId ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{home.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{home.city}</p>
                  </div>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${CQC_COLOURS[home.last_cqc_rating] ?? CQC_COLOURS.not_yet_rated}`}
                  >
                    {home.last_cqc_rating.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <OccupancyBar
                    occupied={home.active_residents}
                    capacity={home.bed_capacity}
                  />
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function OccupancyBar({ occupied, capacity }: { occupied: number; capacity: number }) {
  const pct = capacity > 0 ? Math.round((occupied / capacity) * 100) : 0;
  const colour =
    pct >= 95 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-teal-500';

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colour}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500 whitespace-nowrap">
        {occupied}/{capacity} beds
      </span>
    </div>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}
