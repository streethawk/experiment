'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authApi } from '../../../lib/auth-api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await authApi.requestPasswordReset(email);
    } finally {
      setIsLoading(false);
      setSubmitted(true); // Always show confirmation to prevent email enumeration
    }
  };

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Check your email</h1>
        <p className="text-sm text-slate-500 mb-6">
          If an account exists for <strong>{email}</strong>, a password reset link has been sent.
          Check your spam folder if you don&apos;t see it within a few minutes.
        </p>
        <Link href="/login" className="text-sm text-blue-600 hover:underline">
          ← Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
      <h1 className="text-xl font-semibold text-slate-900 mb-1">Reset your password</h1>
      <p className="text-sm text-slate-500 mb-6">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900
                       placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600
                       focus:border-transparent"
            placeholder="name@carehome.co.uk"
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !email}
          className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white
                     hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Sending…' : 'Send reset link'}
        </button>

        <div className="text-center">
          <Link href="/login" className="text-sm text-slate-500 hover:text-slate-700">
            ← Back to sign in
          </Link>
        </div>
      </form>
    </div>
  );
}
