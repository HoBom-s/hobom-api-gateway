import { Injectable } from "@nestjs/common";
import { Request, Response } from "express";
import { isReadable } from "stream";

@Injectable()
export class ResponseForwarderBuilder {
  public build(
    axiosResponse: {
      status: number;
      headers: Record<string, any>;
      data: any;
    },
    req: Request,
    res: Response,
  ) {
    for (const [key, value] of Object.entries(axiosResponse.headers)) {
      if (key.toLowerCase() === "set-cookie" && Array.isArray(value)) {
        value.forEach((cookie) => res.append("Set-Cookie", cookie));
      } else {
        res.setHeader(key, value as string);
      }
    }

    res.setHeader("access-control-allow-origin", req.headers.origin || "");
    res.status(axiosResponse.status);

    if (isReadable(axiosResponse.data)) {
      axiosResponse.data.pipe(res);
    } else {
      res.json(axiosResponse.data);
    }
  }
}
