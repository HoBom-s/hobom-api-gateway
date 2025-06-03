import { Injectable } from "@nestjs/common";
import { Request } from "express";

@Injectable()
export class HeaderBuilder {
  public build(req: Request): Record<string, string> {
    const headers = { ...req.headers };
    delete headers["host"];
    delete headers["content-length"];
    delete headers["transfer-encoding"];

    const token = req.cookies?.["accessToken"];
    if (token != null) {
      headers["authorization"] = `Bearer ${token}`;
    }

    return headers as Record<string, string>;
  }
}
