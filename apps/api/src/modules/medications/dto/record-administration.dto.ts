import {
  IsEnum, IsString, IsOptional, IsBoolean, IsUUID, IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum MarOutcome {
  given = 'given',
  refused = 'refused',
  not_available = 'not_available',
  away = 'away',
  unable = 'unable',
  not_required = 'not_required',
  self_administered = 'self_administered',
}

export class RecordAdministrationDto {
  @ApiProperty()
  @IsUUID()
  medication_id: string;

  /** ISO datetime of the scheduled slot (for regular meds) or administration time (for PRN) */
  @ApiProperty({ example: '2024-06-01T08:00:00Z' })
  @IsDateString()
  scheduled_time: string;

  @ApiPropertyOptional({ example: '2024-06-01T08:04:00Z' })
  @IsOptional() @IsDateString()
  administered_at?: string;

  @ApiProperty({ enum: MarOutcome })
  @IsEnum(MarOutcome)
  outcome: MarOutcome;

  /** Required for controlled drugs */
  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  witness_id?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  is_prn?: boolean;

  @ApiPropertyOptional({ example: 'Resident requested for pain at 4/10' })
  @IsOptional() @IsString()
  prn_indication?: string;
}
