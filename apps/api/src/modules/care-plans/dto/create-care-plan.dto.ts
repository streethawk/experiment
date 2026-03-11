import { IsObject, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Care plan sections — flexible JSON structure.
 * Each section key maps to a care domain (e.g. "personal_care", "nutrition").
 * The frontend renders each section from a section schema definition.
 */
export class CreateCarePlanDto {
  @ApiPropertyOptional({
    description: 'Initial section content (JSON). If omitted, an empty draft is created.',
    example: {
      personal_care: { content: 'Edith prefers a bath in the morning.', last_updated: '2026-03-01' },
    },
  })
  @IsOptional()
  @IsObject()
  sections?: Record<string, unknown>;

  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsOptional()
  @IsDateString()
  next_review_date?: string;
}
