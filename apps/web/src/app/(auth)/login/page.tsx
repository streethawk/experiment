'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../hooks/use-auth';
import { MfaStep } from './mfa-step';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/dashboard';

  const { login, isAuthenticated, isLoading, error, clearError, mfaPending } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Already logged in
  useEffect(() => {
    if (isAuthenticated) router.replace(redirect);
  }, [isAuthenticated, redirect, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      const result = await login(email, password);
      if (result === 'success') {
        // Set auth indicator cookie for middleware
        document.cookie = `cc_auth_indicator=1; path=/; max-age=28800; SameSite=Strict`;
        router.replace(redirect);
      }
      // If 'mfa_required', the MfaStep component takes over (mfaPending is set in store)
    } catch {
      // error is displayed via the error state from useAuth
    }
  };

  // Show MFA step if pending
  if (mfaPending) {
    return <MfaStep onSuccess={() => router.replace(redirect)} />;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Sign in to your account</h1>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Error banner */}
        {error && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900
                       placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600
                       focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500"
            placeholder="name@carehome.co.uk"
            disabled={isLoading}
          />
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <a
              href="/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
            >
              Forgot password?
            </a>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 pr-10 text-sm text-slate-900
                         placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600
                         focus:border-transparent disabled:bg-slate-50"
              disabled={isLoading}
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? (
                <EyeOffIcon className="w-4 h-4" />
              ) : (
                <EyeIcon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || !email || !password}
          className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white
                     hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <SpinnerIcon className="w-4 h-4 animate-spin" />
              Signing in…
            </span>
          ) : (
            'Sign in'
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="my-6 flex items-center gap-3">
        <div className="flex-1 border-t border-slate-200" />
        <span className="text-xs text-slate-400">or</span>
        <div className="flex-1 border-t border-slate-200" />
      </div>

      {/* NHS CIS2 SSO — Phase 3 */}
      <button
        type="button"
        disabled
        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-500
                   bg-slate-50 cursor-not-allowed flex items-center justify-center gap-2"
        title="NHS CIS2 single sign-on — coming soon"
      >
        <NhsLogo className="w-5 h-5" />
        Sign in with NHS CIS2
        <span className="text-xs bg-slate-200 text-slate-500 rounded px-1.5 py-0.5 ml-1">
          Coming soon
        </span>
      </button>
    </div>
  );
}

// ─── Inline icon components (avoids extra dependency for this file) ───────────

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function NhsLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 20" fill="none">
      <rect width="40" height="20" rx="2" fill="#005EB8" />
      <text x="4" y="15" fontFamily="Arial" fontSize="13" fontWeight="bold" fill="white">NHS</text>
    </svg>
  );
}
