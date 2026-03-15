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

export type CareNoteShift = 'early' | 'late' | 'night';

export type CareNoteCategory =
  | 'personal_care' | 'nutrition' | 'hydration' | 'medication' | 'mobility'
  | 'continence' | 'sleep' | 'mood_behaviour' | 'medical' | 'social_activity'
  | 'wound_care' | 'repositioning' | 'handover' | 'general';

export interface CareNote {
  id: string;
  resident_id: string;
  home_id: string;
  shift: CareNoteShift;
  categories: CareNoteCategory[];
  note: string;
  mood_score: number | null;
  food_intake_pct: number | null;
  fluid_intake_ml: number | null;
  is_flagged: boolean;
  flag_reason: string | null;
  edit_history: Array<{ previous_note: string; edited_by: string; edited_at: string }>;
  created_by: string;
  created_at: string;
  updated_at: string;
  attachments: Array<{ id: string; filename: string; s3_key: string; content_type: string | null }>;
}

export interface CareNoteListResponse {
  data: CareNote[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface ShiftSummary {
  date: string;
  total_notes: number;
  flagged_count: number;
  latest_mood_score: number | null;
  total_fluid_ml: number;
  by_shift: { early: CareNote[]; late: CareNote[]; night: CareNote[] };
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const careNotesApi = {
  list: (
    homeId: string,
    residentId: string,
    params: {
      shift?: string; category?: string; flagged?: boolean;
      date_from?: string; date_to?: string; search?: string;
      limit?: number; cursor?: string;
    },
    token: string,
  ): Promise<CareNoteListResponse> => {
    const qs = new URLSearchParams();
    if (params.shift)     qs.set('shift', params.shift);
    if (params.category)  qs.set('category', params.category);
    if (params.flagged !== undefined) qs.set('flagged', String(params.flagged));
    if (params.date_from) qs.set('date_from', params.date_from);
    if (params.date_to)   qs.set('date_to', params.date_to);
    if (params.search)    qs.set('search', params.search);
    if (params.limit)     qs.set('limit', String(params.limit));
    if (params.cursor)    qs.set('cursor', params.cursor);
    return apiFetch(`/homes/${homeId}/residents/${residentId}/notes?${qs}`, { method: 'GET', token });
  },

  create: (homeId: string, residentId: string, data: object, token: string): Promise<CareNote> =>
    apiFetch(`/homes/${homeId}/residents/${residentId}/notes`, {
      method: 'POST', body: JSON.stringify(data), token,
    }),

  get: (homeId: string, residentId: string, noteId: string, token: string): Promise<CareNote> =>
    apiFetch(`/homes/${homeId}/residents/${residentId}/notes/${noteId}`, { method: 'GET', token }),

  update: (homeId: string, residentId: string, noteId: string, data: object, token: string): Promise<CareNote> =>
    apiFetch(`/homes/${homeId}/residents/${residentId}/notes/${noteId}`, {
      method: 'PATCH', body: JSON.stringify(data), token,
    }),

  remove: (homeId: string, residentId: string, noteId: string, token: string): Promise<void> =>
    apiFetch(`/homes/${homeId}/residents/${residentId}/notes/${noteId}`, { method: 'DELETE', token }),

  getShiftSummary: (homeId: string, residentId: string, date: string, token: string): Promise<ShiftSummary> =>
    apiFetch(`/homes/${homeId}/residents/${residentId}/notes/shift-summary?date=${date}`, { method: 'GET', token }),
};
