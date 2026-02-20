import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * 프록시 라우팅에 사용할 업스트림 호스트 맵을 관리한다.
 *
 * 정적 서비스는 개별 환경 변수로 설정한다.
 * (HOBOM_API_SERVER_HOST, HOBOM_INTERNAL_API_SERVER_HOST)
 *
 * 코드 변경 없이 런타임에 서비스를 추가하려면 PROXY_ROUTES를 사용한다.
 * 형식: PROXY_ROUTES=서비스명=http://host/api,다른서비스=http://host2/api
 */
@Injectable()
export class ProxyRouteConfig {
  private readonly hostMap: Record<string, string>;

  constructor(private readonly configService: ConfigService) {
    this.hostMap = this.buildHostMap();
  }

  /** @returns 서비스명 → 업스트림 호스트 URL 맵 (읽기 전용) */
  getHostMap(): Readonly<Record<string, string>> {
    return this.hostMap;
  }

  private buildHostMap(): Record<string, string> {
    const map: Record<string, string> = {};

    const systemBackend = this.configService.get<string>(
      "HOBOM_API_SERVER_HOST",
    );
    if (systemBackend) {
      map["hobom-system-backend"] = systemBackend;
    }

    const internal = this.configService.get<string>(
      "HOBOM_INTERNAL_API_SERVER_HOST",
    );
    if (internal) {
      map["hobom-internal"] = internal;
    }

    const dynamicRoutes = this.configService.get<string>("PROXY_ROUTES");
    if (dynamicRoutes) {
      for (const entry of dynamicRoutes.split(",")) {
        const separatorIndex = entry.indexOf("=");
        if (separatorIndex === -1) continue;
        const service = entry.slice(0, separatorIndex).trim();
        const host = entry.slice(separatorIndex + 1).trim();
        if (service && host) {
          map[service] = host;
        }
      }
    }

    return map;
  }
}
