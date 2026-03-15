import {
  Injectable, NotFoundException, ForbiddenException,
  BadRequestException, Inject,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PRISMA_SERVICE } from '../../database/database.module';
import { CreateWoundDto } from './dto/create-wound.dto';
import { CreateWoundAssessmentDto } from './dto/create-wound-assessment.dto';
import { UpdateWoundStatusDto } from './dto/update-wound-status.dto';
import type { RequestUser } from '../auth/strategies/jwt.strategy';

@Injectable()
export class WoundsService {
  constructor(@Inject(PRISMA_SERVICE) private readonly prisma: PrismaClient) {}

  // ─── List wounds ───────────────────────────────────────────────────────────

  async findAll(
    homeId: string,
    residentId: string,
    user: RequestUser,
    includeHealed = false,
  ) {
    this.assertAccess(homeId, user);
    await this.assertResidentBelongs(homeId, residentId);

    const statusFilter = includeHealed ? {} : { status: { not: 'healed' as any } };

    return this.prisma.wound.findMany({
      where: { residentId, ...statusFilter },
      include: {
        assessments: {
          orderBy: { assessedAt: 'desc' },
          take: 1, // latest assessment only in list view
          select: {
            id: true, assessedAt: true, pushScore: true,
            lengthMm: true, widthMm: true, dressingUsed: true,
            nextChangeDate: true, notes: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Create wound ──────────────────────────────────────────────────────────

  async create(
    homeId: string,
    residentId: string,
    dto: CreateWoundDto,
    user: RequestUser,
  ) {
    this.assertAccess(homeId, user);
    this.assertClinical(user);
    await this.assertResidentBelongs(homeId, residentId);

    return this.prisma.wound.create({
      data: {
        residentId,
        site: dto.site,
        onsetDate: dto.onset_date ? new Date(dto.onset_date) : null,
        woundType: dto.wound_type ?? null,
        status: 'open',
        createdBy: user.id,
      },
    });
  }

  // ─── Get wound with full assessment history ────────────────────────────────

  async findOne(
    homeId: string,
    residentId: string,
    woundId: string,
    user: RequestUser,
  ) {
    this.assertAccess(homeId, user);
    return this.findOrFail(homeId, residentId, woundId);
  }

  // ─── Update status ─────────────────────────────────────────────────────────

  async updateStatus(
    homeId: string,
    residentId: string,
    woundId: string,
    dto: UpdateWoundStatusDto,
    user: RequestUser,
  ) {
    this.assertAccess(homeId, user);
    this.assertClinical(user);
    const wound = await this.findOrFail(homeId, residentId, woundId);

    if (wound.status === 'healed' && dto.status !== 'healed') {
      throw new BadRequestException('Cannot re-open a healed wound; create a new wound record instead');
    }

    return this.prisma.wound.update({
      where: { id: woundId },
      data: {
        status: dto.status as any,
        healedDate: dto.status === 'healed'
          ? (dto.healed_date ? new Date(dto.healed_date) : new Date())
          : null,
      },
    });
  }

  // ─── Add assessment ────────────────────────────────────────────────────────

  async addAssessment(
    homeId: string,
    residentId: string,
    woundId: string,
    dto: CreateWoundAssessmentDto,
    user: RequestUser,
  ) {
    this.assertAccess(homeId, user);
    this.assertClinical(user);
    const wound = await this.findOrFail(homeId, residentId, woundId);

    if (wound.status === 'healed') {
      throw new BadRequestException('Cannot add assessment to a healed wound');
    }

    return this.prisma.woundAssessment.create({
      data: {
        woundId,
        assessedAt: new Date(dto.assessed_at),
        assessedBy: user.id,
        lengthMm: dto.length_mm ?? null,
        widthMm: dto.width_mm ?? null,
        pushScore: dto.push_score ?? null,
        dressingUsed: dto.dressing_used ?? null,
        nextChangeDate: dto.next_change_date ? new Date(dto.next_change_date) : null,
        photoS3Key: dto.photo_s3_key ?? null,
        notes: dto.notes ?? null,
      },
    });
  }

  // ─── Wound overview: all open wounds across a home ────────────────────────

  async getHomeOverview(homeId: string, user: RequestUser) {
    this.assertAccess(homeId, user);

    const wounds = await this.prisma.wound.findMany({
      where: {
        residentId: { in: await this.activeResidentIds(homeId) },
        status: { not: 'healed' },
      },
      include: {
        resident: { select: { id: true, fullName: true, preferredName: true, roomId: true } },
        assessments: {
          orderBy: { assessedAt: 'desc' },
          take: 1,
          select: {
            assessedAt: true, pushScore: true, nextChangeDate: true,
            dressingUsed: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    return wounds.map((w) => ({
      id: w.id,
      site: w.site,
      wound_type: w.woundType,
      status: w.status,
      onset_date: w.onsetDate?.toISOString() ?? null,
      resident: {
        id: w.resident.id,
        full_name: w.resident.fullName,
        preferred_name: w.resident.preferredName,
      },
      latest_assessment: w.assessments[0] ?? null,
      dressing_due: w.assessments[0]?.nextChangeDate
        ? new Date(w.assessments[0].nextChangeDate) <= new Date()
        : false,
    }));
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private assertAccess(homeId: string, user: RequestUser): void {
    if (['platform_admin', 'group_admin'].includes(user.role)) return;
    if (user.homeIds.includes(homeId)) return;
    throw new ForbiddenException('Access denied to this home');
  }

  private assertClinical(user: RequestUser): void {
    const allowed = ['nurse', 'senior_carer', 'home_manager', 'registered_manager', 'platform_admin'];
    if (!allowed.includes(user.role)) {
      throw new ForbiddenException('Clinical staff role required to manage wounds');
    }
  }

  private async assertResidentBelongs(homeId: string, residentId: string) {
    const r = await this.prisma.resident.findFirst({
      where: { id: residentId, homeId, deletedAt: null },
      select: { id: true },
    });
    if (!r) throw new NotFoundException(`Resident ${residentId} not found in this home`);
  }

  private async findOrFail(homeId: string, residentId: string, woundId: string) {
    const wound = await this.prisma.wound.findFirst({
      where: { id: woundId, residentId },
      include: {
        assessments: { orderBy: { assessedAt: 'desc' } },
      },
    });
    if (!wound) throw new NotFoundException(`Wound ${woundId} not found`);
    // verify resident belongs to home
    await this.assertResidentBelongs(homeId, residentId);
    return wound;
  }

  private async activeResidentIds(homeId: string): Promise<string[]> {
    const residents = await this.prisma.resident.findMany({
      where: { homeId, status: { in: ['active', 'hospital', 'respite', 'leave'] }, deletedAt: null },
      select: { id: true },
    });
    return residents.map((r) => r.id);
  }
}
