import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWoundDto {
  @ApiProperty({ example: 'Sacrum' })
  @IsString()
  site: string;

  @ApiPropertyOptional({ example: '2024-05-20' })
  @IsOptional() @IsDateString()
  onset_date?: string;

  @ApiPropertyOptional({ example: 'Pressure ulcer — Category 2' })
  @IsOptional() @IsString()
  wound_type?: string;
}
