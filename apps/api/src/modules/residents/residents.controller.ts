import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/types/user-role.enum';
import { ResidentsService } from './residents.service';
import { CreateResidentDto } from './dto/create-resident.dto';
import { UpdateResidentDto } from './dto/update-resident.dto';
import { DischargeResidentDto } from './dto/discharge-resident.dto';
import { ListResidentsQuery } from './dto/list-residents.query';
import type { RequestUser } from '../auth/strategies/jwt.strategy';

@ApiTags('Residents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('homes/:homeId/residents')
export class ResidentsController {
  constructor(private readonly residentsService: ResidentsService) {}

  @Get()
  @Roles(UserRole.CARER)
  @ApiOperation({ summary: 'List residents for a home (cursor-paginated)' })
  findAll(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Query() query: ListResidentsQuery,
    @CurrentUser() user: RequestUser,
  ) {
    return this.residentsService.findAll(homeId, query, user);
  }

  @Post()
  @Roles(UserRole.HOME_MANAGER, UserRole.REGISTERED_MANAGER)
  @ApiOperation({ summary: 'Admit a new resident' })
  create(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Body() dto: CreateResidentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.residentsService.create(homeId, dto, user);
  }

  @Get(':residentId')
  @Roles(UserRole.CARER)
  @ApiOperation({ summary: 'Get full resident profile (contacts, allergies, care plan, risks)' })
  findOne(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.residentsService.findOne(homeId, residentId, user);
  }

  @Patch(':residentId')
  @Roles(UserRole.SENIOR_CARER, UserRole.NURSE, UserRole.HOME_MANAGER)
  @ApiOperation({ summary: 'Update resident details' })
  update(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Body() dto: UpdateResidentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.residentsService.update(homeId, residentId, dto, user);
  }

  @Post(':residentId/discharge')
  @Roles(UserRole.HOME_MANAGER, UserRole.REGISTERED_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Discharge a resident' })
  discharge(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Body() dto: DischargeResidentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.residentsService.discharge(homeId, residentId, dto, user);
  }

  // ─── Contacts ─────────────────────────────────────────────────────────────

  @Get(':residentId/contacts')
  @Roles(UserRole.CARER)
  @ApiOperation({ summary: 'List contacts/NOK for a resident' })
  listContacts(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.residentsService.listContacts(homeId, residentId, user);
  }

  @Post(':residentId/contacts')
  @Roles(UserRole.HOME_MANAGER)
  @ApiOperation({ summary: 'Add a contact for a resident' })
  createContact(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Body() body: any,
    @CurrentUser() user: RequestUser,
  ) {
    return this.residentsService.createContact(homeId, residentId, body, user);
  }

  @Patch(':residentId/contacts/:contactId')
  @Roles(UserRole.HOME_MANAGER)
  @ApiOperation({ summary: 'Update a resident contact' })
  updateContact(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body() body: any,
    @CurrentUser() user: RequestUser,
  ) {
    return this.residentsService.updateContact(homeId, residentId, contactId, body, user);
  }

  // ─── Allergies ────────────────────────────────────────────────────────────

  @Get(':residentId/allergies')
  @Roles(UserRole.CARER)
  @ApiOperation({ summary: 'List active allergies for a resident' })
  listAllergies(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.residentsService.listAllergies(homeId, residentId, user);
  }

  @Post(':residentId/allergies')
  @Roles(UserRole.SENIOR_CARER, UserRole.NURSE, UserRole.HOME_MANAGER)
  @ApiOperation({ summary: 'Record a new allergy for a resident' })
  createAllergy(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Body() body: { substance: string; reaction: string; severity: string; notes?: string },
    @CurrentUser() user: RequestUser,
  ) {
    return this.residentsService.createAllergy(homeId, residentId, body, user.id, user);
  }

  @Patch(':residentId/allergies/:allergyId/deactivate')
  @Roles(UserRole.SENIOR_CARER, UserRole.NURSE, UserRole.HOME_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate (resolve) an allergy record' })
  deactivateAllergy(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Param('allergyId', ParseUUIDPipe) allergyId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.residentsService.deactivateAllergy(homeId, residentId, allergyId, user);
  }
}
