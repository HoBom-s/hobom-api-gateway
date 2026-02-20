import { ProxyRouteConfig } from "./proxy-route.config";
import { ConfigService } from "@nestjs/config";

function makeConfig(values: Record<string, string | undefined>): ConfigService {
  return {
    get: <T>(key: string) => values[key] as T,
  } as unknown as ConfigService;
}

describe("ProxyRouteConfig", () => {
  it("builds host map from static env vars", () => {
    const config = makeConfig({
      HOBOM_API_SERVER_HOST: "http://backend:8080/api",
      HOBOM_INTERNAL_API_SERVER_HOST: "http://internal:8081/api",
    });
    const routeConfig = new ProxyRouteConfig(config);
    const map = routeConfig.getHostMap();
    expect(map["hobom-system-backend"]).toBe("http://backend:8080/api");
    expect(map["hobom-internal"]).toBe("http://internal:8081/api");
  });

  it("omits entry when env var is undefined", () => {
    const config = makeConfig({
      HOBOM_API_SERVER_HOST: "http://backend:8080/api",
    });
    const routeConfig = new ProxyRouteConfig(config);
    const map = routeConfig.getHostMap();
    expect(map["hobom-system-backend"]).toBe("http://backend:8080/api");
    expect(map["hobom-internal"]).toBeUndefined();
  });

  it("parses PROXY_ROUTES for dynamic service registration", () => {
    const config = makeConfig({
      PROXY_ROUTES:
        "new-service=http://new:9000/api,another=http://other:9001/api",
    });
    const routeConfig = new ProxyRouteConfig(config);
    const map = routeConfig.getHostMap();
    expect(map["new-service"]).toBe("http://new:9000/api");
    expect(map["another"]).toBe("http://other:9001/api");
  });

  it("PROXY_ROUTES entries override static env vars", () => {
    const config = makeConfig({
      HOBOM_API_SERVER_HOST: "http://old:8080/api",
      PROXY_ROUTES: "hobom-system-backend=http://new:9090/api",
    });
    const routeConfig = new ProxyRouteConfig(config);
    const map = routeConfig.getHostMap();
    expect(map["hobom-system-backend"]).toBe("http://new:9090/api");
  });

  it("ignores malformed PROXY_ROUTES entries", () => {
    const config = makeConfig({
      PROXY_ROUTES: "valid=http://host:9000/api,no-equals-sign,=emptykey",
    });
    const routeConfig = new ProxyRouteConfig(config);
    const map = routeConfig.getHostMap();
    expect(map["valid"]).toBe("http://host:9000/api");
    expect(Object.keys(map)).toHaveLength(1);
  });
});
