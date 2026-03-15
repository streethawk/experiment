import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CareCore — UK Care Home Management',
  description: 'GDPR-compliant care home management platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
