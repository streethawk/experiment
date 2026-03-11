import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { ResidentsService } from './residents.service';
import { PRISMA_SERVICE } from '../../database/database.module';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeUser = (overrides: object = {}): any => ({
  id: 'user-1', email: 'carer@test.com', role: 'carer',
  organisationId: 'org-1', homeIds: ['home-1'],
  ...overrides,
});

const makeResident = (overrides: object = {}): any => ({
  id: 'resident-1', homeId: 'home-1', organisationId: 'org-1',
  fullName: 'Edith Thompson', preferredName: 'Edith',
  dateOfBirth: new Date('1938-03-12'), gender: null,
  ethnicity: null, religion: null, firstLanguage: null, interpreterRequired: false,
  nhsNumber: '9434765281', gpName: 'Dr Smith', gpPractice: 'Oakwood Surgery',
  gpPhone: null, status: 'active', careType: 'residential',
  admissionDate: new Date('2024-01-01'), admissionSource: 'hospital_discharge',
  dischargeDate: null, dischargeTo: null, dischargeReason: null,
  primaryFundingSource: 'self_funded', dnarInPlace: false, mcaLacksCapacity: null,
  keyworkerId: null, roomId: null, photoS3Key: null,
  room: null, contacts: [], allergies: [], carePlans: [], riskAssessments: [],
  _count: { medications: 3, incidents: 0 },
  deletedAt: null, createdAt: new Date(), updatedAt: new Date(),
  ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ResidentsService', () => {
  let service: ResidentsService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma = {
      resident: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      home: { findFirst: jest.fn() },
      room: { findFirst: jest.fn() },
      residentContact: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn(),
      },
      allergy: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResidentsService,
        { provide: PRISMA_SERVICE, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(ResidentsService);
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
      prisma.resident.findMany.mockResolvedValue([]);
      await expect(
        service.findAll('any-home', {}, makeUser({ role: 'platform_admin', homeIds: [] })),
      ).resolves.not.toThrow();
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('filters by active status by default', async () => {
      prisma.resident.findMany.mockResolvedValue([]);
      await service.findAll('home-1', {}, makeUser());
      expect(prisma.resident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'active' }) }),
      );
    });

    it('returns cursor-paginated response with has_more and next_cursor', async () => {
      // Return limit+1 items to trigger has_more
      const items = Array.from({ length: 21 }, (_, i) =>
        makeResident({ id: `r-${i}`, fullName: `Resident ${i}`, room: null, allergies: [] }),
      );
      prisma.resident.findMany.mockResolvedValue(items);

      const result = await service.findAll('home-1', { limit: 20 }, makeUser());

      expect(result.has_more).toBe(true);
      expect(result.next_cursor).toBeDefined();
      expect(result.data).toHaveLength(20);
    });

    it('sets has_more to false when no extra item', async () => {
      prisma.resident.findMany.mockResolvedValue([makeResident({ room: null, allergies: [] })]);
      const result = await service.findAll('home-1', { limit: 20 }, makeUser());
      expect(result.has_more).toBe(false);
      expect(result.next_cursor).toBeNull();
    });

    it('builds search OR filter when search param provided', async () => {
      prisma.resident.findMany.mockResolvedValue([]);
      await service.findAll('home-1', { search: 'Edith' }, makeUser());
      const callArg = prisma.resident.findMany.mock.calls[0][0];
      expect(callArg.where.OR).toBeDefined();
      expect(callArg.where.OR.length).toBeGreaterThan(0);
    });
  });

  // ─── create (admit) ───────────────────────────────────────────────────────

  describe('create', () => {
    it('throws NotFoundException when home does not exist', async () => {
      prisma.home.findFirst.mockResolvedValue(null);

      await expect(
        service.create('home-1', {
          full_name: 'Test', date_of_birth: '1940-01-01',
          care_type: 'residential', admission_date: '2024-01-01',
          admission_source: 'self_referral', primary_funding_source: 'self_funded',
        }, makeUser()),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when room is already occupied', async () => {
      prisma.home.findFirst.mockResolvedValue({ organisationId: 'org-1' });
      prisma.room.findFirst.mockResolvedValue({ id: 'room-1' });
      prisma.resident.findFirst.mockResolvedValue(makeResident()); // existing occupant

      await expect(
        service.create('home-1', {
          full_name: 'Test', date_of_birth: '1940-01-01',
          room_id: 'room-1', care_type: 'residential',
          admission_date: '2024-01-01', admission_source: 'self_referral',
          primary_funding_source: 'self_funded',
        }, makeUser()),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates resident and NOK contacts in a transaction', async () => {
      prisma.home.findFirst.mockResolvedValue({ organisationId: 'org-1' });
      prisma.room.findFirst.mockResolvedValue(null); // no room

      const createdResident = makeResident();
      prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));
      prisma.resident.create.mockResolvedValue(createdResident);
      prisma.residentContact.createMany.mockResolvedValue({ count: 1 });

      // findOrFail call
      prisma.resident.findFirst.mockResolvedValue(createdResident);

      await service.create('home-1', {
        full_name: 'Edith Thompson', date_of_birth: '1938-03-12',
        care_type: 'residential', admission_date: '2024-01-01',
        admission_source: 'hospital_discharge', primary_funding_source: 'self_funded',
        nok: [{
          name: 'John Thompson', relationship: 'Son',
          is_primary_nok: true, has_lpa_welfare: false, has_lpa_finance: false,
        }],
      }, makeUser({ role: 'home_manager' }));

      expect(prisma.resident.create).toHaveBeenCalled();
      expect(prisma.residentContact.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ name: 'John Thompson', isPrimaryNok: true }),
          ]),
        }),
      );
    });
  });

  // ─── discharge ────────────────────────────────────────────────────────────

  describe('discharge', () => {
    it('throws BadRequestException for already discharged resident', async () => {
      prisma.resident.findFirst.mockResolvedValue({ id: 'resident-1', status: 'discharged' });

      await expect(
        service.discharge('home-1', 'resident-1', {
          discharge_date: '2024-06-01', discharge_to: 'home',
        }, makeUser({ role: 'home_manager' })),
      ).rejects.toThrow(BadRequestException);
    });

    it('sets status to deceased when discharge_to is deceased', async () => {
      prisma.resident.findFirst.mockResolvedValue({ id: 'resident-1', status: 'active' });
      prisma.resident.update.mockResolvedValue({});

      const result = await service.discharge('home-1', 'resident-1', {
        discharge_date: '2024-06-01', discharge_to: 'deceased',
      }, makeUser({ role: 'home_manager' }));

      expect(prisma.resident.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'deceased', roomId: null }),
        }),
      );
      expect(result.status).toBe('deceased');
    });

    it('frees the room on discharge', async () => {
      prisma.resident.findFirst.mockResolvedValue({ id: 'resident-1', status: 'active' });
      prisma.resident.update.mockResolvedValue({});

      await service.discharge('home-1', 'resident-1', {
        discharge_date: '2024-06-01', discharge_to: 'home',
      }, makeUser({ role: 'home_manager' }));

      expect(prisma.resident.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ roomId: null }),
        }),
      );
    });
  });

  // ─── allergies ────────────────────────────────────────────────────────────

  describe('createAllergy', () => {
    it('creates allergy with recordedBy set to user id', async () => {
      prisma.resident.findFirst.mockResolvedValue({ id: 'resident-1', status: 'active' });
      prisma.allergy.create.mockResolvedValue({ id: 'allergy-1' });

      await service.createAllergy('home-1', 'resident-1', {
        substance: 'Penicillin', reaction: 'Anaphylaxis', severity: 'life_threatening',
      }, 'user-1', makeUser({ role: 'senior_carer' }));

      expect(prisma.allergy.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            substance: 'Penicillin',
            severity: 'life_threatening',
            recordedBy: 'user-1',
          }),
        }),
      );
    });
  });
});
