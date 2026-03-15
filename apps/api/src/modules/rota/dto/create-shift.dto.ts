import {
  IsUUID, IsDateString, IsEnum, IsString, IsOptional,
  IsBoolean, IsInt, Min, Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum ShiftType { early = 'early', late = 'late', night = 'night', split = 'split', custom = 'custom' }
enum StaffRole {
  carer = 'carer', senior_carer = 'senior_carer', nurse = 'nurse',
  activities_coordinator = 'activities_coordinator', home_manager = 'home_manager',
  registered_manager = 'registered_manager', chef = 'chef',
  maintenance = 'maintenance', finance_admin = 'finance_admin', administrator = 'administrator',
}

export class CreateShiftDto {
  @ApiProperty()
  @IsUUID()
  staff_id: string;

  @ApiProperty({ example: '2024-06-03' })
  @IsDateString()
  date: string;

  @ApiProperty({ enum: ShiftType })
  @IsEnum(ShiftType)
  shift_type: ShiftType;

  /** HH:MM */
  @ApiProperty({ example: '07:00' })
  @IsString()
  start_time: string;

  /** HH:MM */
  @ApiProperty({ example: '15:00' })
  @IsString()
  end_time: string;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional() @IsInt() @Min(0) @Max(120)
  break_minutes?: number;

  @ApiProperty({ enum: StaffRole })
  @IsEnum(StaffRole)
  role_on_shift: StaffRole;

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  is_agency?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  agency_name?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;
}
