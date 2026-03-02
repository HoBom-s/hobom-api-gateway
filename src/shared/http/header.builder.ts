import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";

@Injectable()
export class HeaderBuilder {
  private readonly serviceApiKeys: Record<string, string>;

  constructor(private readonly configService: ConfigService) {
    this.serviceApiKeys = {
      "hobom-internal":
        this.configService.get<string>("HOBOM_INTERNAL_API_KEY") ?? "",
    };
  }

  public build(
    req: Request,
    serviceKey?: string,
  ): Record<string, string> {
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

    return headers as Record<string, string>;
  }
}
