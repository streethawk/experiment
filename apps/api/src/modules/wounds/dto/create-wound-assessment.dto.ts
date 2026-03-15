import {
  IsDateString, IsInt, IsOptional, IsString, Min, Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWoundAssessmentDto {
  @ApiProperty({ example: '2024-06-01T09:00:00Z' })
  @IsDateString()
  assessed_at: string;

  @ApiPropertyOptional({ minimum: 0, example: 45 })
  @IsOptional() @IsInt() @Min(0)
  length_mm?: number;

  @ApiPropertyOptional({ minimum: 0, example: 30 })
  @IsOptional() @IsInt() @Min(0)
  width_mm?: number;

  /** PUSH tool score 0–17 */
  @ApiPropertyOptional({ minimum: 0, maximum: 17, example: 8 })
  @IsOptional() @IsInt() @Min(0) @Max(17)
  push_score?: number;

  @ApiPropertyOptional({ example: 'Mepilex Border' })
  @IsOptional() @IsString()
  dressing_used?: string;

  @ApiPropertyOptional({ example: '2024-06-04' })
  @IsOptional() @IsDateString()
  next_change_date?: string;

  @ApiPropertyOptional({ example: 's3://bucket/wound-photo-key' })
  @IsOptional() @IsString()
  photo_s3_key?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;
}
