import { Injectable } from "@nestjs/common";
import { Request, Response } from "express";
import { AxiosResponse } from "axios";
import { isReadable } from "stream";

@Injectable()
export class ResponseForwarderBuilder {
  public build(axiosResponse: AxiosResponse, req: Request, res: Response) {
    for (const [key, value] of Object.entries(axiosResponse.headers)) {
      // 업스트림의 CORS 헤더를 무시한다 — CORS는 게이트웨이(main.ts)에서 관리
      if (key.toLowerCase().startsWith("access-control-")) continue;

      if (key.toLowerCase() === "set-cookie" && Array.isArray(value)) {
        value.forEach((cookie: string) => res.append("Set-Cookie", cookie));
      } else if (typeof value === "string") {
        res.setHeader(key, value);
      }
    }

    res.status(axiosResponse.status);

    if (isReadable(axiosResponse.data)) {
      (axiosResponse.data as NodeJS.ReadableStream).pipe(res);
    } else {
      res.json(axiosResponse.data);
    }
  }
}
