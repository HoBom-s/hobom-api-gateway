import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { Request, Response } from "express";
import { firstValueFrom } from "rxjs";

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  constructor(private readonly httpService: HttpService) {}

  public async forward(req: Request, res: Response, url: string) {
    try {
      const headers = { ...req.headers };
      delete headers["host"];

      const axiosResponse = await firstValueFrom(
        this.httpService.request({
          url: url,
          method: req.method,
          headers: headers,
          data: req.body,
          responseType: "stream",
        }),
      );

      res.status(axiosResponse.status);
      axiosResponse.data.pipe(res);
    } catch (error: any) {
      res.status(error?.response?.status || 500).json({
        message: "유효한 서버 정보가 없어요.",
        error: error.message,
      });
    }
  }
}
