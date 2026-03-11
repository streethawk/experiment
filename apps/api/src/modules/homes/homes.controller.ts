import {
  Controller, Get, Post, Patch, Param, Body,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/types/user-role.enum';
import { HomesService } from './homes.service';
import { CreateHomeDto } from './dto/create-home.dto';
import { UpdateHomeDto } from './dto/update-home.dto';
import type { RequestUser } from '../auth/strategies/jwt.strategy';

@ApiTags('Homes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('homes')
export class HomesController {
  constructor(private readonly service: HomesService) {}

  @Get()
  @Roles(UserRole.CARER)
  @ApiOperation({ summary: 'List homes accessible to the current user' })
  findAll(@CurrentUser() user: RequestUser) {
    return this.service.findAll(user);
  }

  @Post()
  @Roles(UserRole.GROUP_ADMIN)
  @ApiOperation({ summary: 'Create a new home (group_admin+)' })
  create(
    @Body() dto: CreateHomeDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.create(dto);
  }

  @Get(':homeId')
  @Roles(UserRole.CARER)
  @ApiOperation({ summary: 'Get full home profile' })
  findOne(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findOne(homeId, user);
  }

  @Patch(':homeId')
  @Roles(UserRole.HOME_MANAGER)
  @ApiOperation({ summary: 'Update home settings (home_manager+)' })
  update(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Body() dto: UpdateHomeDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(homeId, dto, user);
  }

  @Get(':homeId/dashboard')
  @Roles(UserRole.HOME_MANAGER)
  @ApiOperation({ summary: 'Home dashboard — occupancy, staffing, compliance KPIs' })
  dashboard(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.getDashboard(homeId, user);
  }

  @Get(':homeId/staff')
  @Roles(UserRole.HOME_MANAGER)
  @ApiOperation({ summary: 'List staff at a home (home_manager+)' })
  getStaff(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findStaff(homeId, user);
  }
}
