import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as speakeasy from 'speakeasy';
import { randomBytes, createHash } from 'crypto';
import { UsersService } from '../users/users.service';
import { PRISMA_SERVICE } from '../../database/database.module';
import { JwtPayload } from './strategies/jwt.strategy';
import { RefreshJwtPayload } from './strategies/jwt-refresh.strategy';

// ─── Response shapes ──────────────────────────────────────────────────────────

interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface LoginResult {
  requires_mfa: false;
  user: object;
} & TokenPair;

interface MfaPendingResult {
  requires_mfa: true;
  mfa_token: string;    // short-lived JWT, 5 min, type: 'mfa_pending'
  expires_in: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private readonly maxFailedAttempts: number;
  private readonly lockoutMinutes: number;
  private readonly jwtExpiresIn: number;
  private readonly refreshExpiresIn: number;
  private readonly trustedExpiresIn: number;
  private readonly resetExpiryMinutes: number;
  private readonly bcryptRounds: number;

  constructor(
    @Inject(PRISMA_SERVICE) private readonly prisma: PrismaClient,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {
    const authConfig = config.get('app.auth');
    this.maxFailedAttempts = authConfig.maxFailedAttempts;
    this.lockoutMinutes = authConfig.lockoutMinutes;
    this.resetExpiryMinutes = authConfig.passwordResetExpiryMinutes;

    const jwtConfig = config.get('app.jwt');
    this.jwtExpiresIn = jwtConfig.expiresIn;
    this.refreshExpiresIn = jwtConfig.refreshExpiresIn;
    this.trustedExpiresIn = jwtConfig.trustedDeviceExpiresIn;

    this.bcryptRounds = config.get<number>('app.bcrypt.rounds', 12);
  }

  // ─── Credential validation (used by LocalStrategy) ───────────────────────

  async validateCredentials(
    email: string,
    password: string,
  ): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      // Constant-time response to prevent email enumeration
      await bcrypt.compare(password, '$2b$12$invalidhashtopreventtiming.......');
      return null;
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account has been deactivated');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const unlockAt = user.lockedUntil.toLocaleTimeString('en-GB');
      throw new ForbiddenException(
        `Account locked due to repeated failed login attempts. Try again after ${unlockAt}.`,
      );
    }

    const passwordValid = await this.usersService.verifyPassword(
      password,
      user.passwordHash,
    );

    if (!passwordValid) {
      await this.usersService.incrementFailedLogin(
        user.id,
        this.maxFailedAttempts,
        this.lockoutMinutes,
      );
      return null;
    }

    return user;
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  async login(
    user: User,
    clientIp: string,
    userAgent: string,
    deviceId?: string,
  ): Promise<LoginResult | MfaPendingResult> {
    // Check if this trusted device skips MFA
    const skipMfa = user.mfaEnabled && deviceId
      ? await this.isTrustedDevice(user.id, deviceId)
      : false;

    if (user.mfaEnabled && !skipMfa) {
      // Issue a short-lived MFA pending token — no access granted yet
      const mfaToken = this.signMfaPendingToken(user.id);
      return { requires_mfa: true, mfa_token: mfaToken, expires_in: 300 };
    }

    // MFA not needed — issue full token pair
    await this.usersService.resetFailedLogin(user.id, clientIp);
    const tokens = await this.issueTokenPair(user, clientIp, userAgent, deviceId);

    return {
      requires_mfa: false,
      ...tokens,
      user: this.buildUserPayload(user),
    };
  }

  // ─── MFA verification ─────────────────────────────────────────────────────

  async verifyMfa(
    mfaToken: string,
    code: string,
    trustDevice: boolean,
    clientIp: string,
    userAgent: string,
  ): Promise<LoginResult & { device_id?: string }> {
    // Verify the MFA-pending JWT
    let payload: { sub: string; type: string };
    try {
      payload = this.jwtService.verify(mfaToken, {
        secret: this.config.get<string>('app.jwt.secret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired MFA session. Please log in again.');
    }

    if (payload.type !== 'mfa_pending') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive || !user.mfaEnabled || !user.mfaSecret) {
      throw new UnauthorizedException('MFA verification failed');
    }

    const mfaWindow = this.config.get<number>('app.auth.mfaWindowSeconds', 30);
    const valid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: code,
      window: Math.ceil(mfaWindow / 30), // ±1 step
    });

    if (!valid) {
      throw new UnauthorizedException('Invalid authenticator code');
    }

    await this.usersService.resetFailedLogin(user.id, clientIp);

    // If "trust device" requested, generate a stable device ID
    const deviceId = trustDevice ? randomBytes(32).toString('hex') : undefined;
    const tokens = await this.issueTokenPair(user, clientIp, userAgent, deviceId, trustDevice);

