import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ForbiddenException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PRISMA_SERVICE } from '../../database/database.module';
import * as bcrypt from 'bcryptjs';
import * as speakeasy from 'speakeasy';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeUser = (overrides: Partial<any> = {}): any => ({
  id: 'user-uuid-1',
  email: 'sarah@oakwood.co.uk',
  fullName: 'Sarah Jones',
  role: 'senior_carer',
  organisationId: 'org-uuid-1',
  homeIds: ['home-uuid-1'],
  staffId: 'staff-uuid-1',
  residentId: null,
  passwordHash: '$2b$12$hashedpassword',
  isActive: true,
  mfaEnabled: false,
  mfaSecret: null,
  failedLoginCount: 0,
  lockedUntil: null,
  lastLoginAt: null,
  lastLoginIp: null,
  passwordResetToken: null,
  passwordResetExpiry: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const CONFIG_VALUES: Record<string, any> = {
  'app.auth': {
    maxFailedAttempts: 5,
    lockoutMinutes: 15,
    passwordResetExpiryMinutes: 60,
    mfaWindowSeconds: 30,
  },
  'app.jwt': {
    secret: 'test-access-secret-64-chars-minimum-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    refreshSecret: 'test-refresh-secret-64-chars-minimum-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    expiresIn: 900,
    refreshExpiresIn: 28800,
    trustedDeviceExpiresIn: 2592000,
  },
  'app.bcrypt.rounds': 4, // fast for tests
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: JwtService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma = {
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const mockUsersService: Partial<jest.Mocked<UsersService>> = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      verifyPassword: jest.fn(),
      incrementFailedLogin: jest.fn(),
      resetFailedLogin: jest.fn(),
      setPasswordResetToken: jest.fn(),
      findByResetToken: jest.fn(),
      applyNewPassword: jest.fn(),
      enableMfa: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PRISMA_SERVICE, useValue: mockPrisma },
        { provide: UsersService, useValue: mockUsersService },
        {
          provide: ConfigService,
          useValue: { get: (key: string, fallback?: any) => CONFIG_VALUES[key] ?? fallback },
        },
        JwtService,
      ],
    }).compile();

    service = module.get(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    prisma = mockPrisma;
  });

  // ─── validateCredentials ──────────────────────────────────────────────────

  describe('validateCredentials', () => {
    it('returns null for unknown email (constant-time)', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      const result = await service.validateCredentials('unknown@example.com', 'password');
      expect(result).toBeNull();
    });

    it('throws ForbiddenException for inactive account', async () => {
      usersService.findByEmail.mockResolvedValue(makeUser({ isActive: false }));
      await expect(service.validateCredentials('sarah@oakwood.co.uk', 'pass'))
        .rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException for locked account', async () => {
      const lockedUntil = new Date(Date.now() + 10 * 60 * 1000);
      usersService.findByEmail.mockResolvedValue(makeUser({ lockedUntil }));
      await expect(service.validateCredentials('sarah@oakwood.co.uk', 'pass'))
        .rejects.toThrow(ForbiddenException);
    });

    it('returns null and increments counter for wrong password', async () => {
      usersService.findByEmail.mockResolvedValue(makeUser());
      usersService.verifyPassword.mockResolvedValue(false);

      const result = await service.validateCredentials('sarah@oakwood.co.uk', 'wrong');
      expect(result).toBeNull();
      expect(usersService.incrementFailedLogin).toHaveBeenCalledWith(
        'user-uuid-1', 5, 15,
      );
    });

    it('returns the user for correct credentials', async () => {
      const user = makeUser();
      usersService.findByEmail.mockResolvedValue(user);
      usersService.verifyPassword.mockResolvedValue(true);

      const result = await service.validateCredentials('sarah@oakwood.co.uk', 'correct');
      expect(result).toEqual(user);
    });
  });

  // ─── login ────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns token pair when MFA not enabled', async () => {
      const user = makeUser({ mfaEnabled: false });
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt-uuid-1', isTrusted: false, deviceId: null });
      usersService.resetFailedLogin.mockResolvedValue(undefined);

      const result = await service.login(user, '1.2.3.4', 'test-agent');

      expect(result.requires_mfa).toBe(false);
      expect((result as any).access_token).toBeDefined();
      expect((result as any).refresh_token).toBeDefined();
      expect((result as any).expires_in).toBe(900);
    });

    it('returns mfa_token when MFA enabled and no trusted device', async () => {
      const user = makeUser({ mfaEnabled: true });
      prisma.refreshToken.findFirst.mockResolvedValue(null); // no trusted device

      const result = await service.login(user, '1.2.3.4', 'test-agent');

      expect(result.requires_mfa).toBe(true);
      expect((result as any).mfa_token).toBeDefined();
      expect((result as any).access_token).toBeUndefined();
    });

    it('skips MFA for trusted device', async () => {
      const user = makeUser({ mfaEnabled: true });
      prisma.refreshToken.findFirst.mockResolvedValue({ id: 'trusted-rt' }); // trusted device found
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt-uuid-2', isTrusted: true, deviceId: 'device-123' });
      usersService.resetFailedLogin.mockResolvedValue(undefined);

      const result = await service.login(user, '1.2.3.4', 'test-agent', 'device-123');

      expect(result.requires_mfa).toBe(false);
      expect((result as any).access_token).toBeDefined();
    });
  });

  // ─── verifyMfa ────────────────────────────────────────────────────────────

  describe('verifyMfa', () => {
    it('throws UnauthorizedException for invalid mfa_token', async () => {
      await expect(
        service.verifyMfa('not-a-jwt', '123456', false, '1.2.3.4', 'agent'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong TOTP code', async () => {
      const secret = speakeasy.generateSecret({ length: 20 });
      const user = makeUser({ mfaEnabled: true, mfaSecret: secret.base32 });

      // Issue a real mfa_pending token
      const mfaToken = jwtService.sign(
        { sub: user.id, type: 'mfa_pending' },
        { secret: CONFIG_VALUES['app.jwt'].secret, expiresIn: 300 },
      );

      usersService.findById.mockResolvedValue(user);

      await expect(
        service.verifyMfa(mfaToken, '000000', false, '1.2.3.4', 'agent'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns token pair for valid TOTP code', async () => {
      const secret = speakeasy.generateSecret({ length: 20 });
      const user = makeUser({ mfaEnabled: true, mfaSecret: secret.base32 });
      const validCode = speakeasy.totp({ secret: secret.base32, encoding: 'base32' });

      const mfaToken = jwtService.sign(
        { sub: user.id, type: 'mfa_pending' },
        { secret: CONFIG_VALUES['app.jwt'].secret, expiresIn: 300 },
      );

      usersService.findById.mockResolvedValue(user);
      usersService.resetFailedLogin.mockResolvedValue(undefined);
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt-uuid-3', isTrusted: false, deviceId: null });

      const result = await service.verifyMfa(mfaToken, validCode, false, '1.2.3.4', 'agent');

      expect(result.requires_mfa).toBe(false);
      expect(result.access_token).toBeDefined();
      expect(result.refresh_token).toBeDefined();
    });
  });

  // ─── refreshTokens ────────────────────────────────────────────────────────

  describe('refreshTokens', () => {
    it('throws if token record not found', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(
        service.refreshTokens('user-uuid-1', 'jti-1', 'raw-token', '1.2.3.4', 'agent'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws and revokes all tokens on reuse', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'jti-1', userId: 'user-uuid-1', revokedAt: new Date(), expiresAt: new Date(Date.now() + 999999),
      });
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      await expect(
        service.refreshTokens('user-uuid-1', 'jti-1', 'raw', '1.2.3.4', 'agent'),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
    });
  });

  // ─── requestPasswordReset ─────────────────────────────────────────────────

  describe('requestPasswordReset', () => {
    it('silently does nothing for unknown email', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      await expect(service.requestPasswordReset('nobody@example.com')).resolves.not.toThrow();
    });

    it('sets reset token for known email', async () => {
      usersService.findByEmail.mockResolvedValue(makeUser());
      usersService.setPasswordResetToken.mockResolvedValue(undefined);

      await service.requestPasswordReset('sarah@oakwood.co.uk');

      expect(usersService.setPasswordResetToken).toHaveBeenCalledWith(
        'user-uuid-1',
        expect.any(String),
        60,
      );
    });
  });

  // ─── resetPassword ────────────────────────────────────────────────────────

  describe('resetPassword', () => {
    it('throws BadRequestException for invalid token', async () => {
      usersService.findByResetToken.mockResolvedValue(null);
      await expect(service.resetPassword('bad-token', 'NewPassword123!')).rejects.toThrow(BadRequestException);
    });

    it('applies new password and revokes sessions for valid token', async () => {
      usersService.findByResetToken.mockResolvedValue(makeUser());
      usersService.applyNewPassword.mockResolvedValue(undefined);
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.resetPassword('valid-token', 'NewPassword123!');

      expect(usersService.applyNewPassword).toHaveBeenCalledWith('user-uuid-1', 'NewPassword123!');
      expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
    });
  });
});
