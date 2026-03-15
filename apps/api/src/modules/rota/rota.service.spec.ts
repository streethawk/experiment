import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException, ForbiddenException,
  BadRequestException, ConflictException,
} from '@nestjs/common';
import { RotaService } from './rota.service';
import { PRISMA_SERVICE } from '../../database/database.module';

const makeUser = (overrides: object = {}): any => ({
  id: 'user-1', email: 'manager@test.com', role: 'home_manager',
  organisationId: 'org-1', homeIds: ['home-1'],
  ...overrides,
});

const makeShift = (overrides: object = {}): any => ({
  id: 'shift-1', homeId: 'home-1', staffId: 'staff-1',
  date: new Date('2024-06-03'), shiftType: 'early',
  startTime: new Date('1970-01-01T07:00:00Z'),
  endTime:   new Date('1970-01-01T15:00:00Z'),
  breakMinutes: 30, roleOnShift: 'carer',
  isAgency: false, agencyName: null,
  status: 'scheduled', notes: null, createdBy: 'user-1',
  createdAt: new Date(), updatedAt: new Date(),
  ...overrides,
});

const makeAttendance = (overrides: object = {}): any => ({
  id: 'att-1', shiftId: 'shift-1', staffId: 'staff-1',
  clockedInAt: new Date('2024-06-03T07:02:00Z'),
  clockInMethod: 'pin',
  clockedOutAt: null, clockOutMethod: null,
  isManualOverride: false, overrideReason: null, approvedBy: null,
  createdAt: new Date(), updatedAt: new Date(),
  ...overrides,
});

