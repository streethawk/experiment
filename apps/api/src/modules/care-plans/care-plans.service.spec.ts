import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { CarePlansService } from './care-plans.service';
import { PRISMA_SERVICE } from '../../database/database.module';

const makeUser = (overrides: object = {}): any => ({
  id: 'user-manager', email: 'manager@test.com', role: 'home_manager',
  organisationId: 'org-1', homeIds: ['home-1'],
  ...overrides,
});

const makePlan = (overrides: object = {}): any => ({
  id: 'plan-1', residentId: 'resident-1', homeId: 'home-1',
  version: 1, status: 'draft',
  sections: { personal_care: { content: 'Prefers morning bath' } },
  createdBy: 'user-1', approvedBy: null, approvedAt: null,
  nextReviewDate: null, createdAt: new Date(), updatedAt: new Date(),
  ...overrides,
});

describe('CarePlansService', () => {
  let service: CarePlansService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma = {
      carePlan: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      resident: { findFirst: jest.fn() },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CarePlansService,
        { provide: PRISMA_SERVICE, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(CarePlansService);
    prisma = mockPrisma;
  });

  describe('create', () => {
    it('creates draft with version auto-incremented from latest', async () => {
      prisma.resident.findFirst.mockResolvedValue({ id: 'resident-1' });
      prisma.carePlan.findFirst.mockResolvedValue({ version: 2 }); // existing latest
      prisma.carePlan.create.mockResolvedValue(makePlan({ version: 3 }));

      await service.create('home-1', 'resident-1', {}, makeUser());

      expect(prisma.carePlan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ version: 3, status: 'draft' }),
        }),
      );
    });

    it('creates version 1 when no previous plan exists', async () => {
      prisma.resident.findFirst.mockResolvedValue({ id: 'resident-1' });
      prisma.carePlan.findFirst.mockResolvedValue(null); // no previous
      prisma.carePlan.create.mockResolvedValue(makePlan({ version: 1 }));

      await service.create('home-1', 'resident-1', {}, makeUser());

      expect(prisma.carePlan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ version: 1 }),
        }),
      );
    });
  });

  describe('update', () => {
    it('deep-merges sections — preserves existing keys', async () => {
      const existingPlan = makePlan({
        sections: { personal_care: 'morning bath', nutrition: 'pureed diet' },
      });
      prisma.carePlan.findFirst.mockResolvedValue(existingPlan);
      prisma.carePlan.update.mockResolvedValue(existingPlan);

      await service.update('home-1', 'resident-1', 'plan-1', {
        sections: { nutrition: 'soft diet' }, // patch only nutrition
      }, makeUser());

      expect(prisma.carePlan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sections: {
              personal_care: 'morning bath', // preserved
              nutrition: 'soft diet',         // overwritten
            },
          }),
        }),
      );
    });

    it('throws BadRequestException for superseded plan', async () => {
      prisma.carePlan.findFirst.mockResolvedValue(makePlan({ status: 'superseded' }));

      await expect(
        service.update('home-1', 'resident-1', 'plan-1', {}, makeUser()),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approve', () => {
    it('throws ForbiddenException for non-manager', async () => {
      prisma.carePlan.findFirst.mockResolvedValue(makePlan({ status: 'draft' }));

      await expect(
        service.approve('home-1', 'resident-1', 'plan-1', makeUser({ role: 'senior_carer' })),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when plan is not draft', async () => {
      prisma.carePlan.findFirst.mockResolvedValue(makePlan({ status: 'current' }));

      await expect(
        service.approve('home-1', 'resident-1', 'plan-1', makeUser()),
      ).rejects.toThrow(BadRequestException);
    });

    it('supersedes existing current plan and approves draft', async () => {
      prisma.carePlan.findFirst
        .mockResolvedValueOnce(makePlan({ status: 'draft' }))  // findOrFail
        .mockResolvedValueOnce(makePlan({ status: 'current' })); // return value

      prisma.$transaction.mockImplementation(async (ops: any[]) => {
        for (const op of ops) await op;
      });
      prisma.carePlan.updateMany.mockResolvedValue({ count: 1 });
      prisma.carePlan.update.mockResolvedValue(makePlan({ status: 'current' }));

      await service.approve('home-1', 'resident-1', 'plan-1', makeUser());

      expect(prisma.carePlan.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'superseded' } }),
      );
      expect(prisma.carePlan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'current', approvedBy: 'user-manager' }),
        }),
      );
    });
  });
});
