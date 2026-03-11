import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrganisationsService } from './organisations.service';
import { PRISMA_SERVICE } from '../../database/database.module';

const makeUser = (overrides: object = {}): any => ({
  id: 'user-1', email: 'admin@test.com', role: 'platform_admin',
  organisationId: 'org-1', homeIds: [],
  ...overrides,
});

const makeOrg = (overrides: object = {}): any => ({
  id: 'org-1', name: 'Oakwood', type: 'care_group',
  subscriptionTier: 'professional', billingEmail: 'billing@oakwood.co.uk',
  icoRegistrationRef: 'Z123', subscriptionStart: null, subscriptionEnd: null,
  deletedAt: null, createdAt: new Date(), updatedAt: new Date(),
  _count: { homes: 3, staff: 50, residents: 40 },
  ...overrides,
});

describe('OrganisationsService', () => {
  let service: OrganisationsService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma = {
      organisation: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      home: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganisationsService,
        { provide: PRISMA_SERVICE, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(OrganisationsService);
    prisma = mockPrisma;
  });

  describe('findAll', () => {
    it('platform_admin sees all orgs', async () => {
      const org = makeOrg();
      prisma.organisation.findMany.mockResolvedValue([org]);

      await service.findAll(makeUser({ role: 'platform_admin' }));

      expect(prisma.organisation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null } }),
      );
    });

    it('group_admin only sees own org', async () => {
      prisma.organisation.findMany.mockResolvedValue([makeOrg()]);

      await service.findAll(makeUser({ role: 'group_admin', organisationId: 'org-1' }));

      expect(prisma.organisation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'org-1', deletedAt: null } }),
      );
    });
  });

  describe('create', () => {
    it('creates organisation with correct data mapping', async () => {
      const org = makeOrg();
      prisma.organisation.create.mockResolvedValue(org);

      await service.create({
        name: 'Oakwood', type: 'care_group',
        subscription_tier: 'professional', billing_email: 'billing@oakwood.co.uk',
        ico_registration_ref: 'Z123',
      });

      expect(prisma.organisation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Oakwood', type: 'care_group',
            subscriptionTier: 'professional',
            billingEmail: 'billing@oakwood.co.uk',
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('throws ForbiddenException if group_admin accesses different org', async () => {
      await expect(
        service.findOne('org-999', makeUser({ role: 'group_admin', organisationId: 'org-1' })),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException if org not found', async () => {
      prisma.organisation.findFirst.mockResolvedValue(null);
      await expect(
        service.findOne('org-1', makeUser({ role: 'platform_admin' })),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns formatted org for authorised user', async () => {
      prisma.organisation.findFirst.mockResolvedValue(makeOrg());
      const result = await service.findOne('org-1', makeUser());
      expect(result.id).toBe('org-1');
      expect(result.subscription_tier).toBe('professional'); // snake_case mapping
    });
  });

  describe('findHomes', () => {
    it('returns homes for the org', async () => {
      prisma.organisation.findFirst.mockResolvedValue(makeOrg());
      prisma.home.findMany.mockResolvedValue([{ id: 'home-1', name: 'Oakwood West' }]);

      const result = await service.findHomes('org-1', makeUser());
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Oakwood West');
    });
  });
});