    return {
      requires_mfa: false,
      ...tokens,
      user: this.buildUserPayload(user),
      ...(deviceId ? { device_id: deviceId } : {}),
    };
  }

  // ─── Token refresh (rotation) ─────────────────────────────────────────────

  async refreshTokens(
    userId: string,
    jti: string,
    rawToken: string,
    clientIp: string,
    userAgent: string,
  ): Promise<TokenPair> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { id: jti },
    });

    if (!stored || stored.userId !== userId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.revokedAt) {
      // Possible token reuse — revoke all tokens for this user (security measure)
      this.logger.warn(`Refresh token reuse detected for user ${userId} — revoking all tokens`);
      await this.revokeAllTokens(userId);
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    const tokenValid = await bcrypt.compare(rawToken, stored.tokenHash);
    if (!tokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Revoke the used token (rotation — one-time use)
    await this.prisma.refreshToken.update({
      where: { id: jti },
      data: { revokedAt: new Date() },
    });

    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    return this.issueTokenPair(user, clientIp, userAgent, stored.deviceId ?? undefined, stored.isTrusted);
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  async logout(userId: string, jti: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { id: jti, userId },
      data: { revokedAt: new Date() },
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.revokeAllTokens(userId);
  }

  // ─── Password reset ───────────────────────────────────────────────────────

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    // Always resolve — prevent email enumeration
    if (!user || !user.isActive) return;

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    await this.usersService.setPasswordResetToken(
      user.id,
      tokenHash,
      this.resetExpiryMinutes,
    );

    // TODO: Emit event for email service
    // this.eventEmitter.emit('auth.password_reset_requested', { user, rawToken });
    this.logger.log(`Password reset requested for ${email} — token: ${rawToken} (dev only)`);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const user = await this.usersService.findByResetToken(tokenHash);

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    await this.usersService.applyNewPassword(user.id, newPassword);
    await this.revokeAllTokens(user.id); // Force re-login everywhere
  }

  // ─── MFA setup ───────────────────────────────────────────────────────────

  generateMfaSecret(email: string): { secret: string; otpauth_url: string; qr_data: string } {
    const generated = speakeasy.generateSecret({
      name: `CareCore (${email})`,
      issuer: 'CareCore',
      length: 20,
    });

    return {
      secret: generated.base32,
      otpauth_url: generated.otpauth_url!,
      qr_data: generated.otpauth_url!,
    };
  }

  async confirmMfaSetup(userId: string, secret: string, code: string): Promise<void> {
    const valid = speakeasy.totp.verify({ secret, encoding: 'base32', token: code, window: 1 });
    if (!valid) throw new BadRequestException('Authenticator code does not match — check time sync');

    await this.usersService.enableMfa(userId, secret);
    await this.revokeAllTokens(userId); // Force re-login with MFA
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async issueTokenPair(
    user: User,
    clientIp: string,
    userAgent: string,
    deviceId?: string,
    isTrusted = false,
  ): Promise<TokenPair> {
    // Access token
    const accessPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organisationId: user.organisationId,
      homeIds: user.homeIds,
      type: 'access',
    };

    const access_token = this.jwtService.sign(accessPayload, {
      secret: this.config.get<string>('app.jwt.secret'),
      expiresIn: this.jwtExpiresIn,
    });

    // Refresh token — raw random value, store only the hash
    const rawRefreshToken = randomBytes(64).toString('hex');
    const tokenHash = await bcrypt.hash(rawRefreshToken, 10); // 10 rounds — fast, not for passwords
    const expiresIn = isTrusted ? this.trustedExpiresIn : this.refreshExpiresIn;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    const stored = await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        deviceId: deviceId ?? null,
        isTrusted,
        userAgent,
        ipAddress: clientIp,
        expiresAt,
      },
    });

    // Refresh JWT wraps the DB record ID so we can look it up efficiently
    const refreshPayload: RefreshJwtPayload = {
      sub: user.id,
      jti: stored.id,
      type: 'refresh',
    };

    const refresh_token = this.jwtService.sign(refreshPayload, {
      secret: this.config.get<string>('app.jwt.refreshSecret'),
      expiresIn: expiresIn,
    });

    return { access_token, refresh_token, expires_in: this.jwtExpiresIn };
  }

  private signMfaPendingToken(userId: string): string {
    return this.jwtService.sign(
      { sub: userId, type: 'mfa_pending' },
      {
        secret: this.config.get<string>('app.jwt.secret'),
        expiresIn: 300, // 5 minutes to complete MFA
      },
    );
  }

  private async isTrustedDevice(userId: string, deviceId: string): Promise<boolean> {
    const trusted = await this.prisma.refreshToken.findFirst({
      where: {
        userId,
        deviceId,
        isTrusted: true,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    return !!trusted;
  }

  private async revokeAllTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private buildUserPayload(user: User) {
    return {
      id: user.id,
      email: user.email,
      full_name: user.fullName,
      role: user.role,
      organisation_id: user.organisationId,
      home_ids: user.homeIds,
      mfa_enabled: user.mfaEnabled,
    };
  }
}
