'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Users, Calendar, ClipboardList, FileText, Activity,
  Shield, BarChart2, Settings, LogOut, ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { ROLE_LABELS } from '../types/auth.types';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  managerOnly?: boolean;
}

function navItems(homeId: string): NavItem[] {
  return [
    { label: 'Residents',   href: `/homes/${homeId}/residents`,   icon: Users },
    { label: 'Rota',        href: `/homes/${homeId}/rota`,        icon: Calendar,     managerOnly: true },
    { label: 'Care Notes',  href: `/homes/${homeId}/care-notes`,  icon: ClipboardList },
    { label: 'Medications', href: `/homes/${homeId}/medications`, icon: Activity },
    { label: 'Incidents',   href: `/homes/${homeId}/incidents`,   icon: Shield,       managerOnly: true },
    { label: 'Reports',     href: `/homes/${homeId}/reports`,     icon: BarChart2,    managerOnly: true },
  ];
}

export function Sidebar({ homeId }: { homeId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isManager } = {
    user:       useAuthStore(s => s.user),
    logout:     useAuthStore(s => s.logout),
    isManager:  useAuthStore(s =>
      ['home_manager', 'registered_manager', 'group_admin', 'platform_admin'].includes(s.user?.role ?? ''),
    ),
  };

  const items = navItems(homeId).filter(i => !i.managerOnly || isManager);

  const handleLogout = async () => {
    await logout();
    document.cookie = 'cc_auth_indicator=; path=/; max-age=0';
    router.replace('/login');
  };

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-slate-100 px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-700">
          <span className="text-sm font-bold text-white">C</span>
        </div>
        <span className="font-semibold text-slate-900">CareCore</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {items.map(({ label, href, icon: Icon }) => {
          const active = pathname.startsWith(href);

          return (
            <Link
              key={label}
              href={href}
              className={[
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              ].join(' ')}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Settings link */}
      <div className="border-t border-slate-100 px-3 py-2">
        <Link
          href={`/homes/${homeId}/settings`}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <Settings className="h-4 w-4 shrink-0" />
          Settings
        </Link>
      </div>

      {/* User profile */}
      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
            {user?.full_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{user?.full_name ?? '—'}</p>
            <p className="truncate text-xs text-slate-500">
              {user ? ROLE_LABELS[user.role] : ''}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
