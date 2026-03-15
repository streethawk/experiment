'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { residentsApi } from '@/lib/residents-api';

type Step = 'personal' | 'admission' | 'medical' | 'funding' | 'nok' | 'review';

const STEPS: { id: Step; label: string }[] = [
  { id: 'personal', label: 'Personal details' },
  { id: 'admission', label: 'Admission' },
  { id: 'medical', label: 'Medical' },
  { id: 'funding', label: 'Funding' },
  { id: 'nok', label: 'Next of kin' },
  { id: 'review', label: 'Review & submit' },
];

const CARE_TYPES = [
  { value: 'residential', label: 'Residential' },
  { value: 'nursing', label: 'Nursing' },
  { value: 'dementia', label: 'Dementia' },
  { value: 'emi', label: 'EMI (Elderly Mentally Infirm)' },
  { value: 'respite', label: 'Respite' },
  { value: 'end_of_life', label: 'End of life' },
];

const ADMISSION_SOURCES = [
  { value: 'hospital_discharge', label: 'Hospital discharge' },
  { value: 'home', label: 'From home' },
  { value: 'other_care_home', label: 'Transfer from another care home' },
  { value: 'self_referral', label: 'Self referral' },
  { value: 'la_referral', label: 'Local authority referral' },
  { value: 'nhs_referral', label: 'NHS referral' },
];

const FUNDING_SOURCES = [
  { value: 'self_funded', label: 'Self-funded' },
  { value: 'local_authority', label: 'Local authority' },
  { value: 'chc', label: 'NHS Continuing Healthcare (CHC)' },
  { value: 'chc_fast_track', label: 'CHC Fast Track' },
  { value: 'nhs_fnc', label: 'NHS-funded nursing care (FNC)' },
  { value: 'mixed', label: 'Mixed funding' },
  { value: 'deferred_payment', label: 'Deferred payment agreement' },
];

type FormData = {
  full_name: string;
  preferred_name: string;
  date_of_birth: string;
  gender: string;
  nhs_number: string;
  care_type: string;
  admission_date: string;
  admission_source: string;
  primary_funding_source: string;
  gp_name: string;
  gp_practice: string;
  gp_phone: string;
  dnar_in_place: boolean;
  nok: Array<{
    name: string; relationship: string; phone_primary: string;
    email: string; is_primary_nok: boolean;
    has_lpa_welfare: boolean; has_lpa_finance: boolean;
  }>;
};

const EMPTY_FORM: FormData = {
  full_name: '', preferred_name: '', date_of_birth: '', gender: '',
  nhs_number: '', care_type: 'residential', admission_date: '',
  admission_source: 'hospital_discharge', primary_funding_source: 'self_funded',
  gp_name: '', gp_practice: '', gp_phone: '', dnar_in_place: false, nok: [],
};

