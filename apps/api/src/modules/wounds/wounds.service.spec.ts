import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { WoundsService } from './wounds.service';
import { PRISMA_SERVICE } from '../../database/database.module';

const makeUser = (overrides: object = {}): any => ({
  id: 'user-1', email: 'nurse@test.com', role: 'nurse',
  organisationId: 'org-1', homeIds: ['home-1'],
  ...overrides,
});

const makeWound = (overrides: object = {}): any => ({
  id: 'wound-1', residentId: 'resident-1',
  site: 'Sacrum', woundType: 'Pressure ulcer — Category 2',
  onsetDate: new Date('2024-05-20'), status: 'open',
  healedDate: null, createdBy: 'user-1',
  createdAt: new Date(), updatedAt: new Date(),
  assessments: [],
  ...overrides,
});

describe('WoundsService', () => {
  let service: WoundsService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma = {
      wound: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      woundAssessment: { create: jest.fn() },
      resident: { findFirst: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WoundsService,
        { provide: PRISMA_SERVICE, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(WoundsService);
    prisma = mockPrisma;
  });

  // ─── Access control ───────────────────────────────────────────────────────

  describe('access control', () => {
    it('denies carer role from creating wounds', async () => {
      prisma.resident.findFirst.mockResolvedValue({ id: 'resident-1' });

      await expect(
        service.create('home-1', 'resident-1', { site: 'Sacrum' }, makeUser({ role: 'carer' })),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows nurse to create a wound', async () => {
      prisma.resident.findFirst.mockResolvedValue({ id: 'resident-1' });
      prisma.wound.create.mockResolvedValue(makeWound());

      await expect(
        service.create('home-1', 'resident-1', { site: 'Sacrum' }, makeUser()),
      ).resolves.toBeDefined();
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates wound with status open', async () => {
      prisma.resident.findFirst.mockResolvedValue({ id: 'resident-1' });
      prisma.wound.create.mockResolvedValue(makeWound());

      await service.create('home-1', 'resident-1', {
        site: 'Left heel', wound_type: 'Category 1 pressure ulcer',
        onset_date: '2024-06-01',
      }, makeUser());

      expect(prisma.wound.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'open', site: 'Left heel' }),
        }),
      );
    });
  });

  // ─── updateStatus ─────────────────────────────────────────────────────────

  describe('updateStatus', () => {
    it('rejects re-opening a healed wound', async () => {
      prisma.wound.findFirst.mockResolvedValue(makeWound({ status: 'healed' }));
      prisma.resident.findFirst.mockResolvedValue({ id: 'resident-1' });

      await expect(
        service.updateStatus('home-1', 'resident-1', 'wound-1',
          { status: 'open' as any }, makeUser()),
      ).rejects.toThrow(BadRequestException);
    });

    it('sets healedDate when status changes to healed', async () => {
      prisma.wound.findFirst.mockResolvedValue(makeWound({ status: 'healing' }));
      prisma.resident.findFirst.mockResolvedValue({ id: 'resident-1' });
      prisma.wound.update.mockResolvedValue(makeWound({ status: 'healed' }));

      await service.updateStatus('home-1', 'resident-1', 'wound-1',
        { status: 'healed' as any, healed_date: '2024-06-15' }, makeUser());

      expect(prisma.wound.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'healed',
            healedDate: new Date('2024-06-15'),
          }),
        }),
      );
    });
  });

  // ─── addAssessment ────────────────────────────────────────────────────────

  describe('addAssessment', () => {
    it('throws BadRequestException on healed wound', async () => {
      prisma.wound.findFirst.mockResolvedValue(makeWound({ status: 'healed' }));
      prisma.resident.findFirst.mockResolvedValue({ id: 'resident-1' });

      await expect(
        service.addAssessment('home-1', 'resident-1', 'wound-1', {
          assessed_at: '2024-06-15T10:00:00Z',
        }, makeUser()),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates assessment with PUSH score', async () => {
      prisma.wound.findFirst.mockResolvedValue(makeWound({ status: 'open' }));
      prisma.resident.findFirst.mockResolvedValue({ id: 'resident-1' });
      prisma.woundAssessment.create.mockResolvedValue({ id: 'wa-1' });

      await service.addAssessment('home-1', 'resident-1', 'wound-1', {
        assessed_at: '2024-06-01T09:00:00Z',
        length_mm: 45, width_mm: 30, push_score: 8,
        dressing_used: 'Mepilex Border',
        next_change_date: '2024-06-04',
      }, makeUser());

      expect(prisma.woundAssessment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            woundId: 'wound-1',
            pushScore: 8,
            dressingUsed: 'Mepilex Border',
          }),
        }),
      );
    });
  });
});
