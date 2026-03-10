import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Logs all write operations to the audit log.
 * Read operations on special-category data (residents, medications)
 * are logged via the GDPR access log middleware in those specific services.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, homeId, ip } = request;

    if (!WRITE_METHODS.has(method) || !user) {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          // Audit entry emitted via event bus — async, non-blocking
          // AuditService listens for 'audit.write' events
          request.emitAuditEvent?.({
            userId: user.id,
            homeId,
            organisationId: user.organisationId,
            ipAddress: ip,
            method,
            url,
            durationMs: Date.now() - startTime,
          });
        },
      }),
    );
  }
}
