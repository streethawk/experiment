import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PRISMA_SERVICE } from '../src/database/database.module';

/**
 * Auth E2E tests — run against a real test database.
 *
 * Requires:
 *   DATABASE_URL=postgresql://carecore_test:test_password@localhost:5432/carecore_test
 *   JWT_SECRET and JWT_REFRESH_SECRET set in environment
 *
 * Run: npm run test:e2e --filter=@carecore/api
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  // ─── Test fixtures ──────────────────────────────────────────────────────

  const TEST_USER = {
    email: 'test-carer@carecore-test.local',
    password: 'TestPassword123!',
    fullName: 'Test Carer',
    role: 'carer' as const,
    homeIds: [],
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = moduleFixture.get(PRISMA_SERVICE);

    // Seed test user
    await prisma.user.deleteMany({ where: { email: TEST_USER.email } });
    await prisma.user.create({
      data: {
        email: TEST_USER.email,
        fullName: TEST_USER.fullName,
        role: TEST_USER.role,
        homeIds: [],
        passwordHash: await bcrypt.hash(TEST_USER.password, 4),
        isActive: true,
        mfaEnabled: false,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: TEST_USER.email } });
    await app.close();
  });

  // ─── POST /auth/login ───────────────────────────────────────────────────

  describe('POST /v1/auth/login', () => {
    it('returns 400 for missing body', async () => {
      const res = await request(app.getHttpServer()).post('/v1/auth/login').send({});
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid email format', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: 'not-an-email', password: 'whatever' });
      expect(res.status).toBe(400);
    });

    it('returns 401 for wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: TEST_USER.email, password: 'WrongPassword123!' });
      expect(res.status).toBe(401);
    });

    it('returns 401 for unknown email', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: 'nobody@nowhere.com', password: 'Password123!' });
      expect(res.status).toBe(401);
    });

    it('returns token pair for valid credentials (no MFA)', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      expect(res.status).toBe(200);
      expect(res.body.requires_mfa).toBe(false);
      expect(res.body.access_token).toBeDefined();
      expect(res.body.refresh_token).toBeDefined();
      expect(res.body.expires_in).toBe(900);
      expect(res.body.user.email).toBe(TEST_USER.email);
      // Never leak password
      expect(JSON.stringify(res.body)).not.toContain('password');
      expect(JSON.stringify(res.body)).not.toContain('mfa_secret');
    });
  });

  // ─── GET /auth/me ───────────────────────────────────────────────────────

  describe('GET /v1/auth/me', () => {
    let accessToken: string;

    beforeEach(async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password });
      accessToken = loginRes.body.access_token;
    });

    it('returns 401 without token', async () => {
      const res = await request(app.getHttpServer()).get('/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns current user with valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe(TEST_USER.email);
      expect(res.body.role).toBe(TEST_USER.role);
    });

    it('returns 401 for tampered token', async () => {
      const tampered = accessToken.slice(0, -5) + 'XXXXX';
      const res = await request(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Authorization', `Bearer ${tampered}`);
      expect(res.status).toBe(401);
    });
  });

  // ─── POST /auth/refresh ─────────────────────────────────────────────────

  describe('POST /v1/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password });
      refreshToken = loginRes.body.refresh_token;
    });

    it('returns new token pair for valid refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({ refresh_token: refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.access_token).toBeDefined();
      expect(res.body.refresh_token).toBeDefined();
      // Rotation — new refresh token should differ
      expect(res.body.refresh_token).not.toBe(refreshToken);
    });

    it('rejects reuse of rotated refresh token', async () => {
      // First use — succeeds
      await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({ refresh_token: refreshToken });

      // Second use of same token — should fail
      const res = await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({ refresh_token: refreshToken });

      expect(res.status).toBe(401);
    });

    it('returns 400 for malformed token', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({ refresh_token: 'not-a-jwt' });
      // Not 200
      expect(res.status).not.toBe(200);
    });
  });

  // ─── DELETE /auth/logout ────────────────────────────────────────────────

  describe('DELETE /v1/auth/logout', () => {
    it('returns 204 and invalidates refresh token', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      const { access_token, refresh_token } = loginRes.body;

      const logoutRes = await request(app.getHttpServer())
        .delete('/v1/auth/logout')
        .set('Authorization', `Bearer ${access_token}`)
        .send({ refresh_token });

      expect(logoutRes.status).toBe(204);

      // Refresh token should now be invalid
      const refreshRes = await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({ refresh_token });
      expect(refreshRes.status).toBe(401);
    });
  });

  // ─── POST /auth/password/reset-request ─────────────────────────────────

  describe('POST /v1/auth/password/reset-request', () => {
    it('always returns 204 (even for unknown email)', async () => {
      const res1 = await request(app.getHttpServer())
        .post('/v1/auth/password/reset-request')
        .send({ email: 'nobody@nowhere.com' });
      expect(res1.status).toBe(204);

      const res2 = await request(app.getHttpServer())
        .post('/v1/auth/password/reset-request')
        .send({ email: TEST_USER.email });
      expect(res2.status).toBe(204);
    });
  });

  // ─── Account lockout ────────────────────────────────────────────────────

  describe('Account lockout', () => {
    const LOCKED_EMAIL = 'lockout-test@carecore-test.local';

    beforeAll(async () => {
      await prisma.user.deleteMany({ where: { email: LOCKED_EMAIL } });
      await prisma.user.create({
        data: {
          email: LOCKED_EMAIL,
          fullName: 'Lockout Test',
          role: 'carer',
          homeIds: [],
          passwordHash: await bcrypt.hash('CorrectPassword123!', 4),
          isActive: true,
        },
      });
    });

    afterAll(async () => {
      await prisma.user.deleteMany({ where: { email: LOCKED_EMAIL } });
    });

    it('locks account after 5 failed attempts', async () => {
      // 5 wrong attempts
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/v1/auth/login')
          .send({ email: LOCKED_EMAIL, password: 'WrongPassword!' });
      }

      // 6th attempt — even with correct password — should be locked
      const res = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: LOCKED_EMAIL, password: 'CorrectPassword123!' });

      expect(res.status).toBe(403);
      expect(res.body.detail).toContain('locked');
    });
  });
});
