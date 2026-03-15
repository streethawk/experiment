import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { MedicationsService } from './medications.service';
import { PRISMA_SERVICE } from '../../database/database.module';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeUser = (overrides: object = {}): any => ({
  id: 'user-1', email: 'nurse@test.com', role: 'nurse',
  organisationId: 'org-1', homeIds: ['home-1'],
  ...overrides,
});

const makeMed = (overrides: object = {}): any => ({
  id: 'med-1', residentId: 'resident-1', homeId: 'home-1',
  drugName: 'Metformin', form: 'tablet', strength: '500mg',
  dose: '500mg twice daily', route: 'oral',
  frequency: 'twice_daily', times: [
    new Date('1970-01-01T08:00:00Z'),
    new Date('1970-01-01T20:00:00Z'),
  ],
  indication: 'Type 2 diabetes', instructions: null,
  isPrn: false, prnCriteria: null,
  isControlledDrug: false, controlledDrugSchedule: null,
  prescribedBy: 'Dr Smith', prescribedDate: new Date('2024-01-01'),
  reviewDate: new Date('2024-07-01'),
  stockOnHand: null, status: 'active',
  discontinuedDate: null, discontinuedBy: null, discontinuedReason: null,
  createdBy: 'user-1', createdAt: new Date(), updatedAt: new Date(),
  ...overrides,
});

