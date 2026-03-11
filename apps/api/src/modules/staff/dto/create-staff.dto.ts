import {
  IsString, IsEnum, IsEmail, IsOptional, IsUUID, IsBoolean,
  IsDateString, IsDecimal, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StaffRole, EmploymentType } from '@prisma/client';

export class CreateStaffDto {
  @ApiProperty({ example: 'Sarah Jones' })
  @IsString()
  @MaxLength(255)
  full_name: string;

  @ApiProperty({ example: 'sarah.jones@oakwood.co.uk' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '+44 7911 123456' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({ enum: StaffRole })
  @IsEnum(StaffRole)
  role: StaffRole;

  @ApiProperty({ enum: EmploymentType })
  @IsEnum(EmploymentType)
  employment_type: EmploymentType;

  @ApiPropertyOptional({ description: 'Contracted weekly hours', example: '37.5' })
  @IsOptional()
  contracted_hours_pw?: number;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  start_date: string;

  // DBS
  @ApiPropertyOptional({ example: 'Enhanced' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  dbs_type?: string;

  @ApiPropertyOptional({ example: '001234567890' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  dbs_certificate_no?: string;

  @ApiPropertyOptional({ example: '2022-03-01' })
  @IsOptional()
  @IsDateString()
  dbs_issue_date?: string;

  @ApiPropertyOptional({ example: 'clear' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  dbs_outcome?: string;

  // Right to work
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  right_to_work_checked?: boolean;

  // NMC (nurses)
  @ApiPropertyOptional({ example: '12A3456B' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  nmc_pin?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  nmc_expiry?: string;

  // Link to user account (optional — staff can exist without a login)
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  user_id?: string;
}
