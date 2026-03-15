'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Activity, ArrowRight } from 'lucide-react';

export default function MedicationsPage() {
  const { homeId } = useParams<{ homeId: string }>();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-slate-900">Medications</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Medication administration records (MAR) are managed per resident.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 mx-auto mb-4">
          <Activity className="h-7 w-7 text-blue-600" />
        </div>
        <h2 className="text-base font-semibold text-slate-900 mb-2">Select a resident</h2>
        <p className="text-sm text-slate-500 mb-6">
          Navigate to a resident&apos;s profile to view their MAR chart, prescriptions, and administer medications.
        </p>
        <Link
          href={`/homes/${homeId}/residents`}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition-colors"
        >
          Go to Residents
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
