import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum ClockMethod { pin = 'pin', qr_code = 'qr_code', nfc = 'nfc', manual = 'manual', biometric = 'biometric' }

export class ClockOutDto {
  @ApiProperty({ enum: ClockMethod })
  @IsEnum(ClockMethod)
  method: ClockMethod;

  @ApiPropertyOptional({ description: 'Override clock-out time (managers only), ISO datetime' })
  @IsOptional() @IsDateString()
  clocked_out_at?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  override_reason?: string;
}
