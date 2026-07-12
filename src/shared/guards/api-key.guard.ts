import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { timingSafeEqual } from "crypto";
import { Request } from "express";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

const API_KEY_HEADER = "x-hobom-api-key";

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyAuthGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    if (this.isPublicPath(request.originalUrl)) {
      return true;
    }

    const apiKey = request.headers[API_KEY_HEADER];
    const expected = process.env.HOBOM_API_GATEWAY_KEY;

    if (
      apiKey == null ||
      expected == null ||
      !this.safeEqual(String(apiKey), expected)
    ) {
      this.logger.warn(
        `[Auth] Invalid API key — ${request.method} ${request.originalUrl} from ${request.ip}`,
      );
      throw new UnauthorizedException("API key is missing or invalid");
    }

    return true;
  }

  private static readonly PUBLIC_PATH_PATTERNS = [
    /\/scalar\//,
    /\/openapi\//,
    /\/api-docs/,
  ];

  private isPublicPath(url: string): boolean {
    return ApiKeyAuthGuard.PUBLIC_PATH_PATTERNS.some((p) => p.test(url));
  }

  /** 타이밍 공격 방지를 위한 상수 시간 비교 */
  private safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  }
}
