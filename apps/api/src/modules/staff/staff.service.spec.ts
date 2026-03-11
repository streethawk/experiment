import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException, NotFoundException, ConflictException,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { PRISMA_SERVICE } from '../../database/database.module';

const makeUser = (overrides: object = {}): any => ({
  id: 'user-manager-1', email: 'manager@test.com', role: 'home_manager',
  organisationId: 'org-1', homeIds: ['home-1'],
  ...overrides,
});

const makeStaffRecord = (overrides: object = {}): any => ({
  id: 'staff-1', homeId: 'home-1', organisationId: 'org-1', userId: null,
  fullName: 'Sarah Jones', email: 'sarah.jones@oakwood.co.uk', phone: null,
  role: 'senior_carer', employmentType: 'full_time', status: 'active',
  contractedHoursPw: 37.5, startDate: new Date('2022-01-01'), endDate: null,
  dbsType: 'Enhanced', dbsCertificateNo: '001234', dbsIssueDate: new Date('2022-01-01'),
  dbsOutcome: 'clear', rightToWorkChecked: true, nmcPin: null, nmcExpiry: null,
  createdAt: new Date(), deletedAt: null, _count: undefined,
  ...overrides,
});

describe('StaffService', () => {
  let service: StaffService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma = {
      staff: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      home: { findFirst: jest.fn() },
      staffTraining: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffService,
        { provide: PRISMA_SERVICE, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(StaffService);
    prisma = mockPrisma;
  });

  // ─── Access control ───────────────────────────────────────────────────────

  describe('access control', () => {
    it('throws ForbiddenException for home not in user homeIds', async () => {
      await expect(
        service.findAll('home-other', {}, makeUser({ homeIds: ['home-1'] })),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows platform_admin access to any home', async () => {
      prisma.staff.findMany.mockResolvedValue([]);
      await expect(
        service.findAll('home-any', {}, makeUser({ role: 'platform_admin', homeIds: [] })),
      ).resolves.not.toThrow();
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('applies status filter defaulting to active', async () => {
      prisma.staff.findMany.mockResolvedValue([]);
      await service.findAll('home-1', {}, makeUser());
      expect(prisma.staff.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'active' }),
        }),
      );
    });

    it('applies full-text search filter', async () => {
      prisma.staff.findMany.mockResolvedValue([]);
      await service.findAll('home-1', { search: 'sarah' }, makeUser());
      const callArg = prisma.staff.findMany.mock.calls[0][0];
      expect(callArg.where.OR).toBeDefined();
    });

    it('returns formatted staff list', async () => {
      prisma.staff.findMany.mockResolvedValue([makeStaffRecord()]);
      const result = await service.findAll('home-1', {}, makeUser());
      expect(result[0].full_name).toBe('Sarah Jones');
      expect(result[0].employment_type).toBe('full_time'); // snake_case
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('throws ConflictException for duplicate email', async () => {
      prisma.home.findFirst.mockResolvedValue({ organisationId: 'org-1' });
      prisma.staff.findFirst.mockResolvedValue(makeStaffRecord()); // existing

      await expect(
        service.create('home-1', {
          full_name: 'Another Staff',
          email: 'sarah.jones@oakwood.co.uk', // duplicate
          role: 'carer',
          employment_type: 'full_time',
          start_date: '2024-01-01',
        }, makeUser()),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when home does not exist', async () => {
      prisma.home.findFirst.mockResolvedValue(null);

      await expect(
        service.create('home-nonexistent', {
          full_name: 'New Staff', email: 'new@test.com',
          role: 'carer', employment_type: 'full_time', start_date: '2024-01-01',
        }, makeUser({ homeIds: ['home-nonexistent'] })),
      ).rejects.toThrow(NotFoundException);
    });

    it('normalises email to lowercase', async () => {
      prisma.home.findFirst.mockResolvedValue({ organisationId: 'org-1' });
      prisma.staff.findFirst.mockResolvedValue(null); // no duplicate
      prisma.staff.create.mockResolvedValue(makeStaffRecord({ email: 'new@test.com' }));

      await service.create('home-1', {
        full_name: 'New Staff', email: 'NEW@TEST.COM',
        role: 'carer', employment_type: 'full_time', start_date: '2024-01-01',
      }, makeUser());

      expect(prisma.staff.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'new@test.com' }),
        }),
      );
    });
  });

  // ─── training ─────────────────────────────────────────────────────────────

  describe('logTraining', () => {
    it('creates a training record with correct data', async () => {
      prisma.staff.findFirst.mockResolvedValue(makeStaffRecord());
      prisma.staffTraining.create.mockResolvedValue({
        id: 'training-1', staffId: 'staff-1',
        courseName: 'Moving and Handling',
      });

      await service.logTraining(
        'home-1', 'staff-1',
        {
          course_name: 'Moving and Handling',
          course_type: 'mandatory',
          completed_date: '2024-03-15',
          expiry_date: '2027-03-15',
        },
        'user-manager-1',
        makeUser(),
      );

      expect(prisma.staffTraining.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            staffId: 'staff-1',
            courseName: 'Moving and Handling',
            loggedBy: 'user-manager-1',
          }),
        }),
      );
    });
  });

  // ─── getTrainingMatrix ────────────────────────────────────────────────────

  describe('getTrainingMatrix', () => {
    it('returns compliance scores for each staff member', async () => {
      const staffWithTraining = {
        id: 'staff-1', fullName: 'Sarah Jones', role: 'senior_carer',
        training: [
          {
            id: 't1', courseName: 'Moving and Handling',
            completedDate: new Date('2024-01-01'),
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // future
          },
        ],
      };

      prisma.staff.findMany.mockResolvedValue([staffWithTraining]);

      const matrix = await service.getTrainingMatrix('home-1', makeUser());

      expect(matrix).toHaveLength(1);
      expect(matrix[0].full_name).toBe('Sarah Jones');
      expect(matrix[0].compliance_score).toBeGreaterThanOrEqual(0);
      expect(matrix[0].compliance_score).toBeLessThanOrEqual(100);

      const movingHandling = matrix[0].courses.find(
        (c: any) => c.name === 'Moving and Handling',
      );
      expect(movingHandling?.status).toBe('current');

      const missing = matrix[0].courses.find((c: any) => c.name === 'Fire Safety');
      expect(missing?.status).toBe('missing');
    });
  });
});
