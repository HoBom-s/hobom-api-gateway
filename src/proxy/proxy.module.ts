import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ProxyService } from "./service/proxy.service";
import { ProxyController } from "./controller/proxy.controller";
import { ProxyRouteConfig } from "./config/proxy-route.config";
import { HeaderBuilder } from "../shared/http/header.builder";
import { ResponseForwarderBuilder } from "../shared/http/response-forwarder.builder";
import { ErrorForwarderBuilder } from "../shared/http/error-forwarder.builder";
import { CircuitBreakerService } from "../shared/circuit-breaker/circuit-breaker.service";

@Module({
  imports: [
    HttpModule.register({
      timeout: 180_000,
    }),
  ],
  controllers: [ProxyController],
  providers: [
    ProxyRouteConfig,
    ProxyService,
    HeaderBuilder,
    ResponseForwarderBuilder,
    ErrorForwarderBuilder,
    CircuitBreakerService,
  ],
})
export class ProxyModule {}
