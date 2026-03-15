import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum ShiftStatus {
  scheduled = 'scheduled', confirmed = 'confirmed',
  in_progress = 'in_progress', completed = 'completed',
  absent = 'absent', cancelled = 'cancelled',
}

export class UpdateShiftStatusDto {
  @ApiProperty({ enum: ShiftStatus })
  @IsEnum(ShiftStatus)
  status: ShiftStatus;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;
}
