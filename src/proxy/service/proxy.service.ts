import { HttpException, Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { Request, Response } from "express";
import { firstValueFrom } from "rxjs";
import { isReadable } from "stream";

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  constructor(private readonly httpService: HttpService) {
    this.httpService.axiosRef.interceptors.request.use((config) => {
      return config;
    });

    this.httpService.axiosRef.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        return Promise.reject(error);
      },
    );
  }

  public async forward(req: Request, res: Response, url: string) {
    try {
      const headers = { ...req.headers };
      delete headers["host"];
      delete headers["content-length"];
      delete headers["transfer-encoding"];

      const token = req.cookies["accessToken"];
      if (token != null) {
        headers["authorization"] = `Bearer ${token}`;
      }

      const axiosResponse = await firstValueFrom(
        this.httpService.request({
          url,
          method: req.method,
          headers,
          data: req.body,
        }),
      );

      Object.entries(axiosResponse.headers).forEach(([key, value]) => {
        if (key.toLowerCase() === "set-cookie" && Array.isArray(value)) {
          value.forEach((cookie) => {
            res.append("Set-Cookie", cookie);
          });
        } else {
          res.setHeader(key, value as string);
        }
      });
      res.setHeader("access-control-allow-origin", req.headers.origin || "");

      res.status(axiosResponse.status);
      if (isReadable(axiosResponse.data)) {
        axiosResponse.data.pipe(res);
      } else {
        res.json(axiosResponse.data);
      }
    } catch (error) {
      throw new HttpException(
        error.response?.data || "Internal Server Error",
        error.response?.status || 500,
      );
    }
  }
}
