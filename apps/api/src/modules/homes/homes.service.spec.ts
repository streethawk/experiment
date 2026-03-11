import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { HomesService } from './homes.service';
import { PRISMA_SERVICE } from '../../database/database.module';

const makeUser = (overrides: object = {}): any => ({
  id: 'user-1', email: 'manager@test.com', role: 'home_manager',
  organisationId: 'org-1', homeIds: ['home-1'],
  ...overrides,
});

const makeHome = (overrides: object = {}): any => ({
  id: 'home-1', name: 'Oakwood West', organisationId: 'org-1',
  organisation: { id: 'org-1', name: 'Oakwood Group' },
  cqcRegistrationNumber: '1-123', addressLine1: '12 Oak Lane', addressLine2: null,
  city: 'Bristol', postcode: 'BS1 4DP', phone: null, email: null,
  bedCapacity: 40, careTypes: ['residential'], lastCqcRating: 'good',
  lastCqcInspectionDate: null, registeredManagerId: null,
  deletedAt: null, createdAt: new Date(),
  ...overrides,
});

describe('HomesService', () => {
  let service: HomesService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma = {
      home: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      resident: { groupBy: jest.fn() },
      shift: { count: jest.fn() },
      incident: { count: jest.fn() },
      staff: { count: jest.fn(), findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HomesService,
        { provide: PRISMA_SERVICE, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(HomesService);
    prisma = mockPrisma;
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('platform_admin gets all homes', async () => {
      prisma.home.findMany.mockResolvedValue([]);
      await service.findAll(makeUser({ role: 'platform_admin', homeIds: [] }));
      expect(prisma.home.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null } }),
      );
    });

    it('group_admin gets homes in own org', async () => {
      prisma.home.findMany.mockResolvedValue([]);
      await service.findAll(makeUser({ role: 'group_admin', homeIds: [] }));
      expect(prisma.home.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organisationId: 'org-1', deletedAt: null } }),
      );
    });

    it('carer gets only assigned homes', async () => {
      prisma.home.findMany.mockResolvedValue([makeHome()]);
      await service.findAll(makeUser({ role: 'carer', homeIds: ['home-1'] }));
      expect(prisma.home.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: { in: ['home-1'] }, deletedAt: null } }),
      );
    });

    it('returns empty array for carer with no homeIds', async () => {
      const result = await service.findAll(makeUser({ role: 'carer', homeIds: [] }));
      expect(result).toEqual([]);
      expect(prisma.home.findMany).not.toHaveBeenCalled();
    });
  });

  // ─── findOne / access control ─────────────────────────────────────────────

  describe('findOne', () => {
    it('throws ForbiddenException if carer accesses home not in their list', async () => {
      await expect(
        service.findOne('home-other', makeUser({ role: 'carer', homeIds: ['home-1'] })),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException if home not found', async () => {
      prisma.home.findFirst.mockResolvedValue(null);
      await expect(
        service.findOne('home-1', makeUser()),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns formatted home for authorised user', async () => {
      prisma.home.findFirst.mockResolvedValue(makeHome());
      const result = await service.findOne('home-1', makeUser());
      expect(result.id).toBe('home-1');
      expect(result.bed_capacity).toBe(40); // snake_case mapped
    });
  });

  // ─── getDashboard ─────────────────────────────────────────────────────────

  describe('getDashboard', () => {
    it('returns occupancy, staffing and compliance metrics', async () => {
      prisma.home.findFirst.mockResolvedValue(makeHome());
      prisma.resident.groupBy.mockResolvedValue([
        { status: 'active', _count: { id: 35 } },
      ]);
      prisma.shift.count.mockResolvedValue(12);
      prisma.incident.count.mockResolvedValue(2);
      prisma.staff.count.mockResolvedValue(1);

      const result = await service.getDashboard('home-1', makeUser());

      expect(result.occupancy.active_residents).toBe(35);
      expect(result.occupancy.bed_capacity).toBe(40);
      expect(result.occupancy.occupancy_rate).toBe(88); // 35/40 * 100
      expect(result.staffing.on_shift_now).toBe(12);
      expect(result.compliance.open_incidents_7d).toBe(2);
      expect(result.compliance.dbs_expired_or_expiring).toBe(1);
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('normalises postcode to uppercase', async () => {
      prisma.home.create.mockResolvedValue(makeHome({ postcode: 'BS1 4DP' }));

      await service.create({
        name: 'Test Home', organisation_id: 'org-1',
        address_line1: '1 Test St', city: 'Bristol', postcode: 'bs1 4dp',
        bed_capacity: 20, care_types: ['residential'],
      });

      expect(prisma.home.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ postcode: 'BS1 4DP' }),
        }),
      );
    });
  });
});
