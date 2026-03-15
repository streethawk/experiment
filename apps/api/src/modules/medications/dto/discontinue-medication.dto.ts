import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DiscontinueMedicationDto {
  @ApiProperty({ example: '2024-06-01' })
  @IsDateString()
  discontinued_date: string;

  @ApiPropertyOptional({ example: 'No longer required following GP review' })
  @IsOptional() @IsString()
  reason?: string;
}
