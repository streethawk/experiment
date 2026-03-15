export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <span className="text-2xl font-bold text-slate-900 tracking-tight">CareCore</span>
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
