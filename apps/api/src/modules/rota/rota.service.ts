import {
  Injectable, NotFoundException, ForbiddenException,
  BadRequestException, ConflictException, Inject,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PRISMA_SERVICE } from '../../database/database.module';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftStatusDto } from './dto/update-shift-status.dto';
import { ClockInDto } from './dto/clock-in.dto';
import { ClockOutDto } from './dto/clock-out.dto';
import type { RequestUser } from '../auth/strategies/jwt.strategy';

@Injectable()
export class RotaService {
  constructor(@Inject(PRISMA_SERVICE) private readonly prisma: PrismaClient) {}

  // ─── Weekly rota view ──────────────────────────────────────────────────────
  // Returns all shifts for the ISO week containing `date`, grouped by day

  async getWeekRota(homeId: string, weekStart: string, user: RequestUser) {
    this.assertAccess(homeId, user);

    const monday = this.toMonday(new Date(weekStart));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const shifts = await this.prisma.shift.findMany({
      where: {
        homeId,
        date: { gte: monday, lte: sunday },
      },
      include: {
        staff: {
          select: {
            id: true, fullName: true, role: true,
            employmentType: true, phone: true,
          },
        },
        attendance: true,
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    // Group by ISO date string
    const byDay: Record<string, typeof shifts> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      byDay[this.toDateStr(d)] = [];
    }
    for (const shift of shifts) {
      const key = this.toDateStr(shift.date);
      if (byDay[key]) byDay[key].push(shift);
    }

    // Summary per day
    const summary = Object.entries(byDay).map(([date, dayShifts]) => ({
      date,
      total_shifts: dayShifts.length,
      confirmed: dayShifts.filter((s) => ['confirmed', 'in_progress', 'completed'].includes(s.status)).length,
      absent: dayShifts.filter((s) => s.status === 'absent').length,
      agency: dayShifts.filter((s) => s.isAgency).length,
    }));

    return {
      week_start: this.toDateStr(monday),
      week_end:   this.toDateStr(sunday),
      by_day: byDay,
      summary,
    };
  }

  // ─── Create shift ──────────────────────────────────────────────────────────

  async createShift(homeId: string, dto: CreateShiftDto, user: RequestUser) {
    this.assertAccess(homeId, user);
    this.assertManager(user);

    // Verify staff belongs to home
    const staff = await this.prisma.staff.findFirst({
      where: { id: dto.staff_id, homeId, deletedAt: null },
      select: { id: true, fullName: true },
    });
    if (!staff) throw new NotFoundException(`Staff member ${dto.staff_id} not found in this home`);

    const date = new Date(dto.date);

    // Check for double-booking on the same day
    const conflict = await this.prisma.shift.findFirst({
      where: {
        staffId: dto.staff_id,
        date: { gte: this.dayStart(date), lte: this.dayEnd(date) },
        status: { notIn: ['cancelled', 'absent'] },
      },
    });
    if (conflict) {
      throw new ConflictException(
        `${staff.fullName} already has a shift on ${dto.date} (${conflict.shiftType})`,
      );
    }

    return this.prisma.shift.create({
      data: {
        homeId,
        staffId: dto.staff_id,
        date,
        shiftType:    dto.shift_type as any,
        startTime:    new Date(`1970-01-01T${dto.start_time}:00Z`),
        endTime:      new Date(`1970-01-01T${dto.end_time}:00Z`),
        breakMinutes: dto.break_minutes ?? 30,
        roleOnShift:  dto.role_on_shift as any,
        isAgency:     dto.is_agency ?? false,
        agencyName:   dto.agency_name ?? null,
        notes:        dto.notes ?? null,
        status:       'scheduled',
        createdBy:    user.id,
      },
      include: { staff: { select: { id: true, fullName: true, role: true } } },
    });
  }

  // ─── Update shift status ───────────────────────────────────────────────────

  async updateShiftStatus(
    homeId: string, shiftId: string,
    dto: UpdateShiftStatusDto, user: RequestUser,
  ) {
    this.assertAccess(homeId, user);
    this.assertManager(user);
    const shift = await this.findShiftOrFail(homeId, shiftId);

    return this.prisma.shift.update({
      where: { id: shiftId },
      data: { status: dto.status as any, notes: dto.notes ?? shift.notes },
    });
  }

  // ─── Delete (cancel) shift ─────────────────────────────────────────────────

  async deleteShift(homeId: string, shiftId: string, user: RequestUser) {
    this.assertAccess(homeId, user);
    this.assertManager(user);
    const shift = await this.findShiftOrFail(homeId, shiftId);

    if (['in_progress', 'completed'].includes(shift.status)) {
      throw new BadRequestException('Cannot delete a shift that is in progress or completed');
    }

    return this.prisma.shift.update({
      where: { id: shiftId },
      data: { status: 'cancelled' },
    });
  }

  // ─── Clock in ─────────────────────────────────────────────────────────────

  async clockIn(homeId: string, shiftId: string, dto: ClockInDto, user: RequestUser) {
    this.assertAccess(homeId, user);
    const shift = await this.findShiftOrFail(homeId, shiftId);

    // Only the assigned staff member or a manager can clock in
    const isManager = this.isManagerRole(user);
    if (!isManager && shift.staffId !== user.id) {
      throw new ForbiddenException('You can only clock in to your own shifts');
    }

    if (shift.status === 'completed' || shift.status === 'cancelled') {
      throw new BadRequestException(`Cannot clock in to a ${shift.status} shift`);
    }

    const isManualOverride = dto.method === 'manual';
    if (isManualOverride && !dto.override_reason) {
      throw new BadRequestException('override_reason is required for manual clock-in');
    }

    const clockedInAt = dto.clocked_in_at ? new Date(dto.clocked_in_at) : new Date();

    // Upsert attendance record
    const attendance = await this.prisma.attendance.upsert({
      where: { shiftId },
      create: {
        shiftId,
        staffId: shift.staffId,
        clockedInAt,
        clockInMethod:      dto.method as any,
        isManualOverride,
        overrideReason:     dto.override_reason ?? null,
        approvedBy:         isManualOverride ? user.id : null,
      },
      update: {
        clockedInAt,
        clockInMethod:  dto.method as any,
        isManualOverride,
        overrideReason: dto.override_reason ?? null,
        approvedBy:     isManualOverride ? user.id : null,
      },
    });

    // Move shift to in_progress
    await this.prisma.shift.update({
      where: { id: shiftId },
      data: { status: 'in_progress' },
    });

    return attendance;
  }

  // ─── Clock out ────────────────────────────────────────────────────────────

  async clockOut(homeId: string, shiftId: string, dto: ClockOutDto, user: RequestUser) {
    this.assertAccess(homeId, user);
    const shift = await this.findShiftOrFail(homeId, shiftId);

    const isManager = this.isManagerRole(user);
    if (!isManager && shift.staffId !== user.id) {
      throw new ForbiddenException('You can only clock out of your own shifts');
    }

    const attendance = await this.prisma.attendance.findUnique({ where: { shiftId } });
    if (!attendance?.clockedInAt) {
      throw new BadRequestException('Must clock in before clocking out');
    }
    if (attendance.clockedOutAt) {
      throw new BadRequestException('Already clocked out of this shift');
    }

    const isManualOverride = dto.method === 'manual';
    if (isManualOverride && !dto.override_reason) {
      throw new BadRequestException('override_reason is required for manual clock-out');
    }

    const clockedOutAt = dto.clocked_out_at ? new Date(dto.clocked_out_at) : new Date();

    if (clockedOutAt <= attendance.clockedInAt) {
      throw new BadRequestException('Clock-out time must be after clock-in time');
    }

    const updated = await this.prisma.attendance.update({
      where: { shiftId },
      data: {
        clockedOutAt,
        clockOutMethod: dto.method as any,
        isManualOverride: isManualOverride || attendance.isManualOverride,
        overrideReason:   dto.override_reason ?? attendance.overrideReason,
        approvedBy:       isManualOverride ? user.id : attendance.approvedBy,
      },
    });

    await this.prisma.shift.update({
      where: { id: shiftId },
      data: { status: 'completed' },
    });

    // Calculate hours worked
    const hoursWorked = (
      (clockedOutAt.getTime() - attendance.clockedInAt.getTime()) / 3_600_000
      - (shift.breakMinutes / 60)
    ).toFixed(2);

    return { ...updated, hours_worked: Number(hoursWorked) };
  }

  // ─── Today's active shifts for a home ─────────────────────────────────────

  async getTodayShifts(homeId: string, user: RequestUser) {
    this.assertAccess(homeId, user);

    const now = new Date();
    const start = this.dayStart(now);
    const end   = this.dayEnd(now);

    const shifts = await this.prisma.shift.findMany({
      where: {
        homeId,
        date: { gte: start, lte: end },
        status: { notIn: ['cancelled'] },
      },
      include: {
        staff: { select: { id: true, fullName: true, role: true, phone: true } },
        attendance: true,
      },
      orderBy: { startTime: 'asc' },
    });

    return shifts.map((s) => ({
      ...s,
      clock_status: !s.attendance
        ? 'not_clocked_in'
        : !s.attendance.clockedOutAt
          ? 'clocked_in'
          : 'clocked_out',
      hours_worked: s.attendance?.clockedInAt && s.attendance?.clockedOutAt
        ? Number(((s.attendance.clockedOutAt.getTime() - s.attendance.clockedInAt.getTime()) / 3_600_000 - s.breakMinutes / 60).toFixed(2))
        : null,
    }));
  }

  // ─── Attendance report for a week ─────────────────────────────────────────

  async getAttendanceReport(homeId: string, weekStart: string, user: RequestUser) {
    this.assertAccess(homeId, user);
    this.assertManager(user);

    const monday = this.toMonday(new Date(weekStart));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const shifts = await this.prisma.shift.findMany({
      where: { homeId, date: { gte: monday, lte: sunday } },
      include: {
        staff: { select: { id: true, fullName: true, role: true, employmentType: true } },
        attendance: true,
      },
      orderBy: [{ staffId: 'asc' }, { date: 'asc' }],
    });

    // Group by staff
    const byStaff = new Map<string, { staff: any; shifts: typeof shifts }>();
    for (const shift of shifts) {
      if (!byStaff.has(shift.staffId)) {
        byStaff.set(shift.staffId, { staff: shift.staff, shifts: [] });
      }
      byStaff.get(shift.staffId)!.shifts.push(shift);
    }

    return Array.from(byStaff.values()).map(({ staff, shifts: staffShifts }) => {
      const scheduledHours = staffShifts.reduce((sum, s) => {
        const start = s.startTime as Date;
        const end   = s.endTime as Date;
        return sum + ((end.getTime() - start.getTime()) / 3_600_000) - s.breakMinutes / 60;
      }, 0);

      const workedHours = staffShifts.reduce((sum, s) => {
        if (!s.attendance?.clockedInAt || !s.attendance?.clockedOutAt) return sum;
        return sum + (
          (s.attendance.clockedOutAt.getTime() - s.attendance.clockedInAt.getTime()) / 3_600_000
          - s.breakMinutes / 60
        );
      }, 0);

      return {
        staff,
        scheduled_hours: Number(scheduledHours.toFixed(2)),
        worked_hours:    Number(workedHours.toFixed(2)),
        total_shifts:    staffShifts.length,
        absent_shifts:   staffShifts.filter((s) => s.status === 'absent').length,
        completed_shifts: staffShifts.filter((s) => s.status === 'completed').length,
        shifts:          staffShifts,
      };
    });
  }

  // ─── Staff's own shifts ────────────────────────────────────────────────────

  async getMyShifts(homeId: string, weekStart: string, user: RequestUser) {
    this.assertAccess(homeId, user);

    const monday = this.toMonday(new Date(weekStart));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return this.prisma.shift.findMany({
      where: {
        homeId,
        staffId: user.id,   // staff member sees only own shifts
        date: { gte: monday, lte: sunday },
        status: { not: 'cancelled' },
      },
      include: { attendance: true },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private assertAccess(homeId: string, user: RequestUser): void {
    if (['platform_admin', 'group_admin'].includes(user.role)) return;
    if (user.homeIds.includes(homeId)) return;
    throw new ForbiddenException('Access denied to this home');
  }

  private assertManager(user: RequestUser): void {
    if (!this.isManagerRole(user)) {
      throw new ForbiddenException('Manager role required to manage the rota');
    }
  }

  private isManagerRole(user: RequestUser): boolean {
    return ['home_manager', 'registered_manager', 'platform_admin'].includes(user.role);
  }

  private async findShiftOrFail(homeId: string, shiftId: string) {
    const shift = await this.prisma.shift.findFirst({ where: { id: shiftId, homeId } });
    if (!shift) throw new NotFoundException(`Shift ${shiftId} not found`);
    return shift;
  }

  private toMonday(date: Date): Date {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    const day = d.getUTCDay(); // 0=Sun, 1=Mon…
    const diff = (day === 0 ? -6 : 1 - day);
    d.setUTCDate(d.getUTCDate() + diff);
    return d;
  }

  private toDateStr(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private dayStart(date: Date): Date {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  private dayEnd(date: Date): Date {
    const d = new Date(date);
    d.setUTCHours(23, 59, 59, 999);
    return d;
  }
}
