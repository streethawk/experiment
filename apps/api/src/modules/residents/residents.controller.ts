import {
  Controller, Get, Post, Patch, Param, Body,
  Query, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/types/user-role.enum';
import { ResidentsService } from './residents.service';
import { CreateResidentDto } from './dto/create-resident.dto';
import { UpdateResidentDto } from './dto/update-resident.dto';
import { DischargeResidentDto } from './dto/discharge-resident.dto';
import { ListResidentsQuery } from './dto/list-residents.query';

@ApiTags('Residents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('homes/:homeId/residents')
export class ResidentsController {
  constructor(private readonly residentsService: ResidentsService) {}

  @Get()
  @Roles(UserRole.CARER, UserRole.SENIOR_CARER, UserRole.NURSE, UserRole.HOME_MANAGER)
  @ApiOperation({ summary: 'List residents for a home' })
  findAll(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Query() query: ListResidentsQuery,
  ) {
    return this.residentsService.findAll(homeId, query);
  }

  @Post()
  @Roles(UserRole.HOME_MANAGER, UserRole.REGISTERED_MANAGER)
  @ApiOperation({ summary: 'Admit a new resident' })
  create(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Body() createResidentDto: CreateResidentDto,
  ) {
    return this.residentsService.create(homeId, createResidentDto);
  }

  @Get(':residentId')
  @Roles(UserRole.CARER)
  @ApiOperation({ summary: 'Get full resident profile' })
  findOne(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
  ) {
    return this.residentsService.findOne(homeId, residentId);
  }

  @Patch(':residentId')
  @Roles(UserRole.SENIOR_CARER, UserRole.NURSE, UserRole.HOME_MANAGER)
  @ApiOperation({ summary: 'Update resident details' })
  update(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Body() updateResidentDto: UpdateResidentDto,
  ) {
    return this.residentsService.update(homeId, residentId, updateResidentDto);
  }

  @Post(':residentId/discharge')
  @Roles(UserRole.HOME_MANAGER, UserRole.REGISTERED_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Discharge a resident' })
  discharge(
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Body() dischargeDto: DischargeResidentDto,
  ) {
    return this.residentsService.discharge(homeId, residentId, dischargeDto);
  }
}
