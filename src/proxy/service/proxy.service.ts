import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { Request, Response } from "express";
import { firstValueFrom, tap } from "rxjs";
import { AxiosError } from "axios";
import { HeaderBuilder } from "../../shared/http/header.builder";
import { ResponseForwarderBuilder } from "../../shared/http/response-forwarder.builder";
import { ErrorForwarderBuilder } from "../../shared/http/error-forwarder.builder";
import {
  CircuitBreakerService,
  CircuitOpenError,
} from "../../shared/circuit-breaker/circuit-breaker.service";

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly headerBuilder: HeaderBuilder,
    private readonly responseForwarderBuilder: ResponseForwarderBuilder,
    private readonly errorForwarderBuilder: ErrorForwarderBuilder,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  public async forward(
    req: Request,
    res: Response,
    url: string,
    serviceKey: string,
  ): Promise<void> {
    const headers = this.headerBuilder.build(req, serviceKey);

    try {
      await this.circuitBreakerService.fire(serviceKey, () =>
        firstValueFrom(
          this.httpService
            .request({
              url,
              method: req.method,
              headers,
              data: req.body,
              responseType: "stream",
              validateStatus: () => true,
            })
            .pipe(
              tap((axiosResponse) => {
                this.responseForwarderBuilder.build(axiosResponse, req, res);
                if (axiosResponse.status >= 500) {
                  this.circuitBreakerService.recordFailure(serviceKey);
                }
              }),
            ),
        ),
      );
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        this.errorForwarderBuilder.build(error, res);
      } else if (error instanceof CircuitOpenError) {
        this.logger.warn(`[Proxy] Circuit OPEN — ${serviceKey}`);
        res
          .status(503)
          .json({ message: "Service temporarily unavailable. Please retry." });
      } else {
        this.logger.error(
          `[Proxy] Unexpected error for ${serviceKey}: ${(error as Error)?.message ?? String(error)}`,
          (error as Error)?.stack,
        );
        res
          .status(503)
          .json({ message: "Service temporarily unavailable. Please retry." });
      }
    }
  }
}
