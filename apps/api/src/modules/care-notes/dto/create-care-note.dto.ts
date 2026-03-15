import {
  IsEnum, IsString, IsArray, IsOptional, IsBoolean, IsInt, Min, Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum CareNoteShift { early = 'early', late = 'late', night = 'night' }

enum CareNoteCategory {
  personal_care = 'personal_care', nutrition = 'nutrition',
  hydration = 'hydration', medication = 'medication', mobility = 'mobility',
  continence = 'continence', sleep = 'sleep', mood_behaviour = 'mood_behaviour',
  medical = 'medical', social_activity = 'social_activity',
  wound_care = 'wound_care', repositioning = 'repositioning',
  handover = 'handover', general = 'general',
}

export class CreateCareNoteDto {
  @ApiProperty({ enum: CareNoteShift })
  @IsEnum(CareNoteShift)
  shift: CareNoteShift;

  @ApiProperty({ type: [String], enum: CareNoteCategory })
  @IsArray() @IsEnum(CareNoteCategory, { each: true })
  categories: CareNoteCategory[];

  @ApiProperty()
  @IsString()
  note: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 10, description: '1–10 mood score' })
  @IsOptional() @IsInt() @Min(1) @Max(10)
  mood_score?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, description: 'Food intake %' })
  @IsOptional() @IsInt() @Min(0) @Max(100)
  food_intake_pct?: number;

  @ApiPropertyOptional({ minimum: 0, description: 'Fluid intake in ml' })
  @IsOptional() @IsInt() @Min(0)
  fluid_intake_ml?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  is_flagged?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  flag_reason?: string;
}
