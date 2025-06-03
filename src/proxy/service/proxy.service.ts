import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { Request, Response } from "express";
import { catchError, firstValueFrom, tap } from "rxjs";
import { AxiosError } from "axios";
import { HeaderBuilder } from "../../shared/http/header.builder";
import { ResponseForwarderBuilder } from "../../shared/http/response-forwarder.builder";
import { ErrorForwarderBuilder } from "../../shared/http/error-forwarder.builder";

@Injectable()
export class ProxyService {
  constructor(
    private readonly httpService: HttpService,
    private readonly headerBuilder: HeaderBuilder,
    private readonly responseForwarderBuilder: ResponseForwarderBuilder,
    private readonly errorForwarderBuilder: ErrorForwarderBuilder,
  ) {}

  public async forward(req: Request, res: Response, url: string) {
    const headers = this.headerBuilder.build(req);

    await firstValueFrom(
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
          catchError((error: AxiosError) => {
            this.errorForwarderBuilder.build(error, res);
            return [];
          }),
        ),
    );
  }
}
