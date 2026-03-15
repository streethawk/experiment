import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/types/user-role.enum';
import { MedicationsService } from './medications.service';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { DiscontinueMedicationDto } from './dto/discontinue-medication.dto';
import { RecordAdministrationDto } from './dto/record-administration.dto';
import { AddCdRegisterEntryDto } from './dto/add-cd-register-entry.dto';
import type { RequestUser } from '../auth/strategies/jwt.strategy';

// ─── Medications (resident-scoped) ────────────────────────────────────────────

@ApiTags('Medications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('homes/:homeId/residents/:residentId/medications')
export class MedicationsController {
  constructor(private readonly service: MedicationsService) {}

  @Get()
  @Roles(UserRole.CARER)
  @ApiOperation({ summary: 'List medications for a resident' })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'on_hold', 'discontinued', 'completed'] })
  findAll(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Query('status') status: string | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findAll(homeId, residentId, user, status);
  }

  @Post()
  @Roles(UserRole.NURSE)
  @ApiOperation({ summary: 'Prescribe a new medication' })
  create(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Body() dto: CreateMedicationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.create(homeId, residentId, dto, user);
  }

  @Get(':medicationId')
  @Roles(UserRole.CARER)
  @ApiOperation({ summary: 'Get a specific medication' })
  findOne(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Param('medicationId', ParseUUIDPipe) medicationId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findOne(homeId, residentId, medicationId, user);
  }

  @Patch(':medicationId/discontinue')
  @Roles(UserRole.NURSE)
  @ApiOperation({ summary: 'Discontinue a medication' })
  discontinue(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Param('medicationId', ParseUUIDPipe) medicationId: string,
    @Body() dto: DiscontinueMedicationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.discontinue(homeId, residentId, medicationId, dto, user);
  }

  @Patch(':medicationId/hold')
  @Roles(UserRole.NURSE)
  @ApiOperation({ summary: 'Place medication on hold' })
  hold(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Param('medicationId', ParseUUIDPipe) medicationId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.setHold(homeId, residentId, medicationId, true, user);
  }

  @Patch(':medicationId/unhold')
  @Roles(UserRole.NURSE)
  @ApiOperation({ summary: 'Remove medication from hold' })
  unhold(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Param('medicationId', ParseUUIDPipe) medicationId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.setHold(homeId, residentId, medicationId, false, user);
  }
}

// ─── MAR Chart (resident-scoped) ──────────────────────────────────────────────

import { Controller as NestController } from '@nestjs/common';

@ApiTags('MAR Chart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@NestController('homes/:homeId/residents/:residentId/mar')
export class MarController {
  constructor(private readonly service: MedicationsService) {}

  @Get()
  @Roles(UserRole.CARER)
  @ApiOperation({ summary: 'Get MAR chart for a resident on a given date' })
  @ApiQuery({ name: 'date', required: true, example: '2024-06-01' })
  getMarChart(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Query('date') date: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.getMarChart(homeId, residentId, date, user);
  }

  @Post()
  @Roles(UserRole.CARER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a medication administration' })
  recordAdministration(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Body() dto: RecordAdministrationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.recordAdministration(homeId, residentId, dto, user);
  }
}

// ─── CD Register (home-scoped) ────────────────────────────────────────────────

@ApiTags('Controlled Drugs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@NestController('homes/:homeId/cd-register')
export class CdRegisterController {
  constructor(private readonly service: MedicationsService) {}

  @Get()
  @Roles(UserRole.SENIOR_CARER)
  @ApiOperation({ summary: 'Home-level controlled drug balance summary' })
  getSummary(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.getCdSummary(homeId, user);
  }

  @Get(':medicationId')
  @Roles(UserRole.SENIOR_CARER)
  @ApiOperation({ summary: 'CD register entries for a specific medication' })
  getRegister(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('medicationId', ParseUUIDPipe) medicationId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.getCdRegister(homeId, medicationId, user);
  }

  @Post(':medicationId/entries')
  @Roles(UserRole.SENIOR_CARER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a CD register entry (stock received, wasted, returned, etc.)' })
  addEntry(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('medicationId', ParseUUIDPipe) medicationId: string,
    @Body() dto: AddCdRegisterEntryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.addCdRegisterEntry(homeId, medicationId, dto, user);
  }
}
