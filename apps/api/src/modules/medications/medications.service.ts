import {
  Injectable, NotFoundException, ForbiddenException,
  BadRequestException, Inject,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PRISMA_SERVICE } from '../../database/database.module';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { DiscontinueMedicationDto } from './dto/discontinue-medication.dto';
import { RecordAdministrationDto } from './dto/record-administration.dto';
import { AddCdRegisterEntryDto } from './dto/add-cd-register-entry.dto';
import type { RequestUser } from '../auth/strategies/jwt.strategy';

@Injectable()
export class MedicationsService {
  constructor(@Inject(PRISMA_SERVICE) private readonly prisma: PrismaClient) {}

  // ─── List ──────────────────────────────────────────────────────────────────

  async findAll(
    homeId: string,
    residentId: string,
    user: RequestUser,
    status?: string,
  ) {
    this.assertAccess(homeId, user);
    await this.assertResidentBelongs(homeId, residentId);

    return this.prisma.medication.findMany({
      where: {
        residentId,
        homeId,
        ...(status ? { status: status as any } : {}),
      },
      orderBy: [{ status: 'asc' }, { drugName: 'asc' }],
    });
  }

  // ─── Prescribe ─────────────────────────────────────────────────────────────

  async create(
    homeId: string,
    residentId: string,
    dto: CreateMedicationDto,
    user: RequestUser,
  ) {
    this.assertAccess(homeId, user);
    this.assertPrescriber(user);
    await this.assertResidentBelongs(homeId, residentId);

    return this.prisma.medication.create({
      data: {
        residentId,
        homeId,
        drugName: dto.drug_name,
        form: dto.form ?? null,
        strength: dto.strength ?? null,
        dose: dto.dose,
        route: dto.route as any,
        frequency: dto.frequency as any,
        // Store times as UTC datetimes on 1970-01-01 epoch date (time-only)
        times: dto.times?.map((t) => new Date(`1970-01-01T${t}:00Z`)) ?? [],
        indication: dto.indication ?? null,
        instructions: dto.instructions ?? null,
        isPrn: dto.is_prn ?? false,
        prnCriteria: dto.prn_criteria ?? null,
        isControlledDrug: dto.is_controlled_drug ?? false,
        controlledDrugSchedule: dto.controlled_drug_schedule ?? null,
        prescribedBy: dto.prescribed_by ?? null,
        prescribedDate: dto.prescribed_date ? new Date(dto.prescribed_date) : null,
        reviewDate: dto.review_date ? new Date(dto.review_date) : null,
        stockOnHand: dto.stock_on_hand ?? null,
        createdBy: user.id,
      },
    });
  }

  // ─── Get one ───────────────────────────────────────────────────────────────

  async findOne(
    homeId: string,
    residentId: string,
    medicationId: string,
    user: RequestUser,
  ) {
    this.assertAccess(homeId, user);
    return this.findOrFail(homeId, residentId, medicationId);
  }

  // ─── Discontinue ───────────────────────────────────────────────────────────

  async discontinue(
    homeId: string,
    residentId: string,
    medicationId: string,
    dto: DiscontinueMedicationDto,
    user: RequestUser,
  ) {
    this.assertAccess(homeId, user);
    this.assertPrescriber(user);
    const med = await this.findOrFail(homeId, residentId, medicationId);

    if (med.status === 'discontinued') {
      throw new BadRequestException('Medication is already discontinued');
    }

    return this.prisma.medication.update({
      where: { id: medicationId },
      data: {
        status: 'discontinued',
        discontinuedDate: new Date(dto.discontinued_date),
        discontinuedBy: user.id,
        discontinuedReason: dto.reason ?? null,
      },
    });
  }

  // ─── Hold / Unhold ─────────────────────────────────────────────────────────

  async setHold(
    homeId: string,
    residentId: string,
    medicationId: string,
    onHold: boolean,
    user: RequestUser,
  ) {
    this.assertAccess(homeId, user);
    this.assertPrescriber(user);
    const med = await this.findOrFail(homeId, residentId, medicationId);

    if (med.status === 'discontinued') {
      throw new BadRequestException('Cannot change hold status of a discontinued medication');
    }

    return this.prisma.medication.update({
      where: { id: medicationId },
      data: { status: onHold ? 'on_hold' : 'active' },
    });
  }

  // ─── MAR chart for a date ──────────────────────────────────────────────────

