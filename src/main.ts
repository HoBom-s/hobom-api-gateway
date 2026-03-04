import { NestFactory } from "@nestjs/core";
import * as express from "express";
import * as cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { RequestIdMiddleware } from "./shared/middlewares/request-id.middleware";
import { TraceInterceptor } from "./shared/interceptors/trace.interceptors";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  process.on("SIGTERM", () => {
    app.close();
    process.exit(0);
  });

  // Reverse proxy 뒤에서 클라이언트 IP를 올바르게 식별 (X-Forwarded-For 신뢰)
  app.getHttpAdapter().getInstance().set("trust proxy", 1);

  app.use((req, res, next) => {
    if (req.originalUrl.includes("/scalar/")) {
      return helmet({
        contentSecurityPolicy: {
          directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": ["'self'", "https://cdn.jsdelivr.net"],
          },
        },
      })(req, res, next);
    }
    return helmet()(req, res, next);
  });

  app.enableCors({
    origin: [process.env.HOBOM_CLIENT_HOST],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "x-hobom-api-key",
    ],
    credentials: true,
  });

  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true, limit: "5mb" }));
  app.use(cookieParser());
  app.use(new RequestIdMiddleware().use);

  const traceInterceptor = app.get(TraceInterceptor);
  app.useGlobalInterceptors(traceInterceptor);

  await app.listen(
    process.env.HOBOM_API_GATEWAY_PORT || 8080,
    "0.0.0.0",
    () => {
      console.log(
        `HoBom API GATEWAY Listening 🦊🐻 PORT: ${process.env.HOBOM_API_GATEWAY_PORT}`,
      );
    },
  );
}

bootstrap();
