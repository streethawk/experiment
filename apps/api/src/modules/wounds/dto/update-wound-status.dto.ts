import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum WoundStatus { open = 'open', healing = 'healing', healed = 'healed', deteriorating = 'deteriorating' }

export class UpdateWoundStatusDto {
  @ApiProperty({ enum: WoundStatus })
  @IsEnum(WoundStatus)
  status: WoundStatus;

  @ApiPropertyOptional({ example: '2024-06-15' })
  @IsOptional() @IsDateString()
  healed_date?: string;
}