  async getMarChart(
    homeId: string,
    residentId: string,
    date: string,
    user: RequestUser,
  ) {
    this.assertAccess(homeId, user);
    await this.assertResidentBelongs(homeId, residentId);

    const day = new Date(date);
    const dayStart = new Date(Date.UTC(
      day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0, 0, 0,
    ));
    const dayEnd = new Date(Date.UTC(
      day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 23, 59, 59,
    ));

    const [medications, marEntries] = await Promise.all([
      this.prisma.medication.findMany({
        where: { residentId, homeId, status: { in: ['active', 'on_hold'] } },
        orderBy: [{ isPrn: 'asc' }, { drugName: 'asc' }],
      }),
      this.prisma.marEntry.findMany({
        where: {
          residentId,
          homeId,
          scheduledTime: { gte: dayStart, lte: dayEnd },
        },
      }),
    ]);

    // Index MAR entries for O(1) lookup
    const entryMap = new Map<string, typeof marEntries[number]>();
    for (const entry of marEntries) {
      const key = `${entry.medicationId}|${entry.scheduledTime.toISOString()}`;
      entryMap.set(key, entry);
    }

    const rows = medications.map((med) => {
      // Regular medication — build one slot per scheduled time
      const slots = med.isPrn
        ? []
        : (med.times as Date[]).map((t) => {
            const scheduled = new Date(Date.UTC(
              day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(),
              t.getUTCHours(), t.getUTCMinutes(), 0,
            ));
            const key = `${med.id}|${scheduled.toISOString()}`;
            const entry = entryMap.get(key);
            return {
              scheduled_time: scheduled.toISOString(),
              outcome: entry?.outcome ?? null,
              administered_at: entry?.administeredAt?.toISOString() ?? null,
              administered_by: entry?.administeredBy ?? null,
              witness_id: entry?.witnessId ?? null,
              notes: entry?.notes ?? null,
              mar_entry_id: entry?.id ?? null,
            };
          });

      // PRN — list all entries recorded for the day
      const prnEntries = med.isPrn
        ? marEntries
            .filter((e) => e.medicationId === med.id)
            .map((e) => ({
              scheduled_time: e.scheduledTime.toISOString(),
              outcome: e.outcome,
              administered_at: e.administeredAt?.toISOString() ?? null,
              administered_by: e.administeredBy,
              prn_indication: e.prnIndication,
              notes: e.notes,
              mar_entry_id: e.id,
            }))
        : [];

      return {
        medication: {
          id: med.id,
          drug_name: med.drugName,
          form: med.form,
          strength: med.strength,
          dose: med.dose,
          route: med.route,
          frequency: med.frequency,
          is_prn: med.isPrn,
          is_controlled_drug: med.isControlledDrug,
          status: med.status,
          instructions: med.instructions,
          prn_criteria: med.prnCriteria,
          stock_on_hand: med.stockOnHand ? Number(med.stockOnHand) : null,
        },
        slots,
        prn_entries: prnEntries,
      };
    });

    return { date, rows };
  }

  // ─── Record administration ─────────────────────────────────────────────────

