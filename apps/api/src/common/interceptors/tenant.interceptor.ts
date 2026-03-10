import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Extracts tenant context (home_id, org_id) from JWT claims and request headers,
 * attaches to request object for use in controllers and services.
 * The database module reads these to set PostgreSQL session variables for RLS.
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user) {
      // Home ID from header (staff selecting active home) or JWT claim
      request.homeId =
        request.headers['x-home-id'] ||
        user.homeId ||
        (user.homeIds?.[0] ?? null);

      request.organisationId =
        request.headers['x-organisation-id'] ||
        user.organisationId ||
        null;
    }

    return next.handle();
  }
}
