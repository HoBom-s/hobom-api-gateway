import { Controller, Get } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { Public } from "../../shared/decorators/public.decorator";

@Public()
@SkipThrottle()
@Controller("health")
export class HealthController {
  @Get("")
  check() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
