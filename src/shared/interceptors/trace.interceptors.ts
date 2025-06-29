import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from "@nestjs/common";
import { tap } from "rxjs";
import { TraceContext } from "../trace/trace-context";

@Injectable()
export class TraceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TraceInterceptor.name);

  constructor(private readonly traceContext: TraceContext) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const url = req.originalUrl;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const traceId = this.traceContext.getTraceId();

        this.logger.log(`[${traceId}] ${method} ${url} - ${duration}ms`);
      }),
    );
  }
}
