import { Controller, All, Req, Res, HttpStatus, Param } from "@nestjs/common";
import { Request, Response } from "express";
import { ProxyService } from "../service/proxy.service";
import { ProxyRouteConfig } from "../config/proxy-route.config";
import { EndPointUtil } from "../../shared/end-point/end-point.util";

@Controller(EndPointUtil.PREFIX)
export class ProxyController {
  constructor(
    private readonly proxyService: ProxyService,
    private readonly proxyRouteConfig: ProxyRouteConfig,
  ) {}

  @All("*path")
  public async hobomApiServer(
    @Param("path") _path: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const hostMap = this.proxyRouteConfig.getHostMap();
    const result = EndPointUtil.buildTargetUrl(req.originalUrl, hostMap);

    if (result == null) {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: `Unknown service in path: ${req.originalUrl}`,
      });
    }

    return this.proxyService.forward(req, res, result.url, result.serviceKey);
  }
}
