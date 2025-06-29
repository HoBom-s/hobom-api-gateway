import { AsyncLocalStorage } from "async_hooks";
import { Injectable } from "@nestjs/common";

interface TraceStore {
  traceId: string;
}

@Injectable()
export class TraceContext {
  private readonly asyncLocalStorage = new AsyncLocalStorage<TraceStore>();

  run(traceId: string, callback: () => void) {
    this.asyncLocalStorage.run({ traceId }, callback);
  }

  getTraceId(): string {
    return this.asyncLocalStorage.getStore()?.traceId ?? "";
  }
}
