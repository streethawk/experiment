import {
  IsString, IsEmail, IsOptional, IsEnum, IsDateString,
  IsBoolean, IsArray, ValidateNested, Length, Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class NextOfKinDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() relationship: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone_primary?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiProperty() @IsBoolean() is_primary_nok: boolean;
  @ApiProperty() @IsBoolean() has_lpa_welfare: boolean;
  @ApiProperty() @IsBoolean() has_lpa_finance: boolean;
}

export enum CareType {
  RESIDENTIAL = 'residential',
  NURSING = 'nursing',
  DEMENTIA = 'dementia',
  EMI = 'emi',
  RESPITE = 'respite',
  END_OF_LIFE = 'end_of_life',
}

export enum AdmissionSource {
  HOSPITAL_DISCHARGE = 'hospital_discharge',
  HOME = 'home',
  OTHER_CARE_HOME = 'other_care_home',
  SELF_REFERRAL = 'self_referral',
  LA_REFERRAL = 'la_referral',
  NHS_REFERRAL = 'nhs_referral',
}

export enum FundingSource {
  SELF_FUNDED = 'self_funded',
  LOCAL_AUTHORITY = 'local_authority',
  CHC = 'chc',
  CHC_FAST_TRACK = 'chc_fast_track',
  NHS_FNC = 'nhs_fnc',
  MIXED = 'mixed',
  DEFERRED_PAYMENT = 'deferred_payment',
}

export class CreateResidentDto {
  @ApiProperty({ example: 'Edith Thompson' })
  @IsString()
  @Length(2, 255)
  full_name: string;

  @ApiPropertyOptional({ example: 'Edith' })
  @IsOptional()
  @IsString()
  preferred_name?: string;

  @ApiProperty({ example: '1938-03-12' })
  @IsDateString()
  date_of_birth: string;

  @ApiPropertyOptional({ example: '9434765281' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$/, { message: 'NHS number must be exactly 10 digits' })
  nhs_number?: string;

  @ApiProperty({ example: 'Room 101' })
  @IsOptional()
  @IsString()
  room_id?: string;

  @ApiProperty({ enum: CareType })
  @IsEnum(CareType)
  care_type: CareType;

  @ApiProperty({ example: '2026-02-11' })
  @IsDateString()
  admission_date: string;

  @ApiProperty({ enum: AdmissionSource })
  @IsEnum(AdmissionSource)
  admission_source: AdmissionSource;

  @ApiProperty({ enum: FundingSource })
  @IsEnum(FundingSource)
  primary_funding_source: FundingSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gp_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gp_practice?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gp_phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  dnar_in_place?: boolean;

  @ApiPropertyOptional({ type: [NextOfKinDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NextOfKinDto)
  nok?: NextOfKinDto[];
}
