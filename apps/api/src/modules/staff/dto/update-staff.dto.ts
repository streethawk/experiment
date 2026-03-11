import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StaffStatus } from '@prisma/client';
import { CreateStaffDto } from './create-staff.dto';

export class UpdateStaffDto extends PartialType(CreateStaffDto) {
  @ApiPropertyOptional({ enum: StaffStatus })
  @IsOptional()
  @IsEnum(StaffStatus)
  status?: StaffStatus;

  @ApiPropertyOptional({ description: 'Employment end date (for leavers)' })
  @IsOptional()
  @IsDateString()
  end_date?: string;
}
