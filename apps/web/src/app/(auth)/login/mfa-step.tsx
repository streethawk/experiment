'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../../hooks/use-auth';

interface MfaStepProps {
  onSuccess: () => void;
}

export function MfaStep({ onSuccess }: MfaStepProps) {
  const { verifyMfa, isLoading, error, clearError, mfaPending, logout } = useAuth();

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [trustDevice, setTrustDevice] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Auto-focus first digit on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Countdown timer
  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (!mfaPending) return 0;
    return Math.max(0, Math.ceil((mfaPending.expiresAt - Date.now()) / 1000));
  });

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  const code = digits.join('');

  const handleDigitChange = (index: number, value: string) => {
    // Handle paste of full 6-digit code
    if (value.length === 6 && /^\d{6}$/.test(value)) {
      const newDigits = value.split('');
      setDigits(newDigits);
      inputRefs.current[5]?.focus();
      return;
    }

    // Single digit input
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    // Auto-advance
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    clearError();

    try {
      await verifyMfa(code, trustDevice);
      // Set auth indicator cookie for middleware
      document.cookie = `cc_auth_indicator=1; path=/; max-age=28800; SameSite=Strict`;
      onSuccess();
    } catch {
      // Reset digits on error
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
      <div className="mb-6">
        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-4">
          <LockIcon className="w-6 h-6 text-blue-700" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900">Two-factor authentication</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enter the 6-digit code from your authenticator app.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error */}
        {error && (
          <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Session expiry */}
        {secondsLeft > 0 && secondsLeft < 60 && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-xs text-amber-800">
            Session expires in {secondsLeft}s
          </div>
        )}
        {secondsLeft === 0 && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
            Session expired.{' '}
            <button type="button" onClick={() => logout()} className="underline font-medium">
              Log in again
            </button>
          </div>
        )}

        {/* OTP digit inputs */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Authenticator code
          </label>
          <div className="flex gap-2 justify-center" role="group" aria-label="6-digit authentication code">
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={6} // allows paste of full code
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                aria-label={`Digit ${i + 1}`}
                disabled={isLoading || secondsLeft === 0}
                className="w-11 h-14 text-center text-xl font-semibold rounded-lg border border-slate-300
                           text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent
                           disabled:bg-slate-50 disabled:text-slate-400 caret-transparent"
              />
            ))}
          </div>
          {/* Separator decoration */}
          <div className="flex justify-center mt-1">
            <div className="flex gap-2">
              {[0,1,2,3,4,5].map((i) => (
                <div key={i} className={`w-11 h-0.5 rounded ${digits[i] ? 'bg-blue-600' : 'bg-slate-200'}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Trust device */}
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={trustDevice}
            onChange={(e) => setTrustDevice(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
          />
          <div>
            <span className="text-sm font-medium text-slate-700">Trust this device for 30 days</span>
            <p className="text-xs text-slate-500 mt-0.5">
              You won&apos;t be asked for a code on this device for 30 days.
              Only tick this on a personal device.
            </p>
          </div>
        </label>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            type="submit"
            disabled={code.length !== 6 || isLoading || secondsLeft === 0}
            className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white
                       hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Verifying…' : 'Verify'}
          </button>

          <button
            type="button"
            onClick={() => logout()}
            className="w-full rounded-lg px-4 py-2 text-sm text-slate-600 hover:text-slate-900
                       hover:bg-slate-100 transition-colors"
          >
            ← Back to login
          </button>
        </div>
      </form>
    </div>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}
