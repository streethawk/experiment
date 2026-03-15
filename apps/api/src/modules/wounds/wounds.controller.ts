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
import { WoundsService } from './wounds.service';
import { CreateWoundDto } from './dto/create-wound.dto';
import { CreateWoundAssessmentDto } from './dto/create-wound-assessment.dto';
import { UpdateWoundStatusDto } from './dto/update-wound-status.dto';
import type { RequestUser } from '../auth/strategies/jwt.strategy';

// ─── Resident-scoped wounds ───────────────────────────────────────────────────

@ApiTags('Wounds')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('homes/:homeId/residents/:residentId/wounds')
export class WoundsController {
  constructor(private readonly service: WoundsService) {}

  @Get()
  @Roles(UserRole.CARER)
  @ApiOperation({ summary: 'List wounds for a resident' })
  @ApiQuery({ name: 'include_healed', required: false, type: Boolean })
  findAll(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Query('include_healed') includeHealed: string | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findAll(homeId, residentId, user, includeHealed === 'true');
  }

  @Post()
  @Roles(UserRole.SENIOR_CARER)
  @ApiOperation({ summary: 'Create a wound record' })
  create(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Body() dto: CreateWoundDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.create(homeId, residentId, dto, user);
  }

  @Get(':woundId')
  @Roles(UserRole.CARER)
  @ApiOperation({ summary: 'Get wound with full assessment history' })
  findOne(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Param('woundId', ParseUUIDPipe) woundId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findOne(homeId, residentId, woundId, user);
  }

  @Patch(':woundId/status')
  @Roles(UserRole.SENIOR_CARER)
  @ApiOperation({ summary: 'Update wound status (healing, healed, deteriorating)' })
  updateStatus(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Param('woundId', ParseUUIDPipe) woundId: string,
    @Body() dto: UpdateWoundStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.updateStatus(homeId, residentId, woundId, dto, user);
  }

  @Post(':woundId/assessments')
  @Roles(UserRole.SENIOR_CARER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a wound assessment (PUSH score, dimensions, dressing)' })
  addAssessment(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Param('woundId', ParseUUIDPipe) woundId: string,
    @Body() dto: CreateWoundAssessmentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.addAssessment(homeId, residentId, woundId, dto, user);
  }
}

// ─── Home-level wound overview ────────────────────────────────────────────────

import { Controller as NestController } from '@nestjs/common';

@ApiTags('Wounds')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@NestController('homes/:homeId/wounds')
export class WoundsOverviewController {
  constructor(private readonly service: WoundsService) {}

  @Get()
  @Roles(UserRole.SENIOR_CARER)
  @ApiOperation({ summary: 'Home-level overview of all open wounds with dressing-due alerts' })
  getOverview(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.getHomeOverview(homeId, user);
  }
}
