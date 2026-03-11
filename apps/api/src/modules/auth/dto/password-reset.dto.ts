import { IsEmail, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PasswordResetRequestDto {
  @ApiProperty({ example: 'sarah.jones@oakwood.co.uk' })
  @IsEmail()
  email: string;
}

export class PasswordResetDto {
  @ApiProperty({ description: 'Reset token from email link' })
  @IsString()
  token: string;

  @ApiProperty({
    description: 'New password — min 12 chars, must include upper, lower, digit, special char',
    minLength: 12,
  })
  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&£#^()\-_=+[\]{};:'",.<>/?\\|`~])/, {
    message: 'Password must include uppercase, lowercase, a number, and a special character',
  })
  new_password: string;
}
