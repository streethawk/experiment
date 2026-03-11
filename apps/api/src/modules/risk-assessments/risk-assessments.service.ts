import {
  Injectable, NotFoundException, ForbiddenException, Inject,
} from '@nestjs/common';
import { PrismaClient, RiskType } from '@prisma/client';
import { PRISMA_SERVICE } from '../../database/database.module';
import { CreateRiskAssessmentDto } from './dto/create-risk-assessment.dto';
import type { RequestUser } from '../auth/strategies/jwt.strategy';

// 3 months default review period
const DEFAULT_VALID_DAYS = 91;

@Injectable()
export class RiskAssessmentsService {
  constructor(@Inject(PRISMA_SERVICE) private readonly prisma: PrismaClient) {}

  // ─── List all assessments for a resident (most recent first) ─────────────

  async findAll(homeId: string, residentId: string, user: RequestUser, type?: RiskType) {
    this.assertAccess(homeId, user);
    await this.assertResidentBelongs(homeId, residentId);

    return this.prisma.riskAssessment.findMany({
      where: {
        residentId,
        homeId,
        ...(type && { type }),
      },
      orderBy: [{ type: 'asc' }, { assessedAt: 'desc' }],
    });
  }

  // ─── Latest assessment per type (dashboard / profile summary) ────────────

  async findLatestPerType(homeId: string, residentId: string, user: RequestUser) {
    this.assertAccess(homeId, user);
    await this.assertResidentBelongs(homeId, residentId);

    const all = await this.prisma.riskAssessment.findMany({
      where: { residentId, homeId },
      orderBy: [{ type: 'asc' }, { assessedAt: 'desc' }],
    });

    // Deduplicate — keep only latest per type
    const seenTypes = new Set<RiskType>();
    return all.filter((a) => {
      if (seenTypes.has(a.type)) return false;
      seenTypes.add(a.type);
      return true;
    });
  }

  // ─── Get one ──────────────────────────────────────────────────────────────

  async findOne(
    homeId: string,
    residentId: string,
    assessmentId: string,
    user: RequestUser,
  ) {
    this.assertAccess(homeId, user);
    return this.findOrFail(homeId, residentId, assessmentId);
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(
    homeId: string,
    residentId: string,
    dto: CreateRiskAssessmentDto,
    user: RequestUser,
  ) {
    this.assertAccess(homeId, user);
    await this.assertResidentBelongs(homeId, residentId);

    const validUntil = dto.valid_until
      ? new Date(dto.valid_until)
      : new Date(
          new Date(dto.assessed_at).getTime() + DEFAULT_VALID_DAYS * 24 * 60 * 60 * 1000,
        );

    return this.prisma.riskAssessment.create({
      data: {
        residentId,
        homeId,
        type: dto.type,
        riskLevel: dto.risk_level,
        score: dto.score ?? null,
        details: (dto.details as any) ?? {},
        assessedBy: user.id,
        assessedAt: new Date(dto.assessed_at),
        validUntil,
      },
    });
  }

  // ─── Overdue assessments (for compliance dashboard) ───────────────────────

  async findOverdue(homeId: string, user: RequestUser) {
    this.assertAccess(homeId, user);

    // Get all active residents in this home
    const residents = await this.prisma.resident.findMany({
      where: { homeId, status: 'active', deletedAt: null },
      select: { id: true, fullName: true },
    });

    const residentIds = residents.map((r) => r.id);

    // Get all non-expired assessments grouped by resident
    const assessments = await this.prisma.riskAssessment.findMany({
      where: {
        homeId,
        residentId: { in: residentIds },
        validUntil: { lt: new Date() }, // past valid_until date
      },
      select: { residentId: true, type: true, validUntil: true, assessedAt: true },
      orderBy: { validUntil: 'asc' },
    });

    // Group by resident
    const byResident = new Map<string, typeof assessments>();
    assessments.forEach((a) => {
      const existing = byResident.get(a.residentId) ?? [];
      existing.push(a);
      byResident.set(a.residentId, existing);
    });

    return residents
      .map((r) => ({
        resident_id: r.id,
        resident_name: r.fullName,
        overdue_assessments: byResident.get(r.id) ?? [],
      }))
      .filter((r) => r.overdue_assessments.length > 0);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

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

  private async findOrFail(homeId: string, residentId: string, assessmentId: string) {
    const a = await this.prisma.riskAssessment.findFirst({
      where: { id: assessmentId, residentId, homeId },
    });
    if (!a) throw new NotFoundException(`Risk assessment ${assessmentId} not found`);
    return a;
  }
}
