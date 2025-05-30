import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ProxyService } from "./service/proxy.service";
import { ProxyController } from "./controller/proxy.controller";

@Module({
  imports: [
    HttpModule.register({
      timeout: 3000,
    }),
  ],
  controllers: [ProxyController],
  providers: [ProxyService],
})
export class ProxyModule {}
