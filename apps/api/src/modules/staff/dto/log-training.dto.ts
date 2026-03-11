import {
  IsString, IsEnum, IsOptional, IsDateString, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TrainingType } from '@prisma/client';

export class LogTrainingDto {
  @ApiProperty({ example: 'Moving and Handling' })
  @IsString()
  @MaxLength(255)
  course_name: string;

  @ApiProperty({ enum: TrainingType, default: 'mandatory' })
  @IsEnum(TrainingType)
  course_type: TrainingType;

  @ApiPropertyOptional({ example: 'Care Skills Academy' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  provider?: string;

  @ApiProperty({ example: '2024-03-15' })
  @IsDateString()
  completed_date: string;

  @ApiPropertyOptional({ example: '2026-03-15', description: '3 years for mandatory, null for one-off' })
  @IsOptional()
  @IsDateString()
  expiry_date?: string;

  @ApiPropertyOptional({ description: 'S3 key of uploaded certificate' })
  @IsOptional()
  @IsString()
  certificate_s3_key?: string;
}
