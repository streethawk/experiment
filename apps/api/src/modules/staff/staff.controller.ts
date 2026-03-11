import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query,
  UseGuards, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/types/user-role.enum';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { LogTrainingDto } from './dto/log-training.dto';
import { ListStaffQuery } from './dto/list-staff.query';
import type { RequestUser } from '../auth/strategies/jwt.strategy';

@ApiTags('Staff')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('homes/:homeId/staff')
export class StaffController {
  constructor(private readonly service: StaffService) {}

  // ─── Staff CRUD ───────────────────────────────────────────────────────────

  @Get()
  @Roles(UserRole.HOME_MANAGER)
  @ApiOperation({ summary: 'List staff at a home with filters' })
  findAll(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Query() query: ListStaffQuery,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findAll(homeId, query, user);
  }

  @Post()
  @Roles(UserRole.HOME_MANAGER)
  @ApiOperation({ summary: 'Create a new staff record' })
  create(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Body() dto: CreateStaffDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.create(homeId, dto, user);
  }

  @Get(':staffId')
  @Roles(UserRole.HOME_MANAGER)
  @ApiOperation({ summary: 'Get staff member profile' })
  findOne(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findOne(homeId, staffId, user);
  }

  @Patch(':staffId')
  @Roles(UserRole.HOME_MANAGER)
  @ApiOperation({ summary: 'Update staff member details' })
  update(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @Body() dto: UpdateStaffDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(homeId, staffId, dto, user);
  }

  @Delete(':staffId')
  @Roles(UserRole.HOME_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Terminate a staff member (soft delete)' })
  terminate(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @Body() body: { end_date: string },
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.terminate(homeId, staffId, body.end_date, user);
  }

  // ─── Training ─────────────────────────────────────────────────────────────

  @Get(':staffId/training')
  @Roles(UserRole.HOME_MANAGER)
  @ApiOperation({ summary: 'Get training records for a staff member' })
  getTraining(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.getTraining(homeId, staffId, user);
  }

  @Post(':staffId/training')
  @Roles(UserRole.HOME_MANAGER)
  @ApiOperation({ summary: 'Log a training record for a staff member' })
  logTraining(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @Body() dto: LogTrainingDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.logTraining(homeId, staffId, dto, user.id, user);
  }

  // ─── Training matrix ──────────────────────────────────────────────────────

  @Get('training/matrix')
  @Roles(UserRole.HOME_MANAGER)
  @ApiOperation({
    summary: 'Training compliance matrix — all active staff vs mandatory courses',
  })
  trainingMatrix(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.getTrainingMatrix(homeId, user);
  }
}
