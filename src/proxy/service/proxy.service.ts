import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { Request, Response } from "express";
import { firstValueFrom, tap } from "rxjs";
import { AxiosError } from "axios";
import { HeaderBuilder } from "../../shared/http/header.builder";
import { ResponseForwarderBuilder } from "../../shared/http/response-forwarder.builder";
import { ErrorForwarderBuilder } from "../../shared/http/error-forwarder.builder";
import { CircuitBreakerService } from "../../shared/circuit-breaker/circuit-breaker.service";

@Injectable()
export class ProxyService {
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
    const headers = this.headerBuilder.build(req);

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
              }),
            ),
        ),
      );
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        this.errorForwarderBuilder.build(error, res);
      } else {
        // Circuit breaker open or unexpected error
        res
          .status(503)
          .json({ message: "Service temporarily unavailable. Please retry." });
      }
    }
  }
}
