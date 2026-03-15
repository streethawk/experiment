import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { CareNotesService } from './care-notes.service';
import { PRISMA_SERVICE } from '../../database/database.module';

const makeUser = (overrides: object = {}): any => ({
  id: 'user-1', email: 'carer@test.com', role: 'carer',
  organisationId: 'org-1', homeIds: ['home-1'],
  ...overrides,
});

const makeNote = (overrides: object = {}): any => ({
  id: 'note-1', residentId: 'resident-1', homeId: 'home-1',
  shift: 'early', categories: ['personal_care'],
  note: 'Resident had breakfast and was in good spirits.',
  moodScore: 7, foodIntakePct: 80, fluidIntakeMl: 500,
  isFlagged: false, flagReason: null,
  editHistory: [], createdBy: 'user-1',
  createdAt: new Date('2024-06-01T08:30:00Z'),
  updatedAt: new Date('2024-06-01T08:30:00Z'),
  deletedAt: null, attachments: [],
  ...overrides,
});

describe('CareNotesService', () => {
  let service: CareNotesService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma = {
      careNote: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      resident: { findFirst: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CareNotesService,
        { provide: PRISMA_SERVICE, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(CareNotesService);
    prisma = mockPrisma;
  });

  // ─── Access control ───────────────────────────────────────────────────────

  describe('access control', () => {
    it('denies access for staff in different home', async () => {
      await expect(
        service.findAll('other-home', 'resident-1', {}, makeUser({ homeIds: ['home-1'] })),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows group_admin access to any home', async () => {
      prisma.resident.findFirst.mockResolvedValue({ id: 'resident-1' });
      prisma.careNote.findMany.mockResolvedValue([]);

      await expect(
        service.findAll('home-1', 'resident-1', {}, makeUser({ role: 'group_admin', homeIds: [] })),
      ).resolves.toBeDefined();
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated notes with has_more', async () => {
      prisma.resident.findFirst.mockResolvedValue({ id: 'resident-1' });
      // Return limit+1 items to trigger has_more
      prisma.careNote.findMany.mockResolvedValue([
        makeNote({ id: 'n1' }), makeNote({ id: 'n2' }),
        makeNote({ id: 'n3', createdAt: new Date('2024-06-01T06:00:00Z') }),
      ]);

      const result = await service.findAll('home-1', 'resident-1', { limit: 2 }, makeUser());

      expect(result.has_more).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.next_cursor).not.toBeNull();
    });

    it('returns all notes when fewer than limit', async () => {
      prisma.resident.findFirst.mockResolvedValue({ id: 'resident-1' });
      prisma.careNote.findMany.mockResolvedValue([makeNote()]);

      const result = await service.findAll('home-1', 'resident-1', { limit: 20 }, makeUser());

      expect(result.has_more).toBe(false);
      expect(result.next_cursor).toBeNull();
    });

    it('applies shift filter', async () => {
      prisma.resident.findFirst.mockResolvedValue({ id: 'resident-1' });
      prisma.careNote.findMany.mockResolvedValue([]);

      await service.findAll('home-1', 'resident-1', { shift: 'night' }, makeUser());

      expect(prisma.careNote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ shift: 'night' }),
        }),
      );
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('requires flag_reason when is_flagged is true', async () => {
      prisma.resident.findFirst.mockResolvedValue({ id: 'resident-1' });

      await expect(
        service.create('home-1', 'resident-1', {
          shift: 'early' as any, categories: ['general' as any],
          note: 'Test note', is_flagged: true,
          // no flag_reason
        }, makeUser()),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates note with all fields', async () => {
      prisma.resident.findFirst.mockResolvedValue({ id: 'resident-1' });
      prisma.careNote.create.mockResolvedValue(makeNote());

      await service.create('home-1', 'resident-1', {
        shift: 'early' as any,
        categories: ['personal_care' as any],
        note: 'Resident had breakfast.',
        mood_score: 7,
        fluid_intake_ml: 500,
      }, makeUser());

      expect(prisma.careNote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            shift: 'early',
            moodScore: 7,
            fluidIntakeMl: 500,
            createdBy: 'user-1',
            editHistory: [],
          }),
        }),
      );
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    it('throws ForbiddenException for non-author non-manager', async () => {
      prisma.careNote.findFirst.mockResolvedValue(makeNote({ createdBy: 'someone-else' }));

      await expect(
        service.update('home-1', 'resident-1', 'note-1', { note: 'New text' }, makeUser()),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows manager to edit any note', async () => {
      prisma.careNote.findFirst.mockResolvedValue(makeNote({ createdBy: 'someone-else' }));
      prisma.careNote.update.mockResolvedValue(makeNote({ note: 'Updated' }));

      await expect(
        service.update('home-1', 'resident-1', 'note-1', { note: 'Updated' },
          makeUser({ role: 'home_manager' })),
      ).resolves.toBeDefined();
    });

    it('appends to editHistory when note text changes', async () => {
      const original = makeNote({ editHistory: [] });
      prisma.careNote.findFirst.mockResolvedValue(original);
      prisma.careNote.update.mockResolvedValue({ ...original, note: 'Updated text' });

      await service.update('home-1', 'resident-1', 'note-1', { note: 'Updated text' }, makeUser());

      const callArgs = prisma.careNote.update.mock.calls[0][0];
      expect(callArgs.data.editHistory).toHaveLength(1);
      expect(callArgs.data.editHistory[0].previous_note).toBe(original.note);
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('soft-deletes by setting deletedAt', async () => {
      prisma.careNote.findFirst.mockResolvedValue(makeNote());
      prisma.careNote.update.mockResolvedValue({});

      await service.remove('home-1', 'resident-1', 'note-1', makeUser());

      expect(prisma.careNote.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });
  });

  // ─── getShiftSummary ──────────────────────────────────────────────────────

  describe('getShiftSummary', () => {
    it('aggregates fluid totals and latest mood across all notes', async () => {
      prisma.resident.findFirst.mockResolvedValue({ id: 'resident-1' });
      prisma.careNote.findMany.mockResolvedValue([
        makeNote({ shift: 'early', moodScore: 6, fluidIntakeMl: 300 }),
        makeNote({ shift: 'late',  moodScore: 8, fluidIntakeMl: 250, isFlagged: true }),
      ]);

      const result = await service.getShiftSummary('home-1', 'resident-1', '2024-06-01', makeUser());

      expect(result.total_fluid_ml).toBe(550);
      expect(result.latest_mood_score).toBe(8); // last note's mood (reversed)
      expect(result.flagged_count).toBe(1);
      expect(result.total_notes).toBe(2);
    });
  });
});
