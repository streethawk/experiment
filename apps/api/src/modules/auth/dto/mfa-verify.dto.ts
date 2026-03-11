import { IsString, Length, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MfaVerifyDto {
  @ApiProperty({ description: 'Short-lived MFA pending token from login response' })
  @IsString()
  mfa_token: string;

  @ApiProperty({ description: '6-digit TOTP code', example: '123456' })
  @IsString()
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  code: string;

  @ApiPropertyOptional({ description: 'Trust this device for 30 days' })
  @IsOptional()
  @IsBoolean()
  trust_device?: boolean;
}
