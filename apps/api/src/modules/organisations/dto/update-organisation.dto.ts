import { PartialType } from '@nestjs/swagger';
import { CreateOrganisationDto } from './create-organisation.dto';
import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionTier } from '@prisma/client';

export class UpdateOrganisationDto extends PartialType(CreateOrganisationDto) {
  @ApiPropertyOptional({ enum: SubscriptionTier })
  @IsOptional()
  @IsEnum(SubscriptionTier)
  subscription_tier?: SubscriptionTier;

  @ApiPropertyOptional({ description: 'Set to end subscription', example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  subscription_end?: string;
}
