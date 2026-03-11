import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestUser } from '../../modules/auth/strategies/jwt.strategy';

/** Injects the authenticated user from the JWT payload into a controller parameter */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
