import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum ClockMethod { pin = 'pin', qr_code = 'qr_code', nfc = 'nfc', manual = 'manual', biometric = 'biometric' }

export class ClockInDto {
  @ApiProperty({ enum: ClockMethod })
  @IsEnum(ClockMethod)
  method: ClockMethod;

  @ApiPropertyOptional({ description: 'Override clock-in time (managers only), ISO datetime' })
  @IsOptional() @IsDateString()
  clocked_in_at?: string;

  @ApiPropertyOptional({ description: 'Required when method=manual' })
  @IsOptional() @IsString()
  override_reason?: string;
}
