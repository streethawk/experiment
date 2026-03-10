import { IsOptional, IsEnum, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum ResidentStatus {
  ACTIVE = 'active',
  HOSPITAL = 'hospital',
  RESPITE = 'respite',
  LEAVE = 'leave',
  DISCHARGED = 'discharged',
  DECEASED = 'deceased',
}

export class ListResidentsQuery {
  @ApiPropertyOptional({ enum: ResidentStatus, default: 'active' })
  @IsOptional()
  @IsEnum(ResidentStatus)
  status?: ResidentStatus = ResidentStatus.ACTIVE;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  care_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  wing_id?: string;

  @ApiPropertyOptional({ description: 'Search by name, room number, or NHS number' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
