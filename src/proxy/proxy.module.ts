import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ProxyService } from "./service/proxy.service";
import { ProxyController } from "./controller/proxy.controller";
import { HeaderBuilder } from "../shared/http/header.builder";
import { ResponseForwarderBuilder } from "../shared/http/response-forwarder.builder";
import { ErrorForwarderBuilder } from "../shared/http/error-forwarder.builder";

@Module({
  imports: [
    HttpModule.register({
      timeout: 3000,
    }),
  ],
  controllers: [ProxyController],
  providers: [
    ProxyService,
    HeaderBuilder,
    ResponseForwarderBuilder,
    ErrorForwarderBuilder,
  ],
})
export class ProxyModule {}
