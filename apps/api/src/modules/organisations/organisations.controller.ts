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
import { OrganisationsService } from './organisations.service';
import { CreateOrganisationDto } from './dto/create-organisation.dto';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';
import type { RequestUser } from '../auth/strategies/jwt.strategy';

@ApiTags('Organisations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organisations')
export class OrganisationsController {
  constructor(private readonly service: OrganisationsService) {}

  @Get()
  @Roles(UserRole.GROUP_ADMIN)
  @ApiOperation({ summary: 'List organisations (platform_admin sees all; group_admin sees own)' })
  findAll(@CurrentUser() user: RequestUser) {
    return this.service.findAll(user);
  }

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Create a new organisation (platform_admin only)' })
  create(
    @Body() dto: CreateOrganisationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.create(dto);
  }

  @Get(':id')
  @Roles(UserRole.GROUP_ADMIN)
  @ApiOperation({ summary: 'Get organisation by ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.GROUP_ADMIN)
  @ApiOperation({ summary: 'Update organisation settings' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganisationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @Get(':id/homes')
  @Roles(UserRole.GROUP_ADMIN)
  @ApiOperation({ summary: 'List all homes belonging to an organisation' })
  findHomes(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findHomes(id, user);
  }
}
