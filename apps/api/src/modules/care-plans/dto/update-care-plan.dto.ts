import { IsObject, IsOptional, IsDateString, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCarePlanDto {
  @ApiPropertyOptional({
    description: 'Deep-merge patch for sections — only specified keys are overwritten',
  })
  @IsOptional()
  @IsObject()
  sections?: Record<string, unknown>;

  @ApiPropertyOptional({ example: '2026-12-01' })
  @IsOptional()
  @IsDateString()
  next_review_date?: string;
}
