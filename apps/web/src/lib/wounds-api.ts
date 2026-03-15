const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1';

async function apiFetch<T>(path: string, options: RequestInit & { token: string }): Promise<T> {
  const { token, ...rest } = options;
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(rest.headers ?? {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err.detail ?? err.title ?? 'Request failed'), { status: res.status, body: err });
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type WoundStatus = 'open' | 'healing' | 'healed' | 'deteriorating';

export interface WoundAssessment {
  id: string;
  wound_id: string;
  assessed_at: string;
  assessed_by: string;
  length_mm: number | null;
  width_mm: number | null;
  push_score: number | null;
  dressing_used: string | null;
  next_change_date: string | null;
  photo_s3_key: string | null;
  notes: string | null;
  created_at: string;
}

export interface Wound {
  id: string;
  resident_id: string;
  site: string;
  onset_date: string | null;
  wound_type: string | null;
  status: WoundStatus;
  healed_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  assessments: WoundAssessment[];
}

export interface WoundOverviewItem {
  id: string;
  site: string;
  wound_type: string | null;
  status: WoundStatus;
  onset_date: string | null;
  resident: { id: string; full_name: string; preferred_name: string | null };
  latest_assessment: Partial<WoundAssessment> | null;
  dressing_due: boolean;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const woundsApi = {
  list: (homeId: string, residentId: string, includeHealed: boolean, token: string): Promise<Wound[]> =>
    apiFetch(`/homes/${homeId}/residents/${residentId}/wounds?include_healed=${includeHealed}`, {
      method: 'GET', token,
    }),

  create: (homeId: string, residentId: string, data: object, token: string): Promise<Wound> =>
    apiFetch(`/homes/${homeId}/residents/${residentId}/wounds`, {
      method: 'POST', body: JSON.stringify(data), token,
    }),

  get: (homeId: string, residentId: string, woundId: string, token: string): Promise<Wound> =>
    apiFetch(`/homes/${homeId}/residents/${residentId}/wounds/${woundId}`, { method: 'GET', token }),

  updateStatus: (
    homeId: string, residentId: string, woundId: string,
    data: { status: WoundStatus; healed_date?: string },
    token: string,
  ): Promise<Wound> =>
    apiFetch(`/homes/${homeId}/residents/${residentId}/wounds/${woundId}/status`, {
      method: 'PATCH', body: JSON.stringify(data), token,
    }),

  addAssessment: (
    homeId: string, residentId: string, woundId: string, data: object, token: string,
  ): Promise<WoundAssessment> =>
    apiFetch(`/homes/${homeId}/residents/${residentId}/wounds/${woundId}/assessments`, {
      method: 'POST', body: JSON.stringify(data), token,
    }),

  getHomeOverview: (homeId: string, token: string): Promise<WoundOverviewItem[]> =>
    apiFetch(`/homes/${homeId}/wounds`, { method: 'GET', token }),
};
