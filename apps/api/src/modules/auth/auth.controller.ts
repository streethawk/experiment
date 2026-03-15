import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Get,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService, LoginResult, MfaPendingResult, TokenPair } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { MfaVerifyDto } from './dto/mfa-verify.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { PasswordResetRequestDto, PasswordResetDto } from './dto/password-reset.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── Login ────────────────────────────────────────────────────────────────

  @Post('login')
  @Public()
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 attempts per minute
  @ApiOperation({ summary: 'Authenticate with email and password' })
  async login(@Req() req: Request, @Body() _dto: LoginDto): Promise<LoginResult | MfaPendingResult> {
    // req.user is populated by LocalStrategy after credential validation
    const user = req.user as any;
    const clientIp = this.extractIp(req);
    const userAgent = req.headers['user-agent'] ?? '';
    const deviceId = req.headers['x-device-id'] as string | undefined;

    return this.authService.login(user, clientIp, userAgent, deviceId);
  }

  // ─── MFA verification ─────────────────────────────────────────────────────

  @Post('mfa/verify')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // tighter limit for MFA
  @ApiOperation({ summary: 'Verify TOTP code after login (if MFA enabled)' })
  async verifyMfa(@Req() req: Request, @Body() dto: MfaVerifyDto): Promise<LoginResult> {
    return this.authService.verifyMfa(
      dto.mfa_token,
      dto.code,
      dto.trust_device ?? false,
      this.extractIp(req),
      req.headers['user-agent'] ?? '',
    );
  }

  // ─── Token refresh ────────────────────────────────────────────────────────

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and get new access token' })
  async refresh(@Req() req: Request, @Body() dto: RefreshTokenDto): Promise<TokenPair | { status: number; message: string }> {
    // Decode the refresh JWT to get userId + jti without full validation
    // (full validation happens in auth.service)
    let payload: { sub: string; jti: string };
    try {
      payload = this.decodeRefreshToken(dto.refresh_token);
    } catch {
      return { status: 401, message: 'Invalid refresh token' };
    }

    return this.authService.refreshTokens(
      payload.sub,
      payload.jti,
      dto.refresh_token,
      this.extractIp(req),
      req.headers['user-agent'] ?? '',
    );
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  @Delete('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke current refresh token' })
  async logout(@Req() req: Request, @Body() dto: RefreshTokenDto) {
    const user = req.user as any;
    let jti: string | undefined;
    try {
      ({ jti } = this.decodeRefreshToken(dto.refresh_token));
    } catch {
      return; // Already invalid, nothing to do
    }
    if (jti) await this.authService.logout(user.id, jti);
  }

  @Delete('logout/all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke all sessions (sign out everywhere)' })
  async logoutAll(@Req() req: Request) {
    const user = req.user as any;
    await this.authService.logoutAll(user.id);
  }

  // ─── Password reset ───────────────────────────────────────────────────────

  @Post('password/reset-request')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 per 5 min
  @ApiOperation({ summary: 'Request a password reset email (always returns 204)' })
  async requestReset(@Body() dto: PasswordResetRequestDto) {
    await this.authService.requestPasswordReset(dto.email);
    // Always 204 — never reveal whether email exists
  }

  @Post('password/reset')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Apply new password using reset token from email' })
  async resetPassword(@Body() dto: PasswordResetDto) {
    await this.authService.resetPassword(dto.token, dto.new_password);
  }

  // ─── MFA setup ───────────────────────────────────────────────────────────

  @Get('mfa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate a new MFA secret for setup (returns QR URL)' })
  async mfaSetup(@Req() req: Request) {
    const user = req.user as any;
    return this.authService.generateMfaSecret(user.email);
  }

  @Post('mfa/confirm')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm MFA setup by verifying first TOTP code' })
  async mfaConfirm(
    @Req() req: Request,
    @Body() body: { secret: string; code: string },
  ) {
    const user = req.user as any;
    await this.authService.confirmMfaSetup(user.id, body.secret, body.code);
  }

  // ─── Current user ─────────────────────────────────────────────────────────

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiOkResponse({ description: 'Current user profile' })
  me(@Req() req: Request) {
    return req.user;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private extractIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.socket?.remoteAddress ??
      'unknown'
    );
  }

  private decodeRefreshToken(token: string): { sub: string; jti: string } {
    // Decode without verification — service does the full validation
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Malformed JWT');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (!payload.sub || !payload.jti) throw new Error('Missing claims');
    return { sub: payload.sub, jti: payload.jti };
  }
}
