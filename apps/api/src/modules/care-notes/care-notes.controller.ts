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
import { CareNotesService } from './care-notes.service';
import { CreateCareNoteDto } from './dto/create-care-note.dto';
import { UpdateCareNoteDto } from './dto/update-care-note.dto';
import type { RequestUser } from '../auth/strategies/jwt.strategy';

@ApiTags('Care Notes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('homes/:homeId/residents/:residentId/notes')
export class CareNotesController {
  constructor(private readonly service: CareNotesService) {}

  @Get()
  @Roles(UserRole.CARER)
  @ApiOperation({ summary: 'List care notes for a resident (newest first)' })
  @ApiQuery({ name: 'shift',     required: false, enum: ['early', 'late', 'night'] })
  @ApiQuery({ name: 'category',  required: false })
  @ApiQuery({ name: 'flagged',   required: false, type: Boolean })
  @ApiQuery({ name: 'date_from', required: false, example: '2024-06-01' })
  @ApiQuery({ name: 'date_to',   required: false, example: '2024-06-30' })
  @ApiQuery({ name: 'search',    required: false })
  @ApiQuery({ name: 'limit',     required: false, type: Number })
  @ApiQuery({ name: 'cursor',    required: false })
  findAll(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Query('shift')     shift: string | undefined,
    @Query('category')  category: string | undefined,
    @Query('flagged')   flagged: string | undefined,
    @Query('date_from') dateFrom: string | undefined,
    @Query('date_to')   dateTo: string | undefined,
    @Query('search')    search: string | undefined,
    @Query('limit')     limit: string | undefined,
    @Query('cursor')    cursor: string | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findAll(homeId, residentId, {
      shift,
      category,
      flagged: flagged !== undefined ? flagged === 'true' : undefined,
      date_from: dateFrom,
      date_to: dateTo,
      search,
      limit: limit ? parseInt(limit, 10) : undefined,
      cursor,
    }, user);
  }

  @Post()
  @Roles(UserRole.CARER)
  @ApiOperation({ summary: 'Create a care note' })
  create(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Body() dto: CreateCareNoteDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.create(homeId, residentId, dto, user);
  }

  @Get('shift-summary')
  @Roles(UserRole.CARER)
  @ApiOperation({ summary: 'Shift summary with mood/fluid aggregates for a date' })
  @ApiQuery({ name: 'date', required: true, example: '2024-06-01' })
  getShiftSummary(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Query('date') date: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.getShiftSummary(homeId, residentId, date, user);
  }

  @Get(':noteId')
  @Roles(UserRole.CARER)
  @ApiOperation({ summary: 'Get a specific care note' })
  findOne(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findOne(homeId, residentId, noteId, user);
  }

  @Patch(':noteId')
  @Roles(UserRole.CARER)
  @ApiOperation({ summary: 'Update note text, flagging' })
  update(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @Body() dto: UpdateCareNoteDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(homeId, residentId, noteId, dto, user);
  }

  @Delete(':noteId')
  @Roles(UserRole.CARER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a care note' })
  remove(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.remove(homeId, residentId, noteId, user);
  }
}