const makeResident = (): any => ({
  id: 'resident-1', homeId: 'home-1', deletedAt: null,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MedicationsService', () => {
  let service: MedicationsService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma = {
      medication: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      resident: { findFirst: jest.fn() },
      marEntry: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      controlledDrugRegister: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicationsService,
        { provide: PRISMA_SERVICE, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(MedicationsService);
    prisma = mockPrisma;
  });

  // ─── Access control ───────────────────────────────────────────────────────

  describe('access control', () => {
    it('throws ForbiddenException when user has no access to home', async () => {
      await expect(
        service.findAll('other-home', 'resident-1', makeUser({ homeIds: ['home-1'] })),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows platform_admin to access any home', async () => {
      prisma.resident.findFirst.mockResolvedValue(makeResident());
      prisma.medication.findMany.mockResolvedValue([]);

      await expect(
        service.findAll('any-home', 'resident-1', makeUser({ role: 'platform_admin', homeIds: [] })),
      ).resolves.not.toThrow();
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('throws NotFoundException when resident not in home', async () => {
      prisma.resident.findFirst.mockResolvedValue(null);

      await expect(
        service.findAll('home-1', 'resident-x', makeUser()),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns medications filtered by status', async () => {
      prisma.resident.findFirst.mockResolvedValue(makeResident());
      prisma.medication.findMany.mockResolvedValue([makeMed()]);

      const result = await service.findAll('home-1', 'resident-1', makeUser(), 'active');

      expect(prisma.medication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'active' }),
        }),
      );
      expect(result).toHaveLength(1);
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('throws ForbiddenException for carer role', async () => {
      await expect(
        service.create('home-1', 'resident-1', {
          drug_name: 'X', dose: '1mg', route: 'oral' as any,
          frequency: 'once_daily' as any,
        }, makeUser({ role: 'carer' })),
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates medication with time slots', async () => {
      prisma.resident.findFirst.mockResolvedValue(makeResident());
      prisma.medication.create.mockResolvedValue(makeMed());

      await service.create('home-1', 'resident-1', {
        drug_name: 'Metformin', dose: '500mg', route: 'oral' as any,
        frequency: 'twice_daily' as any, times: ['08:00', '20:00'],
      }, makeUser());

      expect(prisma.medication.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            drugName: 'Metformin',
            times: [
              new Date('1970-01-01T08:00:00Z'),
              new Date('1970-01-01T20:00:00Z'),
            ],
          }),
        }),
      );
    });
  });

  // ─── discontinue ──────────────────────────────────────────────────────────

  describe('discontinue', () => {
    it('throws BadRequestException for already discontinued medication', async () => {
      prisma.medication.findFirst.mockResolvedValue(makeMed({ status: 'discontinued' }));

      await expect(
        service.discontinue('home-1', 'resident-1', 'med-1', {
          discontinued_date: '2024-06-01',
        }, makeUser()),
      ).rejects.toThrow(BadRequestException);
    });

    it('sets status to discontinued and records who discontinued', async () => {
      prisma.medication.findFirst.mockResolvedValue(makeMed({ status: 'active' }));
      prisma.medication.update.mockResolvedValue(makeMed({ status: 'discontinued' }));

      await service.discontinue('home-1', 'resident-1', 'med-1', {
        discontinued_date: '2024-06-01',
        reason: 'GP review — no longer required',
      }, makeUser({ id: 'nurse-1' }));

      expect(prisma.medication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'discontinued',
            discontinuedBy: 'nurse-1',
            discontinuedReason: 'GP review — no longer required',
          }),
        }),
      );
    });
  });

  // ─── MAR chart ────────────────────────────────────────────────────────────

  describe('getMarChart', () => {
    it('throws NotFoundException for unknown resident', async () => {
      prisma.resident.findFirst.mockResolvedValue(null);

      await expect(
        service.getMarChart('home-1', 'resident-x', '2024-06-01', makeUser()),
      ).rejects.toThrow(NotFoundException);
    });

    it('builds correct slot times for the requested date', async () => {
      prisma.resident.findFirst.mockResolvedValue(makeResident());
      prisma.medication.findMany.mockResolvedValue([makeMed()]);
      prisma.marEntry.findMany.mockResolvedValue([]);

      const result = await service.getMarChart('home-1', 'resident-1', '2024-06-01', makeUser());

      expect(result.date).toBe('2024-06-01');
      expect(result.rows).toHaveLength(1);
      // Metformin has 08:00 and 20:00 slots
      expect(result.rows[0].slots).toHaveLength(2);
      expect(result.rows[0].slots[0].scheduled_time).toContain('2024-06-01T08:00');
      expect(result.rows[0].slots[1].scheduled_time).toContain('2024-06-01T20:00');
    });

    it('populates slot outcomes from existing MAR entries', async () => {
      const scheduled = new Date('2024-06-01T08:00:00Z');
      const marEntry = {
        id: 'mar-1',
        medicationId: 'med-1',
        residentId: 'resident-1',
        scheduledTime: scheduled,
        outcome: 'given',
        administeredAt: new Date('2024-06-01T08:05:00Z'),
        administeredBy: 'user-1',
        witnessId: null,
        notes: null,
        isPrn: false,
        prnIndication: null,
      };

      prisma.resident.findFirst.mockResolvedValue(makeResident());
      prisma.medication.findMany.mockResolvedValue([makeMed()]);
      prisma.marEntry.findMany.mockResolvedValue([marEntry]);

      const result = await service.getMarChart('home-1', 'resident-1', '2024-06-01', makeUser());

      expect(result.rows[0].slots[0].outcome).toBe('given');
      expect(result.rows[0].slots[0].mar_entry_id).toBe('mar-1');
    });
  });

  // ─── recordAdministration ─────────────────────────────────────────────────

  describe('recordAdministration', () => {
    it('throws BadRequestException for discontinued medication', async () => {
      prisma.medication.findFirst.mockResolvedValue(makeMed({ status: 'discontinued' }));

      await expect(
        service.recordAdministration('home-1', 'resident-1', {
          medication_id: 'med-1',
          scheduled_time: '2024-06-01T08:00:00Z',
          outcome: 'given' as any,
        }, makeUser({ role: 'carer' })),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for CD without witness', async () => {
      prisma.medication.findFirst.mockResolvedValue(
        makeMed({ isControlledDrug: true, status: 'active' }),
      );

      await expect(
        service.recordAdministration('home-1', 'resident-1', {
          medication_id: 'med-1',
          scheduled_time: '2024-06-01T08:00:00Z',
          outcome: 'given' as any,
          // no witness_id
        }, makeUser({ role: 'carer' })),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for duplicate regular slot', async () => {
      prisma.medication.findFirst.mockResolvedValue(makeMed({ status: 'active' }));
      prisma.marEntry.findFirst.mockResolvedValue({ id: 'existing-mar' });

      await expect(
        service.recordAdministration('home-1', 'resident-1', {
          medication_id: 'med-1',
          scheduled_time: '2024-06-01T08:00:00Z',
          outcome: 'given' as any,
        }, makeUser({ role: 'carer' })),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates MAR entry for regular medication', async () => {
      prisma.medication.findFirst.mockResolvedValue(makeMed({ status: 'active' }));
      prisma.marEntry.findFirst.mockResolvedValue(null); // no duplicate

      const createdEntry = { id: 'mar-new', outcome: 'given' };
      prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));
      prisma.marEntry.create.mockResolvedValue(createdEntry);

      const result = await service.recordAdministration('home-1', 'resident-1', {
        medication_id: 'med-1',
        scheduled_time: '2024-06-01T08:00:00Z',
        outcome: 'given' as any,
      }, makeUser({ role: 'carer' }));

      expect(prisma.marEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            outcome: 'given',
            administeredBy: 'user-1',
          }),
        }),
      );
      expect(result).toEqual(createdEntry);
    });
  });

  // ─── CD Register ──────────────────────────────────────────────────────────

  describe('getCdRegister', () => {
    it('throws BadRequestException for non-CD medication', async () => {
      prisma.medication.findFirst.mockResolvedValue(
        makeMed({ isControlledDrug: false }),
      );

      await expect(
        service.getCdRegister('home-1', 'med-1', makeUser()),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns entries and current balance for CD medication', async () => {
      prisma.medication.findFirst.mockResolvedValue(
        makeMed({ isControlledDrug: true, stockOnHand: 28 }),
      );
      prisma.controlledDrugRegister.findMany.mockResolvedValue([
        { id: 'reg-1', action: 'stock_received', quantityIn: 28, runningBalance: 28 },
      ]);

      const result = await service.getCdRegister('home-1', 'med-1', makeUser());

      expect(result.current_balance).toBe(28);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('addCdRegisterEntry', () => {
    it('throws BadRequestException if balance would go negative', async () => {
      prisma.medication.findFirst.mockResolvedValue(
        makeMed({ isControlledDrug: true, stockOnHand: 2 }),
      );
      prisma.controlledDrugRegister.findFirst.mockResolvedValue({
        runningBalance: 2,
      });

      await expect(
        service.addCdRegisterEntry('home-1', 'med-1', {
          action: 'wasted' as any,
          quantity_out: 5,
          witness_id: 'witness-1',
        }, makeUser()),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
