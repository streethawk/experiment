import {
  Injectable, NotFoundException, ForbiddenException, Inject,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PRISMA_SERVICE } from '../../database/database.module';
import { CreateOrganisationDto } from './dto/create-organisation.dto';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';
import type { RequestUser } from '../auth/strategies/jwt.strategy';

@Injectable()
export class OrganisationsService {
  constructor(@Inject(PRISMA_SERVICE) private readonly prisma: PrismaClient) {}

  // ─── List ─────────────────────────────────────────────────────────────────

  async findAll(user: RequestUser) {
    // Platform admins see all; group admins see their own org
    const where =
      user.role === 'platform_admin'
        ? { deletedAt: null }
        : { id: user.organisationId!, deletedAt: null };

    const orgs = await this.prisma.organisation.findMany({
      where,
      include: {
        _count: { select: { homes: true, staff: true, residents: true } },
      },
      orderBy: { name: 'asc' },
    });

    return orgs.map((o) => this.format(o));
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(dto: CreateOrganisationDto) {
    const org = await this.prisma.organisation.create({
      data: {
        name: dto.name,
        type: dto.type,
        subscriptionTier: dto.subscription_tier ?? 'starter',
        billingEmail: dto.billing_email,
        icoRegistrationRef: dto.ico_registration_ref,
        subscriptionStart: dto.subscription_start
          ? new Date(dto.subscription_start)
          : null,
      },
      include: { _count: { select: { homes: true, staff: true, residents: true } } },
    });

    return this.format(org);
  }

  // ─── Find one ─────────────────────────────────────────────────────────────

  async findOne(id: string, user: RequestUser) {
    this.assertAccess(id, user);
    return this.findOrFail(id);
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateOrganisationDto, user: RequestUser) {
    this.assertAccess(id, user);
    await this.findOrFail(id);

    const org = await this.prisma.organisation.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.type && { type: dto.type }),
        ...(dto.subscription_tier && { subscriptionTier: dto.subscription_tier }),
        ...(dto.billing_email !== undefined && { billingEmail: dto.billing_email }),
        ...(dto.ico_registration_ref !== undefined && { icoRegistrationRef: dto.ico_registration_ref }),
        ...(dto.subscription_start && { subscriptionStart: new Date(dto.subscription_start) }),
        ...(dto.subscription_end && { subscriptionEnd: new Date(dto.subscription_end) }),
      },
      include: { _count: { select: { homes: true, staff: true, residents: true } } },
    });

    return this.format(org);
  }

  // ─── Get homes ────────────────────────────────────────────────────────────

  async findHomes(id: string, user: RequestUser) {
    this.assertAccess(id, user);
    await this.findOrFail(id);

    const homes = await this.prisma.home.findMany({
      where: { organisationId: id, deletedAt: null },
      select: {
        id: true, name: true, city: true, postcode: true,
        bedCapacity: true, lastCqcRating: true, careTypes: true,
        _count: { select: { residents: true, staff: true } },
      },
      orderBy: { name: 'asc' },
    });

    return homes;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private assertAccess(orgId: string, user: RequestUser): void {
    if (user.role === 'platform_admin') return;
    if (user.role === 'group_admin' && user.organisationId === orgId) return;
    throw new ForbiddenException('Access denied to this organisation');
  }

  private async findOrFail(id: string) {
    const org = await this.prisma.organisation.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { homes: true, staff: true, residents: true } } },
    });
    if (!org) throw new NotFoundException(`Organisation ${id} not found`);
    return this.format(org);
  }

  private format(org: any) {
    return {
      id: org.id,
      name: org.name,
      type: org.type,
      subscription_tier: org.subscriptionTier,
      subscription_start: org.subscriptionStart,
      subscription_end: org.subscriptionEnd,
      billing_email: org.billingEmail,
      ico_registration_ref: org.icoRegistrationRef,
      created_at: org.createdAt,
      _count: org._count,
    };
  }
}
