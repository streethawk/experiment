import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PRISMA_SERVICE } from '../../database/database.module';

export type SafeUser = Omit<User, 'passwordHash' | 'mfaSecret' | 'passwordResetToken'>;

@Injectable()
export class UsersService {
  private readonly bcryptRounds: number;

  constructor(
    @Inject(PRISMA_SERVICE) private readonly prisma: PrismaClient,
    private readonly config: ConfigService,
  ) {
    this.bcryptRounds = this.config.get<number>('app.bcrypt.rounds', 12);
  }

  // ─── Lookups ──────────────────────────────────────────────────────────────

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async findSafeById(id: string): Promise<SafeUser | null> {
    return this.prisma.user.findUnique({
      where: { id },
      omit: { passwordHash: true, mfaSecret: true, passwordResetToken: true },
    });
  }

  // ─── Creation ─────────────────────────────────────────────────────────────

  async create(data: {
    email: string;
    fullName: string;
    password: string;
    role: UserRole;
    organisationId?: string;
    homeIds?: string[];
    staffId?: string;
  }): Promise<SafeUser> {
    const email = data.email.toLowerCase().trim();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email address already registered');

    const passwordHash = await bcrypt.hash(data.password, this.bcryptRounds);

    const user = await this.prisma.user.create({
      data: {
        email,
        fullName: data.fullName,
        passwordHash,
        role: data.role,
        organisationId: data.organisationId,
        homeIds: data.homeIds ?? [],
        staffId: data.staffId,
      },
      omit: { passwordHash: true, mfaSecret: true, passwordResetToken: true },
    });

    return user;
  }

  // ─── Password verification ────────────────────────────────────────────────

  async verifyPassword(plaintext: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
  }

  // ─── Lockout management ───────────────────────────────────────────────────

  async incrementFailedLogin(userId: string, maxAttempts: number, lockoutMinutes: number): Promise<void> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginCount: { increment: 1 } },
      select: { failedLoginCount: true },
    });

    if (user.failedLoginCount >= maxAttempts) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          lockedUntil: new Date(Date.now() + lockoutMinutes * 60 * 1000),
        },
      });
    }
  }

  async resetFailedLogin(userId: string, ip: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ip,
      },
    });
  }

  // ─── Password reset ───────────────────────────────────────────────────────

  async setPasswordResetToken(
    userId: string,
    tokenHash: string,
    expiryMinutes: number,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordResetToken: tokenHash,
        passwordResetExpiry: new Date(Date.now() + expiryMinutes * 60 * 1000),
      },
    });
  }

  async findByResetToken(tokenHash: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpiry: { gt: new Date() },
        isActive: true,
      },
    });
  }

  async applyNewPassword(userId: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, this.bcryptRounds);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
  }

  // ─── MFA ─────────────────────────────────────────────────────────────────

  async enableMfa(userId: string, encryptedSecret: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true, mfaSecret: encryptedSecret },
    });
  }

  async disableMfa(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecret: null },
    });
  }
}
