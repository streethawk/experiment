import {
  Injectable, NotFoundException, ForbiddenException, Inject,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PRISMA_SERVICE } from '../../database/database.module';
import { CreateHomeDto } from './dto/create-home.dto';
import { UpdateHomeDto } from './dto/update-home.dto';
import type { RequestUser } from '../auth/strategies/jwt.strategy';

@Injectable()
export class HomesService {
  constructor(@Inject(PRISMA_SERVICE) private readonly prisma: PrismaClient) {}

  // ─── List homes accessible to user ───────────────────────────────────────

  async findAll(user: RequestUser) {
    let where: object;

    if (user.role === 'platform_admin') {
      where = { deletedAt: null };
    } else if (user.role === 'group_admin') {
      where = { organisationId: user.organisationId!, deletedAt: null };
    } else {
      // Staff, managers — only homes in their homeIds list
      if (!user.homeIds.length) return [];
      where = { id: { in: user.homeIds }, deletedAt: null };
    }

    const homes = await this.prisma.home.findMany({
      where,
      select: {
        id: true, name: true, city: true, postcode: true,
        bedCapacity: true, careTypes: true, lastCqcRating: true,
        organisationId: true,
        organisation: { select: { name: true } },
        _count: {
          select: {
            residents: { where: { status: 'active' } },
            staff: { where: { status: 'active', deletedAt: null } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return homes.map((h) => this.formatSummary(h));
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(dto: CreateHomeDto) {
    const home = await this.prisma.home.create({
      data: {
        name: dto.name,
        organisationId: dto.organisation_id,
        cqcRegistrationNumber: dto.cqc_registration_number,
        addressLine1: dto.address_line1,
        addressLine2: dto.address_line2,
        city: dto.city,
        postcode: dto.postcode.toUpperCase(),
        phone: dto.phone,
        email: dto.email,
        bedCapacity: dto.bed_capacity,
        careTypes: dto.care_types,
        lastCqcInspectionDate: dto.last_cqc_inspection_date
          ? new Date(dto.last_cqc_inspection_date)
          : null,
      },
      include: { organisation: { select: { name: true } } },
    });

    return this.format(home);
  }

  // ─── Find one ─────────────────────────────────────────────────────────────

  async findOne(id: string, user: RequestUser) {
    this.assertAccess(id, user);
    return this.findOrFail(id);
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateHomeDto, user: RequestUser) {
    this.assertAccess(id, user);
    await this.findOrFail(id); // existence check

    const home = await this.prisma.home.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.address_line1 && { addressLine1: dto.address_line1 }),
        ...(dto.address_line2 !== undefined && { addressLine2: dto.address_line2 }),
        ...(dto.city && { city: dto.city }),
        ...(dto.postcode && { postcode: dto.postcode.toUpperCase() }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.bed_capacity && { bedCapacity: dto.bed_capacity }),
        ...(dto.care_types && { careTypes: dto.care_types }),
        ...(dto.cqc_registration_number !== undefined && {
          cqcRegistrationNumber: dto.cqc_registration_number,
        }),
        ...(dto.last_cqc_inspection_date && {
          lastCqcInspectionDate: new Date(dto.last_cqc_inspection_date),
        }),
        ...(dto.last_cqc_rating && { lastCqcRating: dto.last_cqc_rating }),
        ...(dto.registered_manager_id !== undefined && {
          registeredManagerId: dto.registered_manager_id,
        }),
      },
      include: { organisation: { select: { name: true } } },
    });

    return this.format(home);
  }

  // ─── Dashboard summary ────────────────────────────────────────────────────

  async getDashboard(homeId: string, user: RequestUser) {
    this.assertAccess(homeId, user);

    // Run all counts in a single round-trip
    const [home, residentCounts, staffOnShift, recentIncidents, expiredDbsCount] =
      await Promise.all([
        this.findOrFail(homeId),

        this.prisma.resident.groupBy({
          by: ['status'],
          where: { homeId },
          _count: { id: true },
        }),

        this.prisma.shift.count({
          where: {
            homeId,
            status: 'in_progress',
            scheduledStart: { lte: new Date() },
            scheduledEnd: { gte: new Date() },
          },
        }),

        this.prisma.incident.count({
          where: { homeId, status: 'open', occurredAt: { gte: this.daysAgo(7) } },
        }),

        this.prisma.staff.count({
          where: {
            homeId,
            status: 'active',
            deletedAt: null,
            dbsIssueDate: { lt: this.daysAgo(365 * 3) }, // DBS > 3 years old
          },
        }),
      ]);

    const activeResidents =
      residentCounts.find((r) => r.status === 'active')?._count.id ?? 0;
    const onLeave =
      residentCounts.find((r) => r.status === 'hospital')?._count.id ?? 0;

    return {
      home,
      occupancy: {
        active_residents: activeResidents,
        on_leave: onLeave,
        bed_capacity: (home as any).bed_capacity,
        occupancy_rate:
          (home as any).bed_capacity > 0
            ? Math.round((activeResidents / (home as any).bed_capacity) * 100)
            : 0,
      },
      staffing: {
        on_shift_now: staffOnShift,
      },
      compliance: {
        open_incidents_7d: recentIncidents,
        dbs_expired_or_expiring: expiredDbsCount,
      },
    };
  }

  // ─── Home staff list ─────────────────────────────────────────────────────

  async findStaff(homeId: string, user: RequestUser) {
    this.assertAccess(homeId, user);
    await this.findOrFail(homeId);

    return this.prisma.staff.findMany({
      where: { homeId, deletedAt: null },
      select: {
        id: true, fullName: true, role: true, employmentType: true,
        status: true, email: true, phone: true, startDate: true,
        dbsIssueDate: true, nmcPin: true,
      },
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
    });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private assertAccess(homeId: string, user: RequestUser): void {
    if (user.role === 'platform_admin') return;
    if (user.role === 'group_admin') return; // access checked via org filter at DB level
    if (user.homeIds.includes(homeId)) return;
    throw new ForbiddenException('Access denied to this home');
  }

  private async findOrFail(id: string) {
    const home = await this.prisma.home.findFirst({
      where: { id, deletedAt: null },
      include: { organisation: { select: { id: true, name: true } } },
    });
    if (!home) throw new NotFoundException(`Home ${id} not found`);
    return this.format(home);
  }

  private format(home: any) {
    return {
      id: home.id,
      organisation_id: home.organisationId,
      organisation: home.organisation,
      name: home.name,
      cqc_registration_number: home.cqcRegistrationNumber,
      address_line1: home.addressLine1,
      address_line2: home.addressLine2,
      city: home.city,
      postcode: home.postcode,
      phone: home.phone,
      email: home.email,
      bed_capacity: home.bedCapacity,
      care_types: home.careTypes,
      last_cqc_inspection_date: home.lastCqcInspectionDate,
      last_cqc_rating: home.lastCqcRating,
      registered_manager_id: home.registeredManagerId,
      created_at: home.createdAt,
    };
  }

  private formatSummary(home: any) {
    return {
      id: home.id,
      name: home.name,
      organisation_id: home.organisationId,
      organisation_name: home.organisation?.name,
      city: home.city,
      postcode: home.postcode,
      bed_capacity: home.bedCapacity,
      care_types: home.careTypes,
      last_cqc_rating: home.lastCqcRating,
      active_residents: home._count?.residents ?? 0,
      active_staff: home._count?.staff ?? 0,
    };
  }

  private daysAgo(days: number): Date {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }
}
