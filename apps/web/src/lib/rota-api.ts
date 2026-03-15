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

export type ShiftStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'absent' | 'cancelled';
export type ShiftType   = 'early' | 'late' | 'night' | 'split' | 'custom';
export type ClockMethod = 'pin' | 'qr_code' | 'nfc' | 'manual' | 'biometric';

export interface ShiftStaff {
  id: string;
  full_name: string;
  role: string;
  employment_type: string;
  phone: string | null;
}

export interface Attendance {
  id: string;
  shift_id: string;
  staff_id: string;
  clocked_in_at: string | null;
  clock_in_method: ClockMethod | null;
  clocked_out_at: string | null;
  clock_out_method: ClockMethod | null;
  is_manual_override: boolean;
  override_reason: string | null;
}

export interface Shift {
  id: string;
  home_id: string;
  staff_id: string;
  date: string;
  shift_type: ShiftType;
  start_time: string;
  end_time: string;
  break_minutes: number;
  role_on_shift: string;
  is_agency: boolean;
  agency_name: string | null;
  status: ShiftStatus;
  notes: string | null;
  staff: ShiftStaff;
  attendance: Attendance | null;
}

export interface TodayShift extends Shift {
  clock_status: 'not_clocked_in' | 'clocked_in' | 'clocked_out';
  hours_worked: number | null;
}

export interface WeekDaySummary {
  date: string;
  total_shifts: number;
  confirmed: number;
  absent: number;
  agency: number;
}

export interface WeekRota {
  week_start: string;
  week_end: string;
  by_day: Record<string, Shift[]>;
  summary: WeekDaySummary[];
}

export interface AttendanceReportRow {
  staff: ShiftStaff;
  scheduled_hours: number;
  worked_hours: number;
  total_shifts: number;
  absent_shifts: number;
  completed_shifts: number;
  shifts: Shift[];
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const rotaApi = {
  getWeek: (homeId: string, weekStart: string, token: string): Promise<WeekRota> =>
    apiFetch(`/homes/${homeId}/rota/week?week_start=${weekStart}`, { method: 'GET', token }),

  getToday: (homeId: string, token: string): Promise<TodayShift[]> =>
    apiFetch(`/homes/${homeId}/rota/today`, { method: 'GET', token }),

  getMyShifts: (homeId: string, weekStart: string, token: string): Promise<Shift[]> =>
    apiFetch(`/homes/${homeId}/rota/my-shifts?week_start=${weekStart}`, { method: 'GET', token }),

  getAttendanceReport: (homeId: string, weekStart: string, token: string): Promise<AttendanceReportRow[]> =>
    apiFetch(`/homes/${homeId}/rota/attendance-report?week_start=${weekStart}`, { method: 'GET', token }),

  createShift: (homeId: string, data: object, token: string): Promise<Shift> =>
    apiFetch(`/homes/${homeId}/rota/shifts`, { method: 'POST', body: JSON.stringify(data), token }),

  updateStatus: (homeId: string, shiftId: string, data: object, token: string): Promise<Shift> =>
    apiFetch(`/homes/${homeId}/rota/shifts/${shiftId}/status`, { method: 'PATCH', body: JSON.stringify(data), token }),

  cancelShift: (homeId: string, shiftId: string, token: string): Promise<void> =>
    apiFetch(`/homes/${homeId}/rota/shifts/${shiftId}`, { method: 'DELETE', token }),

  clockIn: (
    homeId: string, shiftId: string,
    data: { method: ClockMethod; clocked_in_at?: string; override_reason?: string },
    token: string,
  ): Promise<Attendance> =>
    apiFetch(`/homes/${homeId}/rota/shifts/${shiftId}/clock-in`, { method: 'POST', body: JSON.stringify(data), token }),

  clockOut: (
    homeId: string, shiftId: string,
    data: { method: ClockMethod; clocked_out_at?: string; override_reason?: string },
    token: string,
  ): Promise<Attendance & { hours_worked: number }> =>
    apiFetch(`/homes/${homeId}/rota/shifts/${shiftId}/clock-out`, { method: 'POST', body: JSON.stringify(data), token }),
};
