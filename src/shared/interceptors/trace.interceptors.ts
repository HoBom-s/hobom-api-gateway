import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from "@nestjs/common";
import { tap } from "rxjs";
import { Request, Response } from "express";
import { TraceContext } from "../trace/trace-context";

@Injectable()
export class TraceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TraceInterceptor.name);

  constructor(private readonly traceContext: TraceContext) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const { method, originalUrl: url } = req;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const traceId = this.traceContext.getTraceId();
          const duration = Date.now() - startTime;
          this.logger.log(
            `[${traceId}] ${method} ${url} ${res.statusCode} - ${duration}ms`,
          );
        },
        error: (err: Error) => {
          const traceId = this.traceContext.getTraceId();
          const duration = Date.now() - startTime;
          this.logger.error(
            `[${traceId}] ${method} ${url} ERROR - ${duration}ms — ${err.message}`,
          );
        },
      }),
    );
  }
}
