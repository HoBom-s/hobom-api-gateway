import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const traceId = req.headers["x-request-id"] || uuidv4();
    req["traceId"] = traceId;
    res.setHeader("X-Request-Id", traceId);

    next();
  }
}
