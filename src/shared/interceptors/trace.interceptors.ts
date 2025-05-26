import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from "@nestjs/common";
import { tap } from "rxjs";

@Injectable()
export class TraceInterceptor implements NestInterceptor {
  private readonly logger = new Logger("Trace");

  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    const traceId = req["traceId"] || "N/A";
    const method = req.method;
    const url = req.originalUrl;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        this.logger.log(`[${traceId}] ${method} ${url} - ${duration}ms`);
      }),
    );
  }
}