describe('RotaService', () => {
  let service: RotaService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma = {
      shift: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      staff: { findFirst: jest.fn() },
      attendance: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RotaService,
        { provide: PRISMA_SERVICE, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(RotaService);
    prisma = mockPrisma;
  });

  // ─── Access control ───────────────────────────────────────────────────────

  describe('access control', () => {
    it('denies staff in another home', async () => {
      await expect(
        service.getWeekRota('other-home', '2024-06-03', makeUser({ homeIds: ['home-1'] })),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows platform_admin to access any home', async () => {
      prisma.shift.findMany.mockResolvedValue([]);
      await expect(
        service.getWeekRota('any-home', '2024-06-03', makeUser({ role: 'platform_admin', homeIds: [] })),
      ).resolves.toBeDefined();
    });

    it('denies carer from creating shifts', async () => {
      await expect(
        service.createShift('home-1', {
          staff_id: 'staff-1', date: '2024-06-03',
          shift_type: 'early' as any, start_time: '07:00', end_time: '15:00',
          role_on_shift: 'carer' as any,
        }, makeUser({ role: 'carer' })),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── getWeekRota ──────────────────────────────────────────────────────────

  describe('getWeekRota', () => {
    it('returns 7 days keyed from Monday', async () => {
      prisma.shift.findMany.mockResolvedValue([]);

      const result = await service.getWeekRota('home-1', '2024-06-05', makeUser()); // Wednesday

      expect(result.week_start).toBe('2024-06-03'); // Monday
      expect(result.week_end).toBe('2024-06-09');   // Sunday
      expect(Object.keys(result.by_day)).toHaveLength(7);
    });

    it('groups shifts into the correct day bucket', async () => {
      prisma.shift.findMany.mockResolvedValue([
        makeShift({ date: new Date('2024-06-04'), staff: { id: 's1', fullName: 'Alice', role: 'carer', employmentType: 'full_time', phone: null } }),
      ]);

      const result = await service.getWeekRota('home-1', '2024-06-03', makeUser());
      expect(result.by_day['2024-06-04']).toHaveLength(1);
      expect(result.by_day['2024-06-03']).toHaveLength(0);
    });
  });

  // ─── createShift ──────────────────────────────────────────────────────────

  describe('createShift', () => {
    it('throws NotFoundException for unknown staff', async () => {
      prisma.staff.findFirst.mockResolvedValue(null);

      await expect(
        service.createShift('home-1', {
          staff_id: 'ghost', date: '2024-06-03',
          shift_type: 'early' as any, start_time: '07:00', end_time: '15:00',
          role_on_shift: 'carer' as any,
        }, makeUser()),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException on double-booking', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: 'staff-1', fullName: 'Alice' });
      prisma.shift.findFirst.mockResolvedValue(makeShift()); // existing shift

      await expect(
        service.createShift('home-1', {
          staff_id: 'staff-1', date: '2024-06-03',
          shift_type: 'late' as any, start_time: '15:00', end_time: '23:00',
          role_on_shift: 'carer' as any,
        }, makeUser()),
      ).rejects.toThrow(ConflictException);
    });

    it('creates shift when no conflict', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: 'staff-1', fullName: 'Alice' });
      prisma.shift.findFirst.mockResolvedValue(null); // no conflict
      prisma.shift.create.mockResolvedValue(makeShift({ status: 'scheduled' }));

      await service.createShift('home-1', {
        staff_id: 'staff-1', date: '2024-06-03',
        shift_type: 'early' as any, start_time: '07:00', end_time: '15:00',
        role_on_shift: 'carer' as any, break_minutes: 30,
      }, makeUser());

      expect(prisma.shift.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'scheduled', breakMinutes: 30 }),
        }),
      );
    });
  });

  // ─── clockIn ──────────────────────────────────────────────────────────────

  describe('clockIn', () => {
    it("throws ForbiddenException when carer clocks into someone else's shift", async () => {
      prisma.shift.findFirst.mockResolvedValue(makeShift({ staffId: 'other-staff' }));

      await expect(
        service.clockIn('home-1', 'shift-1', { method: 'pin' as any }, makeUser({ role: 'carer', id: 'user-1' })),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException for manual clock-in without override_reason', async () => {
      prisma.shift.findFirst.mockResolvedValue(makeShift({ staffId: 'user-1' }));

      await expect(
        service.clockIn('home-1', 'shift-1', { method: 'manual' as any }, makeUser({ role: 'carer', id: 'user-1' })),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates attendance record and moves shift to in_progress', async () => {
      prisma.shift.findFirst.mockResolvedValue(makeShift({ staffId: 'user-1' }));
      prisma.attendance.upsert.mockResolvedValue(makeAttendance());
      prisma.shift.update.mockResolvedValue({});

      await service.clockIn('home-1', 'shift-1', { method: 'pin' as any }, makeUser({ role: 'carer', id: 'user-1' }));

      expect(prisma.attendance.upsert).toHaveBeenCalled();
      expect(prisma.shift.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'in_progress' } }),
      );
    });
  });

  // ─── clockOut ─────────────────────────────────────────────────────────────

  describe('clockOut', () => {
    it('throws BadRequestException if not yet clocked in', async () => {
      prisma.shift.findFirst.mockResolvedValue(makeShift({ staffId: 'user-1' }));
      prisma.attendance.findUnique.mockResolvedValue(null);

      await expect(
        service.clockOut('home-1', 'shift-1', { method: 'pin' as any }, makeUser({ role: 'carer', id: 'user-1' })),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if already clocked out', async () => {
      prisma.shift.findFirst.mockResolvedValue(makeShift({ staffId: 'user-1' }));
      prisma.attendance.findUnique.mockResolvedValue(
        makeAttendance({ clockedOutAt: new Date('2024-06-03T15:05:00Z') }),
      );

      await expect(
        service.clockOut('home-1', 'shift-1', { method: 'pin' as any }, makeUser({ role: 'carer', id: 'user-1' })),
      ).rejects.toThrow(BadRequestException);
    });

    it('calculates hours_worked correctly', async () => {
      prisma.shift.findFirst.mockResolvedValue(makeShift({ staffId: 'user-1', breakMinutes: 30 }));
      prisma.attendance.findUnique.mockResolvedValue(
        makeAttendance({ clockedInAt: new Date('2024-06-03T07:02:00Z'), clockedOutAt: null }),
      );
      prisma.attendance.update.mockResolvedValue(
        makeAttendance({
          clockedInAt:  new Date('2024-06-03T07:02:00Z'),
          clockedOutAt: new Date('2024-06-03T15:05:00Z'),
        }),
      );
      prisma.shift.update.mockResolvedValue({});

      const result = await service.clockOut(
        'home-1', 'shift-1',
        { method: 'pin' as any, clocked_out_at: '2024-06-03T15:05:00Z' },
        makeUser({ role: 'carer', id: 'user-1' }),
      );

      // 8h 3min clock time − 30min break = 7.55h
      expect(result.hours_worked).toBeCloseTo(7.55, 1);
    });
  });
});
