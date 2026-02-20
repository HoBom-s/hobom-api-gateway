import { EndPointUtil } from "./end-point.util";

const HOST_MAP = {
  "hobom-system-backend": "http://backend:8080/hobom-system-backend/api/v1",
  "hobom-internal": "http://internal:8081/hobom-internal/api/v1",
};

describe("EndPointUtil.buildTargetUrl", () => {
  it("routes to system-backend service", () => {
    const result = EndPointUtil.buildTargetUrl(
      "/hobom-api-gateway/hobom-system-backend/daily-todo",
      HOST_MAP,
    );
    expect(result).toEqual({
      serviceKey: "hobom-system-backend",
      url: "http://backend:8080/hobom-system-backend/api/v1/daily-todo",
    });
  });

  it("routes to internal service", () => {
    const result = EndPointUtil.buildTargetUrl(
      "/hobom-api-gateway/hobom-internal/settings",
      HOST_MAP,
    );
    expect(result).toEqual({
      serviceKey: "hobom-internal",
      url: "http://internal:8081/hobom-internal/api/v1/settings",
    });
  });

  it("handles nested paths", () => {
    const result = EndPointUtil.buildTargetUrl(
      "/hobom-api-gateway/hobom-system-backend/users/123/profile",
      HOST_MAP,
    );
    expect(result).toEqual({
      serviceKey: "hobom-system-backend",
      url: "http://backend:8080/hobom-system-backend/api/v1/users/123/profile",
    });
  });

  it("returns null for unknown service name", () => {
    const result = EndPointUtil.buildTargetUrl(
      "/hobom-api-gateway/unknown-service/path",
      HOST_MAP,
    );
    expect(result).toBeNull();
  });

  it("returns null when path has no segments after prefix", () => {
    const result = EndPointUtil.buildTargetUrl("/hobom-api-gateway/", HOST_MAP);
    expect(result).toBeNull();
  });

  it("returns null for empty path", () => {
    const result = EndPointUtil.buildTargetUrl("", HOST_MAP);
    expect(result).toBeNull();
  });

  it("handles path with no trailing segments (root of service)", () => {
    const result = EndPointUtil.buildTargetUrl(
      "/hobom-api-gateway/hobom-system-backend",
      HOST_MAP,
    );
    expect(result).toEqual({
      serviceKey: "hobom-system-backend",
      url: "http://backend:8080/hobom-system-backend/api/v1/",
    });
  });
});
