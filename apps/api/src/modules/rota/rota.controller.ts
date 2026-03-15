import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards, ParseUUIDPipe,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/types/user-role.enum';
import { RotaService } from './rota.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftStatusDto } from './dto/update-shift-status.dto';
import { ClockInDto } from './dto/clock-in.dto';
import { ClockOutDto } from './dto/clock-out.dto';
import type { RequestUser } from '../auth/strategies/jwt.strategy';

@ApiTags('Rota')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('homes/:homeId/rota')
export class RotaController {
  constructor(private readonly service: RotaService) {}

  // ─── Weekly rota ──────────────────────────────────────────────────────────

  @Get('week')
  @Roles(UserRole.CARER)
  @ApiOperation({ summary: 'Get weekly rota (grouped by day)' })
  @ApiQuery({ name: 'week_start', required: true, example: '2024-06-03' })
  getWeek(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Query('week_start') weekStart: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.getWeekRota(homeId, weekStart, user);
  }

  @Get('my-shifts')
  @Roles(UserRole.CARER)
  @ApiOperation({ summary: "Get current user's shifts for a week" })
  @ApiQuery({ name: 'week_start', required: true, example: '2024-06-03' })
  getMyShifts(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Query('week_start') weekStart: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.getMyShifts(homeId, weekStart, user);
  }

  @Get('today')
  @Roles(UserRole.CARER)
  @ApiOperation({ summary: "Today's shifts with clock-in/out status" })
  getToday(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.getTodayShifts(homeId, user);
  }

  @Get('attendance-report')
  @Roles(UserRole.HOME_MANAGER)
  @ApiOperation({ summary: 'Weekly attendance report with scheduled vs worked hours' })
  @ApiQuery({ name: 'week_start', required: true, example: '2024-06-03' })
  getAttendanceReport(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Query('week_start') weekStart: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.getAttendanceReport(homeId, weekStart, user);
  }

  // ─── Shift CRUD ───────────────────────────────────────────────────────────

  @Post('shifts')
  @Roles(UserRole.HOME_MANAGER)
  @ApiOperation({ summary: 'Create a shift' })
  createShift(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Body() dto: CreateShiftDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.createShift(homeId, dto, user);
  }

  @Patch('shifts/:shiftId/status')
  @Roles(UserRole.HOME_MANAGER)
  @ApiOperation({ summary: 'Update shift status (confirmed, absent, cancelled…)' })
  updateStatus(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('shiftId', ParseUUIDPipe) shiftId: string,
    @Body() dto: UpdateShiftStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.updateShiftStatus(homeId, shiftId, dto, user);
  }

  @Delete('shifts/:shiftId')
  @Roles(UserRole.HOME_MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a shift' })
  deleteShift(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('shiftId', ParseUUIDPipe) shiftId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.deleteShift(homeId, shiftId, user);
  }

  // ─── Clock in / out ───────────────────────────────────────────────────────

  @Post('shifts/:shiftId/clock-in')
  @Roles(UserRole.CARER)
  @ApiOperation({ summary: 'Clock in to a shift' })
  clockIn(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('shiftId', ParseUUIDPipe) shiftId: string,
    @Body() dto: ClockInDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.clockIn(homeId, shiftId, dto, user);
  }

  @Post('shifts/:shiftId/clock-out')
  @Roles(UserRole.CARER)
  @ApiOperation({ summary: 'Clock out of a shift' })
  clockOut(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('shiftId', ParseUUIDPipe) shiftId: string,
    @Body() dto: ClockOutDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.clockOut(homeId, shiftId, dto, user);
  }
}
