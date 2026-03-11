import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StaffRole, StaffStatus, EmploymentType } from '@prisma/client';
import { Transform } from 'class-transformer';

export class ListStaffQuery {
  @ApiPropertyOptional({ enum: StaffRole })
  @IsOptional()
  @IsEnum(StaffRole)
  role?: StaffRole;

  @ApiPropertyOptional({ enum: StaffStatus, default: 'active' })
  @IsOptional()
  @IsEnum(StaffStatus)
  status?: StaffStatus;

  @ApiPropertyOptional({ enum: EmploymentType })
  @IsOptional()
  @IsEnum(EmploymentType)
  employment_type?: EmploymentType;

  @ApiPropertyOptional({ description: 'Full-text search on name or email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter to staff whose DBS expires within N days' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  dbs_expiring_days?: number;
}
