import {
  Controller, Get, Post, Patch, Param, Body,
  UseGuards, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/types/user-role.enum';
import { CarePlansService } from './care-plans.service';
import { CreateCarePlanDto } from './dto/create-care-plan.dto';
import { UpdateCarePlanDto } from './dto/update-care-plan.dto';
import type { RequestUser } from '../auth/strategies/jwt.strategy';

@ApiTags('Care Plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('homes/:homeId/residents/:residentId/care-plans')
export class CarePlansController {
  constructor(private readonly service: CarePlansService) {}

  @Get()
  @Roles(UserRole.CARER)
  @ApiOperation({ summary: 'List care plan versions for a resident' })
  findAll(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findAll(homeId, residentId, user);
  }

  @Post()
  @Roles(UserRole.SENIOR_CARER, UserRole.NURSE, UserRole.HOME_MANAGER)
  @ApiOperation({ summary: 'Create a new draft care plan' })
  create(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Body() dto: CreateCarePlanDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.create(homeId, residentId, dto, user);
  }

  @Get(':planId')
  @Roles(UserRole.CARER)
  @ApiOperation({ summary: 'Get a care plan with full section content' })
  findOne(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Param('planId', ParseUUIDPipe) planId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findOne(homeId, residentId, planId, user);
  }

  @Patch(':planId')
  @Roles(UserRole.SENIOR_CARER, UserRole.NURSE, UserRole.HOME_MANAGER)
  @ApiOperation({ summary: 'Update care plan sections (deep-merge patch)' })
  update(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: UpdateCarePlanDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(homeId, residentId, planId, dto, user);
  }

  @Post(':planId/approve')
  @Roles(UserRole.HOME_MANAGER, UserRole.REGISTERED_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a draft care plan (makes it current, supersedes previous)' })
  approve(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Param('planId', ParseUUIDPipe) planId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.approve(homeId, residentId, planId, user);
  }

  @Post(':planId/archive')
  @Roles(UserRole.HOME_MANAGER, UserRole.REGISTERED_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a care plan' })
  archive(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Param('planId', ParseUUIDPipe) planId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.archive(homeId, residentId, planId, user);
  }
}
