import { Injectable } from "@nestjs/common";
import { Request } from "express";

@Injectable()
export class HeaderBuilder {
  public build(req: Request): Record<string, string> {
    const headers = { ...req.headers };
    delete headers["host"];
    delete headers["content-length"];
    delete headers["transfer-encoding"];

    // 쿠키 기반 토큰은 Authorization 헤더가 없을 때만 적용한다.
    // 명시적으로 전달된 헤더가 쿠키보다 우선한다.
    const token = req.cookies?.["accessToken"];
    if (token != null && headers["authorization"] == null) {
      headers["authorization"] = `Bearer ${token}`;
    }

    return headers as Record<string, string>;
  }
}
