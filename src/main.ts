import { NestFactory } from "@nestjs/core";
import * as express from "express";
import * as cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { RequestIdMiddleware } from "./shared/middlewares/request-id.middleware";
import { TraceInterceptor } from "./shared/interceptors/trace.interceptors";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      process.env.HOBOM_CLIENT_HOST_LOCAL,
      process.env.HOBOM_CLIENT_HOST_LIVE,
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "Access-Control-Allow-Origin",
      "Access-Control-Allow-Credentials",
    ],
    credentials: true,
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(new RequestIdMiddleware().use);

  app.useGlobalInterceptors(new TraceInterceptor());

  await app.listen(process.env.PORT || 8080, "0.0.0.0", () => {
    console.log(`HoBom API GATEWAY Listening 🦊🐻 PORT: ${process.env.PORT}`);
  });
}

bootstrap();
