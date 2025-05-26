import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { RequestIdMiddleware } from "./shared/middlewares/request-id.middleware";
import { TraceInterceptor } from "./shared/interceptors/trace.interceptors";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(new RequestIdMiddleware().use);

  app.useGlobalInterceptors(new TraceInterceptor());

  await app.listen(process.env.HOBOM_API_GATEWAY_PORT ?? 8080);
}

bootstrap().then(() => console.log("HoBom API GATEWAY Listening 🦊🐻"));
