import { MiddlewareConsumer, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ProxyModule } from "./proxy/proxy.module";
import { HealthModule } from "./health/health.module";
import { TraceContext } from "./shared/trace/trace-context";
import { TraceIdMiddleware } from "./shared/middlewares/trace-id.middleware";
import { TraceInterceptor } from "./shared/interceptors/trace.interceptors";
import { ApiKeyAuthGuard } from "./shared/guards/api-key.guard";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: (config.get<number>("THROTTLE_TTL_SECONDS") ?? 60) * 1000,
          limit: config.get<number>("THROTTLE_LIMIT") ?? 100,
        },
      ],
    }),
    ProxyModule,
    HealthModule,
  ],
  providers: [
    TraceContext,
    TraceInterceptor,
    // 순서 중요: Rate Limit 먼저 적용 후 API Key 인증 수행
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: ApiKeyAuthGuard },
  ],
  exports: [TraceContext, TraceInterceptor],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TraceIdMiddleware).forRoutes("*");
  }
}
