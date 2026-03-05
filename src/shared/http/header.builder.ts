import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";

@Injectable()
export class HeaderBuilder {
  private readonly serviceApiKeys: Record<string, string>;

  constructor(private readonly configService: ConfigService) {
    this.serviceApiKeys = this.buildServiceApiKeys();
  }

  /**
   * SERVICE_API_KEYS 환경변수에서 서비스별 API Key를 파싱한다.
   * 형식: SERVICE_API_KEYS=서비스명=키,서비스명2=키2
   */
  private buildServiceApiKeys(): Record<string, string> {
    const map: Record<string, string> = {};
    const raw = this.configService.get<string>("SERVICE_API_KEYS");
    if (raw) {
      for (const entry of raw.split(",")) {
        const idx = entry.indexOf("=");
        if (idx === -1) continue;
        const service = entry.slice(0, idx).trim();
        const key = entry.slice(idx + 1).trim();
        if (service && key) {
          map[service] = key;
        }
      }
    }
    return map;
  }

  private extractNicknameFromToken(
    authorization: string | undefined,
  ): string | null {
    if (!authorization?.startsWith("Bearer ")) return null;
    try {
      const token = authorization.slice(7);
      const payload = JSON.parse(
        Buffer.from(token.split(".")[1], "base64url").toString(),
      );
      return payload.sub ?? null;
    } catch {
      return null;
    }
  }

  public build(req: Request, serviceKey?: string): Record<string, string> {
    const headers = { ...req.headers };
    delete headers["host"];
    delete headers["content-length"];
    delete headers["transfer-encoding"];
    // 클라이언트가 위조할 수 있는 프록시 관련 헤더 제거
    delete headers["x-forwarded-for"];
    delete headers["x-forwarded-host"];
    delete headers["x-forwarded-proto"];
    delete headers["x-real-ip"];

    // 쿠키 기반 토큰은 Authorization 헤더가 없을 때만 적용한다.
    // 명시적으로 전달된 헤더가 쿠키보다 우선한다.
    const token = req.cookies?.["accessToken"];
    if (token != null && headers["authorization"] == null) {
      headers["authorization"] = `Bearer ${token}`;
    }

    if (serviceKey && this.serviceApiKeys[serviceKey]) {
      headers["x-api-key"] = this.serviceApiKeys[serviceKey];
    }

    // JWT payload에서 nickname(sub)을 추출하여 X-User-Nickname 헤더로 주입한다.
    const nickname = this.extractNicknameFromToken(
      headers["authorization"] as string | undefined,
    );
    if (nickname) {
      headers["x-user-nickname"] = nickname;
    }

    return headers as Record<string, string>;
  }
}
