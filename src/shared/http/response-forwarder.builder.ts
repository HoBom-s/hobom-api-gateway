import { Injectable } from "@nestjs/common";
import { Request, Response } from "express";
import { AxiosResponse } from "axios";
import { isReadable } from "stream";

@Injectable()
export class ResponseForwarderBuilder {
  public build(axiosResponse: AxiosResponse, req: Request, res: Response) {
    for (const [key, value] of Object.entries(axiosResponse.headers)) {
      if (key.toLowerCase() === "set-cookie" && Array.isArray(value)) {
        value.forEach((cookie: string) => res.append("Set-Cookie", cookie));
      } else if (typeof value === "string") {
        res.setHeader(key, value);
      }
    }

    res.setHeader("access-control-allow-origin", req.headers.origin ?? "");
    res.setHeader("access-control-allow-credentials", "true");
    res.status(axiosResponse.status);

    if (isReadable(axiosResponse.data)) {
      (axiosResponse.data as NodeJS.ReadableStream).pipe(res);
    } else {
      res.json(axiosResponse.data);
    }
  }
}
