const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1';

async function apiFetch<T>(
  path: string,
  options: RequestInit & { token: string },
): Promise<T> {
  const { token, ...rest } = options;
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(rest.headers ?? {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err.detail ?? err.title ?? 'Request failed'), {
      status: res.status,
      body: err,
    });
  }

  return res.status === 204 ? (undefined as T) : res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type MarOutcome =
  | 'given'
  | 'refused'
  | 'not_available'
  | 'away'
  | 'unable'
  | 'not_required'
  | 'self_administered';

export interface Medication {
  id: string;
  resident_id: string;
  home_id: string;
  drug_name: string;
  form: string | null;
  strength: string | null;
  dose: string;
  route: string;
  frequency: string;
  times: string[];
  indication: string | null;
  instructions: string | null;
  is_prn: boolean;
  prn_criteria: string | null;
  is_controlled_drug: boolean;
  controlled_drug_schedule: number | null;
  prescribed_by: string | null;
  prescribed_date: string | null;
  review_date: string | null;
  stock_on_hand: number | null;
  status: 'active' | 'on_hold' | 'discontinued' | 'completed';
  discontinued_date: string | null;
  discontinued_reason: string | null;
  created_at: string;
}

export interface MarSlot {
  scheduled_time: string;
  outcome: MarOutcome | null;
  administered_at: string | null;
  administered_by: string | null;
  witness_id: string | null;
  notes: string | null;
  mar_entry_id: string | null;
}

export interface MarPrnEntry {
  scheduled_time: string;
  outcome: MarOutcome;
  administered_at: string | null;
  administered_by: string;
  prn_indication: string | null;
  notes: string | null;
  mar_entry_id: string;
}

export interface MarRow {
  medication: {
    id: string;
    drug_name: string;
    form: string | null;
    strength: string | null;
    dose: string;
    route: string;
    frequency: string;
    is_prn: boolean;
    is_controlled_drug: boolean;
    status: string;
    instructions: string | null;
    prn_criteria: string | null;
    stock_on_hand: number | null;
  };
  slots: MarSlot[];
  prn_entries: MarPrnEntry[];
}

export interface MarChart {
  date: string;
  rows: MarRow[];
}

export interface MarEntry {
  id: string;
  medication_id: string;
  resident_id: string;
  scheduled_time: string;
  administered_at: string | null;
  outcome: MarOutcome;
  administered_by: string;
  witness_id: string | null;
  notes: string | null;
  is_prn: boolean;
  prn_indication: string | null;
}

export interface CdSummaryItem {
  medication_id: string;
  drug_name: string;
  strength: string | null;
  dose: string;
  form: string | null;
  route: string;
  cd_schedule: number | null;
  status: string;
  stock_on_hand: number;
  resident: { id: string; full_name: string; preferred_name: string | null };
}

export interface CdRegister {
  medication_id: string;
  drug_name: string;
  current_balance: number;
  entries: Array<{
    id: string;
    action: string;
    quantity_in: number | null;
    quantity_out: number | null;
    running_balance: number;
    action_by: string;
    witness_id: string;
    notes: string | null;
    created_at: string;
  }>;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const medicationsApi = {
  // Medications list & CRUD
  list: (
    homeId: string,
    residentId: string,
    params: { status?: string },
    token: string,
  ): Promise<Medication[]> => {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    return apiFetch(`/homes/${homeId}/residents/${residentId}/medications?${qs}`, {
      method: 'GET', token,
    });
  },

  get: (homeId: string, residentId: string, medicationId: string, token: string) =>
    apiFetch<Medication>(`/homes/${homeId}/residents/${residentId}/medications/${medicationId}`, {
      method: 'GET', token,
    }),

  prescribe: (homeId: string, residentId: string, data: object, token: string) =>
    apiFetch<Medication>(`/homes/${homeId}/residents/${residentId}/medications`, {
      method: 'POST', body: JSON.stringify(data), token,
    }),

  discontinue: (
    homeId: string,
    residentId: string,
    medicationId: string,
    data: { discontinued_date: string; reason?: string },
    token: string,
  ) =>
    apiFetch<Medication>(
      `/homes/${homeId}/residents/${residentId}/medications/${medicationId}/discontinue`,
      { method: 'PATCH', body: JSON.stringify(data), token },
    ),

  hold: (homeId: string, residentId: string, medicationId: string, token: string) =>
    apiFetch<Medication>(
      `/homes/${homeId}/residents/${residentId}/medications/${medicationId}/hold`,
      { method: 'PATCH', body: JSON.stringify({}), token },
    ),

  unhold: (homeId: string, residentId: string, medicationId: string, token: string) =>
    apiFetch<Medication>(
      `/homes/${homeId}/residents/${residentId}/medications/${medicationId}/unhold`,
      { method: 'PATCH', body: JSON.stringify({}), token },
    ),

  // MAR chart
  getMarChart: (homeId: string, residentId: string, date: string, token: string) =>
    apiFetch<MarChart>(
      `/homes/${homeId}/residents/${residentId}/mar?date=${date}`,
      { method: 'GET', token },
    ),

  recordAdministration: (
    homeId: string,
    residentId: string,
    data: {
      medication_id: string;
      scheduled_time: string;
      administered_at?: string;
      outcome: MarOutcome;
      witness_id?: string;
      notes?: string;
      is_prn?: boolean;
      prn_indication?: string;
    },
    token: string,
  ) =>
    apiFetch<MarEntry>(`/homes/${homeId}/residents/${residentId}/mar`, {
      method: 'POST', body: JSON.stringify(data), token,
    }),

  // Controlled drugs
  getCdSummary: (homeId: string, token: string) =>
    apiFetch<CdSummaryItem[]>(`/homes/${homeId}/cd-register`, { method: 'GET', token }),

  getCdRegister: (homeId: string, medicationId: string, token: string) =>
    apiFetch<CdRegister>(`/homes/${homeId}/cd-register/${medicationId}`, { method: 'GET', token }),

  addCdEntry: (homeId: string, medicationId: string, data: object, token: string) =>
    apiFetch(`/homes/${homeId}/cd-register/${medicationId}/entries`, {
      method: 'POST', body: JSON.stringify(data), token,
    }),
};
