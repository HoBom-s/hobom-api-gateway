import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ProxyModule } from "./proxy/proxy.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ProxyModule,
    HealthModule,
  ],
})
export class AppModule {}
