import { PartialType, OmitType } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CqcRating } from '@prisma/client';
import { CreateHomeDto } from './create-home.dto';

export class UpdateHomeDto extends PartialType(
  OmitType(CreateHomeDto, ['organisation_id'] as const),
) {
  @ApiPropertyOptional({ description: 'Assign a registered manager by staff ID' })
  @IsOptional()
  @IsUUID()
  registered_manager_id?: string;

  @ApiPropertyOptional({ enum: CqcRating })
  @IsOptional()
  @IsEnum(CqcRating)
  last_cqc_rating?: CqcRating;
}
