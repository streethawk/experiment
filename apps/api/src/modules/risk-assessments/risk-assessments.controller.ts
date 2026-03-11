import {
  Controller, Get, Post, Param, Body, Query,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/types/user-role.enum';
import { RiskAssessmentsService } from './risk-assessments.service';
import { CreateRiskAssessmentDto } from './dto/create-risk-assessment.dto';
import { RiskType } from '@prisma/client';
import type { RequestUser } from '../auth/strategies/jwt.strategy';

@ApiTags('Risk Assessments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('homes/:homeId/residents/:residentId/risk-assessments')
export class RiskAssessmentsController {
  constructor(private readonly service: RiskAssessmentsService) {}

  @Get()
  @Roles(UserRole.CARER)
  @ApiOperation({ summary: 'List risk assessments for a resident (history by type)' })
  @ApiQuery({ name: 'type', enum: RiskType, required: false })
  findAll(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Query('type') type: RiskType | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findAll(homeId, residentId, user, type);
  }

  @Get('latest')
  @Roles(UserRole.CARER)
  @ApiOperation({ summary: 'Latest risk assessment per type (profile summary)' })
  findLatest(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findLatestPerType(homeId, residentId, user);
  }

  @Post()
  @Roles(UserRole.SENIOR_CARER, UserRole.NURSE, UserRole.HOME_MANAGER)
  @ApiOperation({ summary: 'Record a new risk assessment' })
  create(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Body() dto: CreateRiskAssessmentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.create(homeId, residentId, dto, user);
  }

  @Get(':assessmentId')
  @Roles(UserRole.CARER)
  @ApiOperation({ summary: 'Get a specific risk assessment' })
  findOne(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findOne(homeId, residentId, assessmentId, user);
  }
}

// ─── Overdue assessments — home-level view ────────────────────────────────────

import { Controller as NestController } from '@nestjs/common';

@ApiTags('Risk Assessments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@NestController('homes/:homeId/risk-assessments/overdue')
export class RiskAssessmentsOverdueController {
  constructor(private readonly service: RiskAssessmentsService) {}

  @Get()
  @Roles(UserRole.HOME_MANAGER)
  @ApiOperation({ summary: 'List residents with overdue risk assessments (compliance view)' })
  findOverdue(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findOverdue(homeId, user);
  }
}
