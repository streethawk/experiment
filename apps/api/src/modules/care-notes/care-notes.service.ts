import {
  Injectable, NotFoundException, ForbiddenException,
  BadRequestException, Inject,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PRISMA_SERVICE } from '../../database/database.module';
import { CreateCareNoteDto } from './dto/create-care-note.dto';
import { UpdateCareNoteDto } from './dto/update-care-note.dto';
import type { RequestUser } from '../auth/strategies/jwt.strategy';

export interface CareNoteFilters {
  shift?: string;
  category?: string;
  flagged?: boolean;
  date_from?: string;
  date_to?: string;
  search?: string;
  limit?: number;
  cursor?: string; // ISO datetime cursor (createdAt DESC pagination)
}

@Injectable()
export class CareNotesService {
  constructor(@Inject(PRISMA_SERVICE) private readonly prisma: PrismaClient) {}

  // ─── List ──────────────────────────────────────────────────────────────────

  async findAll(
    homeId: string,
    residentId: string,
    filters: CareNoteFilters,
    user: RequestUser,
  ) {
    this.assertAccess(homeId, user);
    await this.assertResidentBelongs(homeId, residentId);

    const limit = Math.min(filters.limit ?? 20, 100);

    const where: any = {
      residentId,
      homeId,
      deletedAt: null,
    };

    if (filters.shift) where.shift = filters.shift;
    if (filters.category) where.categories = { has: filters.category };
    if (filters.flagged !== undefined) where.isFlagged = filters.flagged;
    if (filters.date_from || filters.date_to) {
      where.createdAt = {};
      if (filters.date_from) where.createdAt.gte = new Date(filters.date_from);
      if (filters.date_to)   where.createdAt.lte = new Date(filters.date_to);
    }
    if (filters.search) {
      where.note = { contains: filters.search, mode: 'insensitive' };
    }
    if (filters.cursor) {
      where.createdAt = { ...where.createdAt, lt: new Date(filters.cursor) };
    }

    const notes = await this.prisma.careNote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: { attachments: { select: { id: true, filename: true, s3Key: true, contentType: true } } },
    });

    const hasMore = notes.length > limit;
    const data = hasMore ? notes.slice(0, limit) : notes;
    const nextCursor = hasMore ? data[data.length - 1].createdAt.toISOString() : null;

    return { data, next_cursor: nextCursor, has_more: hasMore };
  }

  // ─── Create ────────────────────────────────────────────────────────────────

  async create(
    homeId: string,
    residentId: string,
    dto: CreateCareNoteDto,
    user: RequestUser,
  ) {
    this.assertAccess(homeId, user);
    await this.assertResidentBelongs(homeId, residentId);

    if (dto.is_flagged && !dto.flag_reason) {
      throw new BadRequestException('flag_reason is required when is_flagged is true');
    }

    return this.prisma.careNote.create({
      data: {
        residentId,
        homeId,
        shift: dto.shift as any,
        categories: dto.categories as any,
        note: dto.note,
        moodScore: dto.mood_score ?? null,
        foodIntakePct: dto.food_intake_pct ?? null,
        fluidIntakeMl: dto.fluid_intake_ml ?? null,
        isFlagged: dto.is_flagged ?? false,
        flagReason: dto.flag_reason ?? null,
        editHistory: [],
        createdBy: user.id,
      },
      include: { attachments: true },
    });
  }

  // ─── Get one ───────────────────────────────────────────────────────────────

  async findOne(homeId: string, residentId: string, noteId: string, user: RequestUser) {
    this.assertAccess(homeId, user);
    return this.findOrFail(homeId, residentId, noteId);
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  async update(
    homeId: string,
    residentId: string,
    noteId: string,
    dto: UpdateCareNoteDto,
    user: RequestUser,
  ) {
    this.assertAccess(homeId, user);
    const note = await this.findOrFail(homeId, residentId, noteId);

    // Only original author or manager can edit
    const isManager = ['home_manager', 'registered_manager', 'platform_admin'].includes(user.role);
    if (note.createdBy !== user.id && !isManager) {
      throw new ForbiddenException('Only the author or a manager can edit this note');
    }

    // Append to edit history before overwriting
    const history = Array.isArray(note.editHistory) ? note.editHistory as any[] : [];
    if (dto.note && dto.note !== note.note) {
      history.push({
        previous_note: note.note,
        edited_by: user.id,
        edited_at: new Date().toISOString(),
      });
    }

    if (dto.is_flagged && !dto.flag_reason && !note.flagReason) {
      throw new BadRequestException('flag_reason is required when flagging a note');
    }

    return this.prisma.careNote.update({
      where: { id: noteId },
      data: {
        note: dto.note ?? note.note,
        isFlagged: dto.is_flagged ?? note.isFlagged,
        flagReason: dto.flag_reason ?? note.flagReason,
        editHistory: history,
      },
    });
  }

  // ─── Soft delete ───────────────────────────────────────────────────────────

  async remove(
    homeId: string,
    residentId: string,
    noteId: string,
    user: RequestUser,
  ) {
    this.assertAccess(homeId, user);
    const note = await this.findOrFail(homeId, residentId, noteId);

    const isManager = ['home_manager', 'registered_manager', 'platform_admin'].includes(user.role);
    if (note.createdBy !== user.id && !isManager) {
      throw new ForbiddenException('Only the author or a manager can delete this note');
    }

    await this.prisma.careNote.update({
      where: { id: noteId },
      data: { deletedAt: new Date() },
    });
  }

  // ─── Shift summary for a date ──────────────────────────────────────────────
  // Returns latest mood/food/fluid reading per category for the given date

  async getShiftSummary(
    homeId: string,
    residentId: string,
    date: string,
    user: RequestUser,
  ) {
    this.assertAccess(homeId, user);
    await this.assertResidentBelongs(homeId, residentId);

    const day = new Date(date);
    const start = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0, 0, 0));
    const end   = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 23, 59, 59));

    const notes = await this.prisma.careNote.findMany({
      where: { residentId, homeId, deletedAt: null, createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, shift: true, categories: true, note: true,
        moodScore: true, foodIntakePct: true, fluidIntakeMl: true,
        isFlagged: true, flagReason: true, createdBy: true, createdAt: true,
      },
    });

    const byShift: Record<string, typeof notes> = { early: [], late: [], night: [] };
    for (const n of notes) byShift[n.shift]?.push(n);

    // Aggregate totals
    const totalFluidMl = notes.reduce((s, n) => s + (n.fluidIntakeMl ?? 0), 0);
    const latestMood = [...notes].reverse().find((n) => n.moodScore !== null)?.moodScore ?? null;
    const flaggedCount = notes.filter((n) => n.isFlagged).length;

    return {
      date,
      total_notes: notes.length,
      flagged_count: flaggedCount,
      latest_mood_score: latestMood,
      total_fluid_ml: totalFluidMl,
      by_shift: byShift,
    };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private assertAccess(homeId: string, user: RequestUser): void {
    if (['platform_admin', 'group_admin'].includes(user.role)) return;
    if (user.homeIds.includes(homeId)) return;
    throw new ForbiddenException('Access denied to this home');
  }

  private async assertResidentBelongs(homeId: string, residentId: string) {
    const r = await this.prisma.resident.findFirst({
      where: { id: residentId, homeId, deletedAt: null },
      select: { id: true },
    });
    if (!r) throw new NotFoundException(`Resident ${residentId} not found in this home`);
  }

  private async findOrFail(homeId: string, residentId: string, noteId: string) {
    const note = await this.prisma.careNote.findFirst({
      where: { id: noteId, residentId, homeId, deletedAt: null },
      include: { attachments: true },
    });
    if (!note) throw new NotFoundException(`Care note ${noteId} not found`);
    return note;
  }
}
