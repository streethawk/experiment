import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

export interface RefreshJwtPayload {
  sub: string;       // userId
  jti: string;       // refresh token DB record id
  type: 'refresh';
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private readonly config: ConfigService) {
    super({
      // Accept from Authorization header OR request body (for mobile clients)
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => req.body?.refresh_token ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('app.jwt.refreshSecret'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: RefreshJwtPayload) {
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Raw token is needed for rotation — attach to request for use in service
    const rawToken =
      ExtractJwt.fromAuthHeaderAsBearerToken()(req) ?? req.body?.refresh_token;

    return { userId: payload.sub, jti: payload.jti, rawToken };
  }
}
