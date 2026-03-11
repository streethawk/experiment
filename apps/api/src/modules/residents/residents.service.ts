import {
  Injectable, NotFoundException, ForbiddenException,
  BadRequestException, Inject,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PRISMA_SERVICE } from '../../database/database.module';
import { CreateResidentDto } from './dto/create-resident.dto';
import { UpdateResidentDto } from './dto/update-resident.dto';
import { DischargeResidentDto } from './dto/discharge-resident.dto';
import { ListResidentsQuery } from './dto/list-residents.query';
import type { RequestUser } from '../auth/strategies/jwt.strategy';

@Injectable()
export class ResidentsService {
  constructor(@Inject(PRISMA_SERVICE) private readonly prisma: PrismaClient) {}

  // ─── List (cursor-based pagination) ──────────────────────────────────────

  async findAll(homeId: string, query: ListResidentsQuery, user: RequestUser) {
    this.assertAccess(homeId, user);

    const limit = query.limit ?? 20;
    const status = query.status ?? 'active';

    const where: any = {
      homeId,
      deletedAt: null,
      status,
    };

    if (query.care_type) where.careType = query.care_type;
    if (query.wing_id) where.room = { wingId: query.wing_id };

    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { preferredName: { contains: query.search, mode: 'insensitive' } },
        { nhsNumber: { equals: query.search.replace(/\s/g, '') } },
        { room: { roomNumber: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    // Cursor pagination: cursor is the last resident's fullName+id composite
    if (query.cursor) {
      const [cursorName, cursorId] = Buffer.from(query.cursor, 'base64url')
        .toString('utf8')
        .split('|');

      where.OR = [
        { fullName: { gt: cursorName } },
        { fullName: { equals: cursorName }, id: { gt: cursorId } },
      ];
    }

    const residents = await this.prisma.resident.findMany({
      where,
      take: limit + 1, // fetch one extra to know if there's a next page
      select: {
        id: true, fullName: true, preferredName: true,
        dateOfBirth: true, gender: true, status: true, careType: true,
        admissionDate: true, nhsNumber: true,
        dnarInPlace: true, mcaLacksCapacity: true,
        room: {
          select: {
            roomNumber: true,
            wing: { select: { name: true } },
          },
        },
        allergies: {
          where: { isActive: true, severity: { in: ['severe', 'life_threatening'] } },
          select: { substance: true, severity: true },
        },
        keyworkerId: true,
      },
      orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
    });

    const hasNext = residents.length > limit;
    const items = hasNext ? residents.slice(0, limit) : residents;

    let nextCursor: string | null = null;
    if (hasNext) {
      const last = items[items.length - 1];
      nextCursor = Buffer.from(`${last.fullName}|${last.id}`).toString('base64url');
    }

    return {
      data: items.map(this.formatSummary),
      next_cursor: nextCursor,
      has_more: hasNext,
    };
  }

  // ─── Create (admit) ───────────────────────────────────────────────────────

  async create(homeId: string, dto: CreateResidentDto, user: RequestUser) {
    this.assertAccess(homeId, user);

    // Get org ID from home
    const home = await this.prisma.home.findFirst({
      where: { id: homeId, deletedAt: null },
      select: { organisationId: true },
    });
    if (!home) throw new NotFoundException(`Home ${homeId} not found`);

    // Validate room belongs to home (if provided)
    if (dto.room_id) {
      const room = await this.prisma.room.findFirst({
        where: { id: dto.room_id, homeId },
      });
      if (!room) throw new BadRequestException('Room does not belong to this home');

      const occupant = await this.prisma.resident.findFirst({
        where: { roomId: dto.room_id, status: { in: ['active', 'hospital', 'leave'] } },
      });
      if (occupant)
        throw new BadRequestException('Room is already occupied by an active resident');
    }

    const resident = await this.prisma.$transaction(async (tx) => {
      const r = await tx.resident.create({
        data: {
          homeId,
          organisationId: home.organisationId,
          fullName: dto.full_name,
          preferredName: dto.preferred_name,
          dateOfBirth: new Date(dto.date_of_birth),
          nhsNumber: dto.nhs_number?.replace(/\s/g, '') ?? null,
          roomId: dto.room_id ?? null,
          careType: dto.care_type as any,
          admissionDate: new Date(dto.admission_date),
          admissionSource: dto.admission_source as any,
          primaryFundingSource: dto.primary_funding_source as any,
          gpName: dto.gp_name,
          gpPractice: dto.gp_practice,
          gpPhone: dto.gp_phone,
          dnarInPlace: dto.dnar_in_place ?? false,
        },
      });

      // Bulk-create NOK contacts if provided
      if (dto.nok?.length) {
        await tx.residentContact.createMany({
          data: dto.nok.map((nok) => ({
            residentId: r.id,
            name: nok.name,
            relationship: nok.relationship,
            phonePrimary: nok.phone_primary,
            email: nok.email,
            isPrimaryNok: nok.is_primary_nok,
            hasLpaWelfare: nok.has_lpa_welfare,
            hasLpaFinance: nok.has_lpa_finance,
          })),
        });
      }

      return r;
    });

    return this.findOrFail(homeId, resident.id);
  }

  // ─── Full profile ─────────────────────────────────────────────────────────

  async findOne(homeId: string, residentId: string, user: RequestUser) {
    this.assertAccess(homeId, user);
    return this.findOrFail(homeId, residentId);
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async update(
    homeId: string,
    residentId: string,
    dto: UpdateResidentDto,
    user: RequestUser,
  ) {
    this.assertAccess(homeId, user);
    await this.checkExists(homeId, residentId);

    // Room change — validate availability
    if (dto.room_id !== undefined) {
      if (dto.room_id) {
        const room = await this.prisma.room.findFirst({
          where: { id: dto.room_id, homeId },
        });
        if (!room) throw new BadRequestException('Room does not belong to this home');

        const occupant = await this.prisma.resident.findFirst({
          where: {
            roomId: dto.room_id,
            status: { in: ['active', 'hospital', 'leave'] },
            id: { not: residentId },
          },
        });
        if (occupant)
          throw new BadRequestException('Room is already occupied by another resident');
      }
    }

    await this.prisma.resident.update({
      where: { id: residentId },
      data: {
        ...(dto.full_name && { fullName: dto.full_name }),
        ...(dto.preferred_name !== undefined && { preferredName: dto.preferred_name }),
        ...(dto.nhs_number !== undefined && {
          nhsNumber: dto.nhs_number?.replace(/\s/g, '') ?? null,
        }),
        ...(dto.room_id !== undefined && { roomId: dto.room_id ?? null }),
        ...(dto.care_type && { careType: dto.care_type as any }),
        ...(dto.gp_name !== undefined && { gpName: dto.gp_name }),
        ...(dto.gp_practice !== undefined && { gpPractice: dto.gp_practice }),
        ...(dto.gp_phone !== undefined && { gpPhone: dto.gp_phone }),
        ...(dto.dnar_in_place !== undefined && { dnarInPlace: dto.dnar_in_place }),
        ...(dto.primary_funding_source && {
          primaryFundingSource: dto.primary_funding_source as any,
        }),
      },
    });

    return this.findOrFail(homeId, residentId);
  }

  // ─── Discharge ────────────────────────────────────────────────────────────

  async discharge(
    homeId: string,
    residentId: string,
    dto: DischargeResidentDto,
    user: RequestUser,
  ) {
    this.assertAccess(homeId, user);
    const resident = await this.checkExists(homeId, residentId);

    if (['discharged', 'deceased'].includes(resident.status)) {
      throw new BadRequestException('Resident has already been discharged');
    }

    const newStatus = dto.discharge_to === 'deceased' ? 'deceased' : 'discharged';

    await this.prisma.resident.update({
      where: { id: residentId },
      data: {
        status: newStatus as any,
        dischargeDate: new Date(dto.discharge_date),
        dischargeTo: dto.discharge_to,
        dischargeReason: dto.reason ?? null,
        roomId: null, // free the room
      },
    });

    return { id: residentId, status: newStatus, discharge_date: dto.discharge_date };
  }

  // ─── Contacts sub-resource ────────────────────────────────────────────────

  async listContacts(homeId: string, residentId: string, user: RequestUser) {
    this.assertAccess(homeId, user);
    await this.checkExists(homeId, residentId);

    return this.prisma.residentContact.findMany({
      where: { residentId },
      orderBy: [{ isPrimaryNok: 'desc' }, { name: 'asc' }],
    });
  }

  async createContact(
    homeId: string,
    residentId: string,
    data: {
      name: string;
      relationship: string;
      phone_primary?: string;
      phone_secondary?: string;
      email?: string;
      address?: string;
      is_primary_nok: boolean;
      has_lpa_welfare: boolean;
      has_lpa_finance: boolean;
      notes?: string;
    },
    user: RequestUser,
  ) {
    this.assertAccess(homeId, user);
    await this.checkExists(homeId, residentId);

    return this.prisma.residentContact.create({
      data: {
        residentId,
        name: data.name,
        relationship: data.relationship,
        phonePrimary: data.phone_primary,
        phoneSecondary: data.phone_secondary,
        email: data.email,
        address: data.address,
        isPrimaryNok: data.is_primary_nok,
        hasLpaWelfare: data.has_lpa_welfare,
        hasLpaFinance: data.has_lpa_finance,
        notes: data.notes,
      },
    });
  }

  async updateContact(
    homeId: string,
    residentId: string,
    contactId: string,
    data: Partial<{
      name: string; relationship: string; phone_primary: string;
      phone_secondary: string; email: string; is_primary_nok: boolean;
      has_lpa_welfare: boolean; has_lpa_finance: boolean; notes: string;
    }>,
    user: RequestUser,
  ) {
    this.assertAccess(homeId, user);
    await this.checkExists(homeId, residentId);

    const contact = await this.prisma.residentContact.findFirst({
      where: { id: contactId, residentId },
    });
    if (!contact) throw new NotFoundException(`Contact ${contactId} not found`);

    return this.prisma.residentContact.update({
      where: { id: contactId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.relationship && { relationship: data.relationship }),
        ...(data.phone_primary !== undefined && { phonePrimary: data.phone_primary }),
        ...(data.phone_secondary !== undefined && { phoneSecondary: data.phone_secondary }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.is_primary_nok !== undefined && { isPrimaryNok: data.is_primary_nok }),
        ...(data.has_lpa_welfare !== undefined && { hasLpaWelfare: data.has_lpa_welfare }),
        ...(data.has_lpa_finance !== undefined && { hasLpaFinance: data.has_lpa_finance }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });
  }

  // ─── Allergies sub-resource ───────────────────────────────────────────────

  async listAllergies(homeId: string, residentId: string, user: RequestUser) {
    this.assertAccess(homeId, user);
    await this.checkExists(homeId, residentId);

    return this.prisma.allergy.findMany({
      where: { residentId, isActive: true },
      orderBy: [{ severity: 'desc' }, { substance: 'asc' }],
    });
  }

  async createAllergy(
    homeId: string,
    residentId: string,
    data: {
      substance: string;
      reaction: string;
      severity: string;
      notes?: string;
    },
    recordedBy: string,
    user: RequestUser,
  ) {
    this.assertAccess(homeId, user);
    await this.checkExists(homeId, residentId);

    return this.prisma.allergy.create({
      data: {
        residentId,
        substance: data.substance,
        reaction: data.reaction,
        severity: data.severity as any,
        notes: data.notes,
        recordedBy,
      },
    });
  }

  async deactivateAllergy(
    homeId: string,
    residentId: string,
    allergyId: string,
    user: RequestUser,
  ) {
    this.assertAccess(homeId, user);
    const allergy = await this.prisma.allergy.findFirst({
      where: { id: allergyId, residentId },
    });
    if (!allergy) throw new NotFoundException(`Allergy ${allergyId} not found`);

    return this.prisma.allergy.update({
      where: { id: allergyId },
      data: { isActive: false },
    });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private assertAccess(homeId: string, user: RequestUser): void {
    if (['platform_admin', 'group_admin'].includes(user.role)) return;
    if (user.homeIds.includes(homeId)) return;
    throw new ForbiddenException('Access denied to this home');
  }

  private async checkExists(homeId: string, residentId: string) {
    const r = await this.prisma.resident.findFirst({
      where: { id: residentId, homeId, deletedAt: null },
      select: { id: true, status: true },
    });
    if (!r) throw new NotFoundException(`Resident ${residentId} not found`);
    return r;
  }

  private async findOrFail(homeId: string, residentId: string) {
    const resident = await this.prisma.resident.findFirst({
      where: { id: residentId, homeId, deletedAt: null },
      include: {
        room: { include: { wing: { select: { id: true, name: true } } } },
        contacts: {
          orderBy: [{ isPrimaryNok: 'desc' }, { name: 'asc' }],
        },
        allergies: {
          where: { isActive: true },
          orderBy: [{ severity: 'desc' }],
        },
        carePlans: {
          where: { status: 'current' },
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, version: true, status: true,
            nextReviewDate: true, approvedAt: true,
          },
        },
        riskAssessments: {
          // Latest per type — use a subquery workaround via orderBy + distinct
          orderBy: [{ type: 'asc' }, { assessedAt: 'desc' }],
          select: {
            id: true, type: true, riskLevel: true, score: true,
            assessedAt: true, validUntil: true,
          },
        },
        _count: {
          select: {
            medications: { where: { status: 'active' } },
            incidents: { where: { status: { in: ['open', 'under_review'] } } },
          },
        },
      },
    });

    if (!resident) throw new NotFoundException(`Resident ${residentId} not found`);

    // Deduplicate risk assessments — keep latest per type
    const seenTypes = new Set<string>();
    const latestRisks = resident.riskAssessments.filter((r) => {
      if (seenTypes.has(r.type)) return false;
      seenTypes.add(r.type);
      return true;
    });

    return {
      id: resident.id,
      home_id: resident.homeId,
      organisation_id: resident.organisationId,
      full_name: resident.fullName,
      preferred_name: resident.preferredName,
      date_of_birth: resident.dateOfBirth,
      gender: resident.gender,
      ethnicity: resident.ethnicity,
      religion: resident.religion,
      first_language: resident.firstLanguage,
      interpreter_required: resident.interpreterRequired,
      nhs_number: resident.nhsNumber,
      gp_name: resident.gpName,
      gp_practice: resident.gpPractice,
      gp_phone: resident.gpPhone,
      status: resident.status,
      care_type: resident.careType,
      admission_date: resident.admissionDate,
      admission_source: resident.admissionSource,
      discharge_date: resident.dischargeDate,
      primary_funding_source: resident.primaryFundingSource,
      dnar_in_place: resident.dnarInPlace,
      mca_lacks_capacity: resident.mcaLacksCapacity,
      keyworker_id: resident.keyworkerId,
      room: resident.room
        ? {
            id: resident.room.id,
            room_number: resident.room.roomNumber,
            room_type: resident.room.roomType,
            wing: resident.room.wing,
          }
        : null,
      contacts: resident.contacts,
      allergies: resident.allergies,
      current_care_plan: resident.carePlans[0] ?? null,
      latest_risk_assessments: latestRisks,
      active_medications_count: resident._count.medications,
      open_incidents_count: resident._count.incidents,
    };
  }

  private formatSummary(r: any) {
    return {
      id: r.id,
      full_name: r.fullName,
      preferred_name: r.preferredName,
      date_of_birth: r.dateOfBirth,
      gender: r.gender,
      status: r.status,
      care_type: r.careType,
      admission_date: r.admissionDate,
      nhs_number: r.nhsNumber,
      dnar_in_place: r.dnarInPlace,
      mca_lacks_capacity: r.mcaLacksCapacity,
      room: r.room
        ? {
            room_number: r.room.roomNumber,
            wing_name: r.room.wing?.name ?? null,
          }
        : null,
      critical_allergies: r.allergies ?? [],
    };
  }
}
