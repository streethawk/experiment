import {
  IsString, IsEnum, IsEmail, IsOptional, IsDateString, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrgType, SubscriptionTier } from '@prisma/client';

export class CreateOrganisationDto {
  @ApiProperty({ example: 'Oakwood Care Group' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ enum: OrgType, example: 'care_group' })
  @IsEnum(OrgType)
  type: OrgType;

  @ApiPropertyOptional({ enum: SubscriptionTier, default: 'starter' })
  @IsOptional()
  @IsEnum(SubscriptionTier)
  subscription_tier?: SubscriptionTier;

  @ApiPropertyOptional({ example: 'billing@oakwood.co.uk' })
  @IsOptional()
  @IsEmail()
  billing_email?: string;

  @ApiPropertyOptional({ example: 'Z1234567' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  ico_registration_ref?: string;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  subscription_start?: string;
}
