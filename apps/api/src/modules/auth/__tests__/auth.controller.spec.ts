import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockRequest = (overrides: object = {}) => ({
    user: { id: 'user-1', email: 'test@test.com', role: 'carer', homeIds: [], organisationId: null },
    headers: { 'user-agent': 'jest', 'x-forwarded-for': '10.0.0.1' },
    socket: { remoteAddress: '127.0.0.1' },
    body: {},
    ...overrides,
  }) as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            verifyMfa: jest.fn(),
            refreshTokens: jest.fn(),
            logout: jest.fn(),
            logoutAll: jest.fn(),
            requestPasswordReset: jest.fn(),
            resetPassword: jest.fn(),
            generateMfaSecret: jest.fn(),
            confirmMfaSetup: jest.fn(),
          } satisfies Partial<jest.Mocked<AuthService>>,
        },
      ],
    }).compile();

    controller = module.get(AuthController);
    authService = module.get(AuthService);
  });

  describe('login', () => {
    it('calls authService.login with ip, userAgent, and optional deviceId', async () => {
      const mockUser = { id: 'u1', email: 'x@x.com', role: 'carer' };
      const req = mockRequest({ user: mockUser });
      authService.login.mockResolvedValue({ requires_mfa: false } as any);

      await controller.login(req, { email: 'x@x.com', password: 'pass' });

      expect(authService.login).toHaveBeenCalledWith(
        mockUser,
        '10.0.0.1',
        'jest',
        undefined,
      );
    });
  });

  describe('me', () => {
    it('returns req.user', () => {
      const req = mockRequest();
      const result = controller.me(req);
      expect(result).toEqual(req.user);
    });
  });

  describe('requestReset', () => {
    it('delegates to authService and returns nothing (204)', async () => {
      authService.requestPasswordReset.mockResolvedValue(undefined);
      const result = await controller.requestReset({ email: 'x@x.com' });
      expect(authService.requestPasswordReset).toHaveBeenCalledWith('x@x.com');
      expect(result).toBeUndefined();
    });
  });
});
