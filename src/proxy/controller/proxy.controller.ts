import { Controller, All, Req, Res, HttpStatus, Param } from "@nestjs/common";
import { Request, Response } from "express";
import { ProxyService } from "../service/proxy.service";
import { EndPointUtil } from "../../shared/end-point/end-point.util";

@Controller(EndPointUtil.PREFIX)
export class ProxyController {
  private readonly hostMap: Record<string, string> = {
    "hobom-system-backend": String(process.env.HOBOM_API_SERVER_HOST),
  };

  constructor(private readonly proxyService: ProxyService) {}

  @All("*path")
  public async hobomApiServer(
    @Param("path") path: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const targetUrl = EndPointUtil.buildTargetUrl(
      req.originalUrl,
      this.hostMap,
    );

    if (targetUrl == null) {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: `Unknown service in path: ${req.originalUrl}`,
      });
    }
    return this.proxyService.forward(req, res, targetUrl);
  }
}