export default function AdmitResidentPage() {
  const { homeId } = useParams<{ homeId: string }>();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [step, setStep] = useState<Step>('personal');
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentIndex = STEPS.findIndex((s) => s.id === step);

  const set = (field: keyof FormData, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const next = () => {
    const nextStep = STEPS[currentIndex + 1];
    if (nextStep) setStep(nextStep.id);
  };

  const prev = () => {
    const prevStep = STEPS[currentIndex - 1];
    if (prevStep) setStep(prevStep.id);
  };

  const addNok = () =>
    setForm((prev) => ({
      ...prev,
      nok: [
        ...prev.nok,
        {
          name: '', relationship: '', phone_primary: '', email: '',
          is_primary_nok: prev.nok.length === 0,
          has_lpa_welfare: false, has_lpa_finance: false,
        },
      ],
    }));

  const updateNok = (i: number, field: string, value: any) =>
    setForm((prev) => ({
      ...prev,
      nok: prev.nok.map((n, idx) => idx === i ? { ...n, [field]: value } : n),
    }));

  const submit = async () => {
    if (!accessToken) return;
    setIsSubmitting(true);
    setError(null);

    const payload = {
      full_name: form.full_name.trim(),
      preferred_name: form.preferred_name.trim() || undefined,
      date_of_birth: form.date_of_birth,
      nhs_number: form.nhs_number.replace(/\s/g, '') || undefined,
      care_type: form.care_type,
      admission_date: form.admission_date,
      admission_source: form.admission_source,
      primary_funding_source: form.primary_funding_source,
      gp_name: form.gp_name.trim() || undefined,
      gp_practice: form.gp_practice.trim() || undefined,
      gp_phone: form.gp_phone.trim() || undefined,
      dnar_in_place: form.dnar_in_place,
      nok: form.nok.filter((n) => n.name.trim()),
    };

    try {
      const resident = await residentsApi.create(homeId, payload, accessToken);
      router.push(`/homes/${homeId}/residents/${resident.id}`);
    } catch (e: any) {
      setError(e.message ?? 'Failed to admit resident');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/homes/${homeId}/residents`} className="text-slate-400 hover:text-slate-600">
          ←
        </Link>
        <h1 className="text-xl font-semibold text-slate-900">Admit new resident</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1.5 mb-8 overflow-x-auto">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => i < currentIndex && setStep(s.id)}
              className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full transition-colors whitespace-nowrap ${
                s.id === step
                  ? 'bg-blue-700 text-white font-medium'
                  : i < currentIndex
                  ? 'bg-green-100 text-green-800 cursor-pointer'
                  : 'bg-slate-100 text-slate-400 cursor-default'
              }`}
            >
              {i < currentIndex ? '✓ ' : `${i + 1}. `}
              {s.label}
            </button>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-4 ${i < currentIndex ? 'bg-green-400' : 'bg-slate-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 mb-4">
          {error}
        </div>
      )}

      {/* Step content */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        {step === 'personal' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-800 mb-4">Personal details</h2>
            <Field label="Full legal name" required>
              <input type="text" className={input} value={form.full_name}
                onChange={(e) => set('full_name', e.target.value)} placeholder="e.g. Edith Margaret Thompson" />
            </Field>
            <Field label="Preferred name">
              <input type="text" className={input} value={form.preferred_name}
                onChange={(e) => set('preferred_name', e.target.value)} placeholder="e.g. Edith" />
            </Field>
            <Field label="Date of birth" required>
              <input type="date" className={input} value={form.date_of_birth}
                onChange={(e) => set('date_of_birth', e.target.value)} max={new Date().toISOString().split('T')[0]} />
            </Field>
            <Field label="Gender">
              <select className={input} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                <option value="">Prefer not to say</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="non_binary">Non-binary</option>
              </select>
            </Field>
            <Field label="NHS number">
              <input type="text" className={input} value={form.nhs_number}
                onChange={(e) => set('nhs_number', e.target.value)}
                placeholder="000 000 0000" maxLength={12} />
            </Field>
          </div>
        )}

        {step === 'admission' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-800 mb-4">Admission details</h2>
            <Field label="Care type" required>
              <select className={input} value={form.care_type} onChange={(e) => set('care_type', e.target.value)}>
                {CARE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Admission date" required>
              <input type="date" className={input} value={form.admission_date}
                onChange={(e) => set('admission_date', e.target.value)} />
            </Field>
            <Field label="Admission source" required>
              <select className={input} value={form.admission_source}
                onChange={(e) => set('admission_source', e.target.value)}>
                {ADMISSION_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
          </div>
        )}

        {step === 'medical' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-800 mb-4">Medical information</h2>
            <Field label="GP name">
              <input type="text" className={input} value={form.gp_name}
                onChange={(e) => set('gp_name', e.target.value)} placeholder="Dr Smith" />
            </Field>
            <Field label="GP surgery">
              <input type="text" className={input} value={form.gp_practice}
                onChange={(e) => set('gp_practice', e.target.value)} placeholder="Oakwood Surgery" />
            </Field>
            <Field label="GP phone">
              <input type="tel" className={input} value={form.gp_phone}
                onChange={(e) => set('gp_phone', e.target.value)} placeholder="01179 000000" />
            </Field>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600"
                checked={form.dnar_in_place} onChange={(e) => set('dnar_in_place', e.target.checked)} />
              <div>
                <span className="text-sm font-medium text-slate-700">DNAR in place</span>
                <p className="text-xs text-slate-500">Do Not Attempt Resuscitation order is signed and in place</p>
              </div>
            </label>
          </div>
        )}

        {step === 'funding' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-800 mb-4">Funding arrangements</h2>
            <Field label="Primary funding source" required>
              <select className={input} value={form.primary_funding_source}
                onChange={(e) => set('primary_funding_source', e.target.value)}>
                {FUNDING_SOURCES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </Field>
          </div>
        )}

        {step === 'nok' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-800 mb-1">Next of kin / contacts</h2>
            <p className="text-sm text-slate-500 mb-4">Add family members, carers, or legal representatives</p>

            {form.nok.map((n, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-4 space-y-3">
                <p className="text-sm font-medium text-slate-700">Contact {i + 1}</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Name" required>
                    <input type="text" className={input} value={n.name}
                      onChange={(e) => updateNok(i, 'name', e.target.value)} />
                  </Field>
                  <Field label="Relationship" required>
                    <input type="text" className={input} value={n.relationship}
                      onChange={(e) => updateNok(i, 'relationship', e.target.value)}
                      placeholder="Son, Daughter, Solicitor…" />
                  </Field>
                  <Field label="Phone">
                    <input type="tel" className={input} value={n.phone_primary}
                      onChange={(e) => updateNok(i, 'phone_primary', e.target.value)} />
                  </Field>
                  <Field label="Email">
                    <input type="email" className={input} value={n.email}
                      onChange={(e) => updateNok(i, 'email', e.target.value)} />
                  </Field>
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      checked={n.is_primary_nok} onChange={(e) => updateNok(i, 'is_primary_nok', e.target.checked)} />
                    Primary next of kin
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      checked={n.has_lpa_welfare} onChange={(e) => updateNok(i, 'has_lpa_welfare', e.target.checked)} />
                    LPA (welfare)
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      checked={n.has_lpa_finance} onChange={(e) => updateNok(i, 'has_lpa_finance', e.target.checked)} />
                    LPA (finance)
                  </label>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addNok}
              className="w-full rounded-lg border-2 border-dashed border-slate-300 py-3 text-sm
                         text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              + Add contact
            </button>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-800 mb-4">Review & confirm</h2>
            <ReviewItem label="Full name" value={form.full_name} />
            {form.preferred_name && <ReviewItem label="Preferred name" value={form.preferred_name} />}
            <ReviewItem label="Date of birth" value={form.date_of_birth} />
            <ReviewItem label="Care type" value={CARE_TYPES.find((t) => t.value === form.care_type)?.label ?? ''} />
            <ReviewItem label="Admission date" value={form.admission_date} />
            <ReviewItem label="Funding" value={FUNDING_SOURCES.find((f) => f.value === form.primary_funding_source)?.label ?? ''} />
            {form.gp_name && <ReviewItem label="GP" value={form.gp_name} />}
            {form.dnar_in_place && <ReviewItem label="DNAR" value="Yes — in place" />}
            <ReviewItem label="Contacts" value={form.nok.length ? `${form.nok.length} contact(s)` : 'None added'} />
          </div>
        )}
      </div>

      {/* Nav buttons */}
      <div className="flex justify-between mt-6">
        <button
          type="button"
          onClick={prev}
          disabled={currentIndex === 0}
          className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg
                     hover:bg-slate-50 disabled:opacity-30 disabled:cursor-default transition-colors"
        >
          ← Back
        </button>

        {step === 'review' ? (
          <button
            type="button"
            onClick={submit}
            disabled={isSubmitting || !form.full_name || !form.date_of_birth || !form.admission_date}
            className="px-6 py-2 text-sm font-semibold bg-blue-700 text-white rounded-lg
                       hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Admitting…' : 'Confirm admission'}
          </button>
        ) : (
          <button
            type="button"
            onClick={next}
            className="px-4 py-2 text-sm font-semibold bg-blue-700 text-white rounded-lg
                       hover:bg-blue-800 transition-colors"
          >
            Continue →
          </button>
        )}
      </div>
    </div>
  );
}

const input = `w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900
               focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent`;

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-2 border-b border-slate-100">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}
