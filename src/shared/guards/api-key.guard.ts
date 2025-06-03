import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const HOBOM_API_KEY = "x-hobom-api-key";

    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers[HOBOM_API_KEY];

    if (apiKey == null || apiKey !== process.env.HOBOM_API_GATEWAY_KEY) {
      throw new UnauthorizedException("API key is missing or invalid");
    }

    return true;
  }
}
