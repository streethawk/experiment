import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCareNoteDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  is_flagged?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  flag_reason?: string;
}
