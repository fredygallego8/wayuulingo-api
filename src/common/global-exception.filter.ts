import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponseDto } from './error-response.dto';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'InternalServerErrorException';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        error = responseObj.error || error;
      }
    } else {
      this.logger.error(
        `Unhandled exception: ${exception}`,
        exception instanceof Error ? exception.stack : '',
      );
    }

    const errorResponse: ErrorResponseDto = {
      message,
      statusCode: status,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    this.logger.error(
      `HTTP ${status} Error: ${message} - ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : '',
    );

    response.status(status).json(errorResponse);
  }
}
