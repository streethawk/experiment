import { IsString, IsEnum, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DischargeTo {
  HOSPITAL = 'hospital',
  HOME = 'home',
  OTHER_CARE_HOME = 'other_care_home',
  DECEASED = 'deceased',
}

export class DischargeResidentDto {
  @ApiProperty() @IsDateString() discharge_date: string;
  @ApiProperty({ enum: DischargeTo }) @IsEnum(DischargeTo) discharge_to: DischargeTo;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
