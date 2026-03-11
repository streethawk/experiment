import {
  IsString, IsEnum, IsOptional, IsEmail, IsInt, IsArray, IsUUID,
  IsDateString, MaxLength, Min, Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CareTypeEnum } from '@prisma/client';

export class CreateHomeDto {
  @ApiProperty({ example: 'Oakwood West' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'org-uuid-here' })
  @IsUUID()
  organisation_id: string;

  @ApiPropertyOptional({ example: '1-123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  cqc_registration_number?: string;

  @ApiProperty({ example: '12 Oakwood Lane' })
  @IsString()
  @MaxLength(255)
  address_line1: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address_line2?: string;

  @ApiProperty({ example: 'Bristol' })
  @IsString()
  @MaxLength(100)
  city: string;

  @ApiProperty({ example: 'BS1 4DP' })
  @IsString()
  @MaxLength(10)
  postcode: string;

  @ApiPropertyOptional({ example: '01179 000000' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: 'admin@oakwoodwest.co.uk' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 40, description: 'Total bed capacity' })
  @IsInt()
  @Min(1)
  @Max(500)
  bed_capacity: number;

  @ApiProperty({ enum: CareTypeEnum, isArray: true })
  @IsArray()
  @IsEnum(CareTypeEnum, { each: true })
  care_types: CareTypeEnum[];

  @ApiPropertyOptional({ example: '2023-06-01' })
  @IsOptional()
  @IsDateString()
  last_cqc_inspection_date?: string;
}