  async recordAdministration(
    homeId: string,
    residentId: string,
    dto: RecordAdministrationDto,
    user: RequestUser,
  ) {
    this.assertAccess(homeId, user);
    const med = await this.findOrFail(homeId, residentId, dto.medication_id);

    if (med.status === 'discontinued') {
      throw new BadRequestException('Cannot administer a discontinued medication');
    }

    // CDs require a witness
    if (med.isControlledDrug && !dto.witness_id) {
      throw new BadRequestException(
        'A witness ID is required when administering a controlled drug',
      );
    }

    const scheduledTime = new Date(dto.scheduled_time);

    // Prevent duplicate regular-slot entries
    if (!dto.is_prn) {
      const existing = await this.prisma.marEntry.findFirst({
        where: { medicationId: dto.medication_id, residentId, scheduledTime },
      });
      if (existing) {
        throw new BadRequestException(
          'An administration record already exists for this time slot',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const mar = await tx.marEntry.create({
        data: {
          medicationId: dto.medication_id,
          residentId,
          homeId,
          scheduledTime,
          administeredAt: dto.administered_at ? new Date(dto.administered_at) : new Date(),
          outcome: dto.outcome as any,
          administeredBy: user.id,
          witnessId: dto.witness_id ?? null,
          notes: dto.notes ?? null,
          isPrn: dto.is_prn ?? false,
          prnIndication: dto.prn_indication ?? null,
        },
      });

      // Auto-update CD register when given
      if (med.isControlledDrug && dto.outcome === 'given') {
        const lastEntry = await tx.controlledDrugRegister.findFirst({
          where: { medicationId: dto.medication_id, homeId },
          orderBy: { createdAt: 'desc' },
          select: { runningBalance: true },
        });

        const balance = Number(lastEntry?.runningBalance ?? med.stockOnHand ?? 0);
        const newBalance = balance - 1; // 1 dose unit

        if (newBalance < 0) {
          throw new BadRequestException(
            'Controlled drug stock balance would go negative — please check the register',
          );
        }

        await tx.controlledDrugRegister.create({
          data: {
            homeId,
            medicationId: dto.medication_id,
            residentId,
            action: 'administered',
            quantityIn: null,
            quantityOut: 1,
            runningBalance: newBalance,
            actionBy: user.id,
            witnessId: dto.witness_id!,
            notes: dto.notes ?? null,
            marEntryId: mar.id,
          },
        });

        await tx.medication.update({
          where: { id: dto.medication_id },
          data: { stockOnHand: newBalance },
        });
      }

      return mar;
    });
  }

  // ─── CD Register — per medication ──────────────────────────────────────────

  async getCdRegister(
    homeId: string,
    medicationId: string,
    user: RequestUser,
  ) {
    this.assertAccess(homeId, user);

    const med = await this.prisma.medication.findFirst({
      where: { id: medicationId, homeId },
      select: { id: true, drugName: true, isControlledDrug: true, stockOnHand: true },
    });
    if (!med) throw new NotFoundException('Medication not found');
    if (!med.isControlledDrug) {
      throw new BadRequestException('This medication is not a controlled drug');
    }

    const entries = await this.prisma.controlledDrugRegister.findMany({
      where: { medicationId, homeId },
      orderBy: { createdAt: 'asc' },
    });

    return {
      medication_id: med.id,
      drug_name: med.drugName,
      current_balance: med.stockOnHand ? Number(med.stockOnHand) : 0,
      entries,
    };
  }

  async addCdRegisterEntry(
    homeId: string,
    medicationId: string,
    dto: AddCdRegisterEntryDto,
    user: RequestUser,
  ) {
    this.assertAccess(homeId, user);

    const med = await this.prisma.medication.findFirst({
      where: { id: medicationId, homeId },
    });
    if (!med) throw new NotFoundException('Medication not found');
    if (!med.isControlledDrug) {
      throw new BadRequestException('This medication is not a controlled drug');
    }

    const lastEntry = await this.prisma.controlledDrugRegister.findFirst({
      where: { medicationId, homeId },
      orderBy: { createdAt: 'desc' },
      select: { runningBalance: true },
    });

    const balance = Number(lastEntry?.runningBalance ?? med.stockOnHand ?? 0);
    const qIn = dto.quantity_in ?? 0;
    const qOut = dto.quantity_out ?? 0;
    const newBalance = balance + qIn - qOut;

    if (newBalance < 0) {
      throw new BadRequestException(
        `CD balance cannot go negative (current balance: ${balance})`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const reg = await tx.controlledDrugRegister.create({
        data: {
          homeId,
          medicationId,
          residentId: dto.resident_id ?? null,
          action: dto.action as any,
          quantityIn: qIn || null,
          quantityOut: qOut || null,
          runningBalance: newBalance,
          actionBy: user.id,
          witnessId: dto.witness_id,
          notes: dto.notes ?? null,
          marEntryId: null,
        },
      });

      await tx.medication.update({
        where: { id: medicationId },
        data: { stockOnHand: newBalance },
      });

      return reg;
    });
  }

  // ─── Home-level CD balance summary ────────────────────────────────────────

  async getCdSummary(homeId: string, user: RequestUser) {
    this.assertAccess(homeId, user);

    const meds = await this.prisma.medication.findMany({
      where: {
        homeId,
        isControlledDrug: true,
        status: { in: ['active', 'on_hold'] },
      },
      include: {
        resident: {
          select: { id: true, fullName: true, preferredName: true },
        },
      },
      orderBy: [{ resident: { fullName: 'asc' } }, { drugName: 'asc' }],
    });

    return meds.map((m) => ({
      medication_id: m.id,
      drug_name: m.drugName,
      strength: m.strength,
      dose: m.dose,
      form: m.form,
      route: m.route,
      cd_schedule: m.controlledDrugSchedule,
      status: m.status,
      stock_on_hand: m.stockOnHand ? Number(m.stockOnHand) : 0,
      resident: {
        id: m.resident.id,
        full_name: m.resident.fullName,
        preferred_name: m.resident.preferredName,
      },
    }));
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private assertAccess(homeId: string, user: RequestUser): void {
    if (['platform_admin', 'group_admin'].includes(user.role)) return;
    if (user.homeIds.includes(homeId)) return;
    throw new ForbiddenException('Access denied to this home');
  }

  private assertPrescriber(user: RequestUser): void {
    const allowed = ['nurse', 'home_manager', 'registered_manager', 'platform_admin'];
    if (!allowed.includes(user.role)) {
      throw new ForbiddenException(
        'Only nurses or managers can prescribe or discontinue medications',
      );
    }
  }

  private async assertResidentBelongs(homeId: string, residentId: string) {
    const r = await this.prisma.resident.findFirst({
      where: { id: residentId, homeId, deletedAt: null },
      select: { id: true },
    });
    if (!r) throw new NotFoundException(`Resident ${residentId} not found in this home`);
  }

  private async findOrFail(homeId: string, residentId: string, medicationId: string) {
    const med = await this.prisma.medication.findFirst({
      where: { id: medicationId, residentId, homeId },
    });
    if (!med) throw new NotFoundException(`Medication ${medicationId} not found`);
    return med;
  }
}
