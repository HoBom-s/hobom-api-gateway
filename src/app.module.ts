import { MiddlewareConsumer, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ProxyModule } from "./proxy/proxy.module";
import { HealthModule } from "./health/health.module";
import { TraceContext } from "./shared/trace/trace-context";
import { TraceIdMiddleware } from "./shared/middlewares/trace-id.middleware";
import { TraceInterceptor } from "./shared/interceptors/trace.interceptors";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ProxyModule,
    HealthModule,
  ],
  providers: [TraceContext, TraceInterceptor],
  exports: [TraceContext, TraceInterceptor],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TraceIdMiddleware).forRoutes("*");
  }
}
