import type { TokenPair } from '../types/auth.types';

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

export interface ResidentSummary {
  id: string;
  full_name: string;
  preferred_name: string | null;
  date_of_birth: string;
  gender: string | null;
  status: string;
  care_type: string;
  admission_date: string;
  nhs_number: string | null;
  dnar_in_place: boolean;
  mca_lacks_capacity: boolean | null;
  room: { room_number: string; wing_name: string | null } | null;
  critical_allergies: Array<{ substance: string; severity: string }>;
}

export interface ResidentListResponse {
  data: ResidentSummary[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface ResidentProfile extends ResidentSummary {
  home_id: string;
  organisation_id: string;
  ethnicity: string | null;
  religion: string | null;
  first_language: string | null;
  interpreter_required: boolean;
  gp_name: string | null;
  gp_practice: string | null;
  gp_phone: string | null;
  admission_source: string;
  primary_funding_source: string;
  keyworker_id: string | null;
  contacts: ResidentContact[];
  allergies: Allergy[];
  current_care_plan: CarePlanSummary | null;
  latest_risk_assessments: RiskAssessmentSummary[];
  active_medications_count: number;
  open_incidents_count: number;
}

export interface ResidentContact {
  id: string;
  name: string;
  relationship: string;
  phone_primary: string | null;
  phone_secondary: string | null;
  email: string | null;
  address: string | null;
  is_primary_nok: boolean;
  has_lpa_welfare: boolean;
  has_lpa_finance: boolean;
  notes: string | null;
}

export interface Allergy {
  id: string;
  substance: string;
  reaction: string;
  severity: 'mild' | 'moderate' | 'severe' | 'life_threatening';
  notes: string | null;
  recorded_at: string;
}

export interface CarePlanSummary {
  id: string;
  version: number;
  status: string;
  next_review_date: string | null;
  approved_at: string | null;
}

export interface CarePlanFull extends CarePlanSummary {
  resident_id: string;
  home_id: string;
  sections: Record<string, { goals?: string; interventions?: string; notes?: string; [key: string]: unknown }>;
  created_by: string;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RiskAssessmentSummary {
  id: string;
  type: string;
  risk_level: string;
  score: number | null;
  assessed_at: string;
  valid_until: string | null;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const residentsApi = {
  list: (
    homeId: string,
    params: { status?: string; search?: string; cursor?: string; limit?: number },
    token: string,
  ): Promise<ResidentListResponse> => {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.search) qs.set('search', params.search);
    if (params.cursor) qs.set('cursor', params.cursor);
    if (params.limit) qs.set('limit', String(params.limit));

    return apiFetch(`/homes/${homeId}/residents?${qs}`, { method: 'GET', token });
  },

  get: (homeId: string, residentId: string, token: string): Promise<ResidentProfile> =>
    apiFetch(`/homes/${homeId}/residents/${residentId}`, { method: 'GET', token }),

  create: (homeId: string, data: object, token: string): Promise<ResidentProfile> =>
    apiFetch(`/homes/${homeId}/residents`, {
      method: 'POST', body: JSON.stringify(data), token,
    }),

  update: (homeId: string, residentId: string, data: object, token: string): Promise<ResidentProfile> =>
    apiFetch(`/homes/${homeId}/residents/${residentId}`, {
      method: 'PATCH', body: JSON.stringify(data), token,
    }),

  discharge: (homeId: string, residentId: string, data: object, token: string) =>
    apiFetch(`/homes/${homeId}/residents/${residentId}/discharge`, {
      method: 'POST', body: JSON.stringify(data), token,
    }),

  // Care plans
  getCarePlan: (homeId: string, residentId: string, planId: string, token: string): Promise<CarePlanFull> =>
    apiFetch(`/homes/${homeId}/residents/${residentId}/care-plans/${planId}`, { method: 'GET', token }),

  listCarePlans: (homeId: string, residentId: string, token: string): Promise<CarePlanSummary[]> =>
    apiFetch(`/homes/${homeId}/residents/${residentId}/care-plans`, { method: 'GET', token }),

  // Allergies
  createAllergy: (homeId: string, residentId: string, data: object, token: string) =>
    apiFetch(`/homes/${homeId}/residents/${residentId}/allergies`, {
      method: 'POST', body: JSON.stringify(data), token,
    }),

  deactivateAllergy: (homeId: string, residentId: string, allergyId: string, token: string) =>
    apiFetch(`/homes/${homeId}/residents/${residentId}/allergies/${allergyId}/deactivate`, {
      method: 'PATCH', body: JSON.stringify({}), token,
    }),
};
