import {
  IsString, IsEnum, IsOptional, IsBoolean, IsInt,
  IsArray, IsDateString, IsNumber, Min, Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum MedicationRoute {
  oral = 'oral', sublingual = 'sublingual', topical = 'topical',
  transdermal = 'transdermal', subcutaneous = 'subcutaneous',
  intramuscular = 'intramuscular', intravenous = 'intravenous',
  inhaled = 'inhaled', rectal = 'rectal', ophthalmic = 'ophthalmic',
  otic = 'otic', nasal = 'nasal', nebulised = 'nebulised',
}

enum MedicationFrequency {
  once_daily = 'once_daily', twice_daily = 'twice_daily',
  three_times_daily = 'three_times_daily', four_times_daily = 'four_times_daily',
  every_4_hours = 'every_4_hours', every_6_hours = 'every_6_hours',
  every_8_hours = 'every_8_hours', every_12_hours = 'every_12_hours',
  weekly = 'weekly', fortnightly = 'fortnightly', monthly = 'monthly',
  when_required = 'when_required', stat = 'stat', other = 'other',
}

export class CreateMedicationDto {
  @ApiProperty({ example: 'Metformin' })
  @IsString()
  drug_name: string;

  @ApiPropertyOptional({ example: 'tablet' })
  @IsOptional() @IsString()
  form?: string;

  @ApiPropertyOptional({ example: '500mg' })
  @IsOptional() @IsString()
  strength?: string;

  @ApiProperty({ example: '500mg twice daily' })
  @IsString()
  dose: string;

  @ApiProperty({ enum: MedicationRoute })
  @IsEnum(MedicationRoute)
  route: MedicationRoute;

  @ApiProperty({ enum: MedicationFrequency })
  @IsEnum(MedicationFrequency)
  frequency: MedicationFrequency;

  /** Times as HH:MM strings, e.g. ["08:00", "20:00"] */
  @ApiPropertyOptional({ type: [String], example: ['08:00', '20:00'] })
  @IsOptional() @IsArray() @IsString({ each: true })
  times?: string[];

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  indication?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  instructions?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  is_prn?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  prn_criteria?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  is_controlled_drug?: boolean;

  @ApiPropertyOptional({ example: 2, minimum: 1, maximum: 5 })
  @IsOptional() @IsInt() @Min(1) @Max(5)
  controlled_drug_schedule?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  prescribed_by?: string;

  @ApiPropertyOptional({ example: '2024-01-15' })
  @IsOptional() @IsDateString()
  prescribed_date?: string;

  @ApiPropertyOptional({ example: '2024-07-15' })
  @IsOptional() @IsDateString()
  review_date?: string;

  @ApiPropertyOptional({ example: 28 })
  @IsOptional() @IsNumber()
  stock_on_hand?: number;
}
