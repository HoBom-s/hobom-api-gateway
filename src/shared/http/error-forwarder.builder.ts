import { Injectable, Logger } from "@nestjs/common";
import { Response } from "express";
import { AxiosError } from "axios";

@Injectable()
export class ErrorForwarderBuilder {
  private readonly logger = new Logger(ErrorForwarderBuilder.name);

  public build(error: AxiosError, res: Response) {
    const status = error.response?.status || 500;
    const data = error.response?.data || "Internal Server Error";

    this.logger.warn(`[Proxy Error] ${status} ${error.message}`);
    res.status(status).json(data);
  }
}
