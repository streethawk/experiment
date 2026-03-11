import {
  IsEnum, IsOptional, IsInt, IsObject, IsDateString, Min, Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RiskType, RiskLevel } from '@prisma/client';

export class CreateRiskAssessmentDto {
  @ApiProperty({ enum: RiskType, description: 'Risk assessment tool / domain' })
  @IsEnum(RiskType)
  type: RiskType;

  @ApiProperty({ enum: RiskLevel })
  @IsEnum(RiskLevel)
  risk_level: RiskLevel;

  @ApiPropertyOptional({
    description: 'Numerical score (e.g. Waterlow score, MUST score)',
    example: 14,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999)
  score?: number;

  @ApiPropertyOptional({
    description: 'Tool-specific details (answers to assessment questions)',
    example: { weight_score: 2, bmi_score: 1, skin_score: 3 },
  })
  @IsOptional()
  @IsObject()
  details?: Record<string, unknown>;

  @ApiProperty({ description: 'Date the assessment was carried out', example: '2026-03-10' })
  @IsDateString()
  assessed_at: string;

  @ApiPropertyOptional({
    description: 'Date assessment should be reviewed — default 3 months',
    example: '2026-06-10',
  })
  @IsOptional()
  @IsDateString()
  valid_until?: string;
}
