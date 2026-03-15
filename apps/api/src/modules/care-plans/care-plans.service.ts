import {
  Injectable, NotFoundException, ForbiddenException,
  BadRequestException, Inject,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { PRISMA_SERVICE } from '../../database/database.module';
import { CreateCarePlanDto } from './dto/create-care-plan.dto';
import { UpdateCarePlanDto } from './dto/update-care-plan.dto';
import type { RequestUser } from '../auth/strategies/jwt.strategy';

@Injectable()
export class CarePlansService {
  constructor(@Inject(PRISMA_SERVICE) private readonly prisma: PrismaClient) {}

  // ─── List ─────────────────────────────────────────────────────────────────

  async findAll(homeId: string, residentId: string, user: RequestUser) {
    this.assertAccess(homeId, user);
    await this.assertResidentBelongs(homeId, residentId);

    return this.prisma.carePlan.findMany({
      where: { residentId, homeId },
      select: {
        id: true, version: true, status: true,
        nextReviewDate: true, approvedAt: true, approvedBy: true,
        createdBy: true, createdAt: true, updatedAt: true,
      },
      orderBy: { version: 'desc' },
    });
  }

  // ─── Get one (with full sections) ─────────────────────────────────────────

  async findOne(homeId: string, residentId: string, planId: string, user: RequestUser) {
    this.assertAccess(homeId, user);
    return this.findOrFail(homeId, residentId, planId);
  }

  // ─── Create draft ─────────────────────────────────────────────────────────

  async create(
    homeId: string,
    residentId: string,
    dto: CreateCarePlanDto,
    user: RequestUser,
  ) {
    this.assertAccess(homeId, user);
    await this.assertResidentBelongs(homeId, residentId);

    // Get next version number
    const latest = await this.prisma.carePlan.findFirst({
      where: { residentId, homeId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    return this.prisma.carePlan.create({
      data: {
        residentId,
        homeId,
        version: (latest?.version ?? 0) + 1,
        status: 'draft',
        sections: (dto.sections as any) ?? {},
        nextReviewDate: dto.next_review_date ? new Date(dto.next_review_date) : null,
        createdBy: user.id,
      },
    });
  }

  // ─── Update sections (deep merge) ─────────────────────────────────────────

  async update(
    homeId: string,
    residentId: string,
    planId: string,
    dto: UpdateCarePlanDto,
    user: RequestUser,
  ) {
    this.assertAccess(homeId, user);
    const plan = await this.findOrFail(homeId, residentId, planId);

    if (plan.status === 'superseded' || plan.status === 'archived') {
      throw new BadRequestException('Cannot edit a superseded or archived care plan');
    }

    // Deep merge sections — existing keys not in patch are preserved
    const mergedSections = {
      ...(plan.sections as object),
      ...(dto.sections ?? {}),
    };

    return this.prisma.carePlan.update({
      where: { id: planId },
      data: {
        sections: mergedSections as Prisma.InputJsonValue,
        ...(dto.next_review_date && {
          nextReviewDate: new Date(dto.next_review_date),
        }),
      },
    });
  }

  // ─── Approve ──────────────────────────────────────────────────────────────

  async approve(
    homeId: string,
    residentId: string,
    planId: string,
    user: RequestUser,
  ) {
    this.assertAccess(homeId, user);

    if (!['home_manager', 'registered_manager'].includes(user.role)) {
      throw new ForbiddenException('Only managers can approve care plans');
    }

    const plan = await this.findOrFail(homeId, residentId, planId);

    if (plan.status !== 'draft') {
      throw new BadRequestException('Only draft care plans can be approved');
    }

    // Supersede any previously current plan in a transaction
    await this.prisma.$transaction([
      this.prisma.carePlan.updateMany({
        where: { residentId, homeId, status: 'current' },
        data: { status: 'superseded' },
      }),
      this.prisma.carePlan.update({
        where: { id: planId },
        data: {
          status: 'current',
          approvedBy: user.id,
          approvedAt: new Date(),
        },
      }),
    ]);

    return this.findOrFail(homeId, residentId, planId);
  }

  // ─── Archive ──────────────────────────────────────────────────────────────

  async archive(
    homeId: string,
    residentId: string,
    planId: string,
    user: RequestUser,
  ) {
    this.assertAccess(homeId, user);
    const plan = await this.findOrFail(homeId, residentId, planId);

    if (plan.status === 'archived') {
      throw new BadRequestException('Care plan is already archived');
    }

    return this.prisma.carePlan.update({
      where: { id: planId },
      data: { status: 'archived' },
    });
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

  private async findOrFail(homeId: string, residentId: string, planId: string) {
    const plan = await this.prisma.carePlan.findFirst({
      where: { id: planId, residentId, homeId },
    });
    if (!plan) throw new NotFoundException(`Care plan ${planId} not found`);
    return plan;
  }
}
