import { Injectable, NestMiddleware } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { Request, Response, NextFunction } from "express";
import { TraceContext } from "../../shared/trace/trace-context";
import { TRACE_HOBOM_HEADER_KEY } from "../trace/trace-header.constant";

@Injectable()
export class TraceIdMiddleware implements NestMiddleware {
  constructor(private readonly traceContext: TraceContext) {}

  use(req: Request, res: Response, next: NextFunction) {
    const traceId = (req.headers[TRACE_HOBOM_HEADER_KEY] as string) ?? uuidv4();
    req.headers[TRACE_HOBOM_HEADER_KEY] = traceId;
    res.setHeader(TRACE_HOBOM_HEADER_KEY, traceId);

    this.traceContext.run(traceId, () => {
      next();
    });
  }
}
