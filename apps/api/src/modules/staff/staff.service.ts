import {
  Injectable, NotFoundException, ForbiddenException,
  ConflictException, Inject,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PRISMA_SERVICE } from '../../database/database.module';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { LogTrainingDto } from './dto/log-training.dto';
import { ListStaffQuery } from './dto/list-staff.query';
import type { RequestUser } from '../auth/strategies/jwt.strategy';

@Injectable()
export class StaffService {
  constructor(@Inject(PRISMA_SERVICE) private readonly prisma: PrismaClient) {}

  // ─── List ─────────────────────────────────────────────────────────────────

  async findAll(homeId: string, query: ListStaffQuery, user: RequestUser) {
    this.assertHomeAccess(homeId, user);

    const where: any = {
      homeId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : { status: 'active' }),
      ...(query.role && { role: query.role }),
      ...(query.employment_type && { employmentType: query.employment_type }),
    };

    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.dbs_expiring_days) {
      const cutoff = new Date(
        Date.now() + query.dbs_expiring_days * 24 * 60 * 60 * 1000,
      );
      where.dbsIssueDate = { not: null };
      where.dbsIssueDate = { lt: new Date(cutoff.getTime() - 365 * 3 * 24 * 60 * 60 * 1000) };
    }

    const staff = await this.prisma.staff.findMany({
      where,
      select: {
        id: true, fullName: true, email: true, phone: true,
        role: true, employmentType: true, status: true,
        contractedHoursPw: true, startDate: true, endDate: true,
        dbsType: true, dbsIssueDate: true, dbsOutcome: true,
        rightToWorkChecked: true, nmcPin: true, nmcExpiry: true,
        userId: true,
        _count: { select: { training: true, shifts: true } },
      },
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
    });

    return staff.map(this.format);
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(homeId: string, dto: CreateStaffDto, user: RequestUser) {
    this.assertHomeAccess(homeId, user);

    // Verify the home exists
    const home = await this.prisma.home.findFirst({
      where: { id: homeId, deletedAt: null },
      select: { organisationId: true },
    });
    if (!home) throw new NotFoundException(`Home ${homeId} not found`);

    // Check for duplicate email across the org
    const existing = await this.prisma.staff.findFirst({
      where: { email: dto.email, deletedAt: null },
    });
    if (existing) throw new ConflictException('A staff record with this email already exists');

    const staff = await this.prisma.staff.create({
      data: {
        homeId,
        organisationId: home.organisationId,
        fullName: dto.full_name,
        email: dto.email.toLowerCase().trim(),
        phone: dto.phone,
        role: dto.role,
        employmentType: dto.employment_type,
        contractedHoursPw: dto.contracted_hours_pw ?? null,
        startDate: new Date(dto.start_date),
        dbsType: dto.dbs_type,
        dbsCertificateNo: dto.dbs_certificate_no,
        dbsIssueDate: dto.dbs_issue_date ? new Date(dto.dbs_issue_date) : null,
        dbsOutcome: dto.dbs_outcome,
        rightToWorkChecked: dto.right_to_work_checked ?? false,
        nmcPin: dto.nmc_pin,
        nmcExpiry: dto.nmc_expiry ? new Date(dto.nmc_expiry) : null,
        userId: dto.user_id,
      },
    });

    return this.format(staff);
  }

  // ─── Find one ─────────────────────────────────────────────────────────────

  async findOne(homeId: string, staffId: string, user: RequestUser) {
    this.assertHomeAccess(homeId, user);
    return this.findOrFail(homeId, staffId);
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async update(
    homeId: string,
    staffId: string,
    dto: UpdateStaffDto,
    user: RequestUser,
  ) {
    this.assertHomeAccess(homeId, user);
    await this.findOrFail(homeId, staffId);

    const staff = await this.prisma.staff.update({
      where: { id: staffId },
      data: {
        ...(dto.full_name && { fullName: dto.full_name }),
        ...(dto.email && { email: dto.email.toLowerCase().trim() }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.role && { role: dto.role }),
        ...(dto.employment_type && { employmentType: dto.employment_type }),
        ...(dto.contracted_hours_pw !== undefined && { contractedHoursPw: dto.contracted_hours_pw }),
        ...(dto.status && { status: dto.status }),
        ...(dto.end_date && { endDate: new Date(dto.end_date) }),
        ...(dto.dbs_type !== undefined && { dbsType: dto.dbs_type }),
        ...(dto.dbs_certificate_no !== undefined && { dbsCertificateNo: dto.dbs_certificate_no }),
        ...(dto.dbs_issue_date && { dbsIssueDate: new Date(dto.dbs_issue_date) }),
        ...(dto.dbs_outcome !== undefined && { dbsOutcome: dto.dbs_outcome }),
        ...(dto.right_to_work_checked !== undefined && { rightToWorkChecked: dto.right_to_work_checked }),
        ...(dto.nmc_pin !== undefined && { nmcPin: dto.nmc_pin }),
        ...(dto.nmc_expiry && { nmcExpiry: new Date(dto.nmc_expiry) }),
        ...(dto.user_id !== undefined && { userId: dto.user_id }),
      },
    });

    return this.format(staff);
  }

  // ─── Soft delete (terminate) ──────────────────────────────────────────────

  async terminate(homeId: string, staffId: string, endDate: string, user: RequestUser) {
    this.assertHomeAccess(homeId, user);
    await this.findOrFail(homeId, staffId);

    const staff = await this.prisma.staff.update({
      where: { id: staffId },
      data: {
        status: 'terminated',
        endDate: new Date(endDate),
        deletedAt: new Date(),
      },
    });

    return this.format(staff);
  }

  // ─── Training records ─────────────────────────────────────────────────────

  async getTraining(homeId: string, staffId: string, user: RequestUser) {
    this.assertHomeAccess(homeId, user);
    await this.findOrFail(homeId, staffId);

    return this.prisma.staffTraining.findMany({
      where: { staffId },
      orderBy: [{ expiryDate: 'asc' }, { completedDate: 'desc' }],
    });
  }

  async logTraining(
    homeId: string,
    staffId: string,
    dto: LogTrainingDto,
    loggedBy: string,
    user: RequestUser,
  ) {
    this.assertHomeAccess(homeId, user);
    await this.findOrFail(homeId, staffId);

    return this.prisma.staffTraining.create({
      data: {
        staffId,
        homeId,
        courseName: dto.course_name,
        courseType: dto.course_type,
        provider: dto.provider,
        completedDate: new Date(dto.completed_date),
        expiryDate: dto.expiry_date ? new Date(dto.expiry_date) : null,
        certificateS3Key: dto.certificate_s3_key,
        loggedBy,
      },
    });
  }

  async getTrainingMatrix(homeId: string, user: RequestUser) {
    this.assertHomeAccess(homeId, user);

    const MANDATORY_COURSES = [
      'Moving and Handling',
      'Fire Safety',
      'Infection Control',
      'Safeguarding Adults',
      'Basic Life Support',
      'Medication Administration',
      'Dementia Awareness',
      'MCA and DoLS',
    ];

    const staff = await this.prisma.staff.findMany({
      where: { homeId, status: 'active', deletedAt: null },
      select: {
        id: true, fullName: true, role: true,
        training: {
          where: { courseType: 'mandatory' },
          select: {
            id: true, courseName: true, completedDate: true, expiryDate: true,
          },
          orderBy: { completedDate: 'desc' },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    // Build matrix: staff × mandatory courses
    return staff.map((s) => {
      const courseMap = new Map<string, { completed: Date; expires: Date | null }>();
      s.training.forEach((t) => {
        if (!courseMap.has(t.courseName)) {
          courseMap.set(t.courseName, {
            completed: t.completedDate,
            expires: t.expiryDate,
          });
        }
      });

      const courses = MANDATORY_COURSES.map((name) => {
        const record = courseMap.get(name);
        const isExpired = record?.expires ? record.expires < new Date() : false;
        const isExpiring = record?.expires
          ? record.expires < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          : false;

        return {
          name,
          status: !record ? 'missing' : isExpired ? 'expired' : isExpiring ? 'expiring' : 'current',
          completed_date: record?.completed ?? null,
          expiry_date: record?.expires ?? null,
        };
      });

      const compliant = courses.filter((c) => c.status === 'current').length;

      return {
        staff_id: s.id,
        full_name: s.fullName,
        role: s.role,
        compliance_score: Math.round((compliant / MANDATORY_COURSES.length) * 100),
        courses,
      };
    });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private assertHomeAccess(homeId: string, user: RequestUser): void {
    if (['platform_admin', 'group_admin'].includes(user.role)) return;
    if (user.homeIds.includes(homeId)) return;
    throw new ForbiddenException('Access denied to this home');
  }

  private async findOrFail(homeId: string, staffId: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, homeId, deletedAt: null },
    });
    if (!staff) throw new NotFoundException(`Staff member ${staffId} not found`);
    return this.format(staff);
  }

  private format(s: any) {
    return {
      id: s.id,
      home_id: s.homeId,
      organisation_id: s.organisationId,
      user_id: s.userId,
      full_name: s.fullName,
      email: s.email,
      phone: s.phone,
      role: s.role,
      employment_type: s.employmentType,
      contracted_hours_pw: s.contractedHoursPw ? Number(s.contractedHoursPw) : null,
      status: s.status,
      start_date: s.startDate,
      end_date: s.endDate,
      dbs_type: s.dbsType,
      dbs_certificate_no: s.dbsCertificateNo,
      dbs_issue_date: s.dbsIssueDate,
      dbs_outcome: s.dbsOutcome,
      right_to_work_checked: s.rightToWorkChecked,
      nmc_pin: s.nmcPin,
      nmc_expiry: s.nmcExpiry,
      _count: s._count,
      created_at: s.createdAt,
    };
  }
}
