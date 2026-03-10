import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

/**
 * Global exception filter — returns RFC 7807 Problem Details format.
 * Strips internal error details from 5xx responses in production.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const traceId = randomUUID();
    const isProduction = process.env.NODE_ENV === 'production';

    let status: number;
    let title: string;
    let detail: string | undefined;
    let errors: Record<string, string>[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const res = exceptionResponse as any;
        title = res.error || exception.message;
        detail = res.message;
        errors = Array.isArray(res.message)
          ? res.message.map((msg: string) => ({ message: msg }))
          : undefined;
      } else {
        title = exception.message;
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      title = 'Internal Server Error';
      detail = isProduction
        ? 'An unexpected error occurred. Please try again.'
        : String(exception);

      this.logger.error(
        `Unhandled exception [${traceId}]: ${exception}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      type: `https://carecore.co.uk/errors/${title.toLowerCase().replace(/\s+/g, '-')}`,
      title,
      status,
      detail,
      errors,
      trace_id: traceId,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
