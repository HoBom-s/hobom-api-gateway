import { NestFactory } from "@nestjs/core";
import * as express from "express";
import * as cookieParser from "cookie-parser";
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

  app.enableCors({
    origin: [process.env.HOBOM_CLIENT_HOST],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "x-hobom-api-key",
      "Access-Control-Allow-Origin",
      "Access-Control-Allow-Credentials",
    ],
    credentials: true,
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
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
