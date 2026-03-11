export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-blue-700 flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <span className="text-2xl font-bold text-slate-900">CareCore</span>
          </div>
          <p className="text-sm text-slate-500">UK Care Home Management Platform</p>
        </div>

        {children}

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          ICO Registered &middot; GDPR Compliant &middot; UK Data Residency
        </p>
      </div>
    </div>
  );
}
