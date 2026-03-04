import { HeaderBuilder } from "./header.builder";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";

function makeRequest(
  headers: Record<string, string>,
  cookies: Record<string, string> = {},
): Request {
  return { headers, cookies } as unknown as Request;
}

function makeConfigService(serviceApiKeys?: string): ConfigService {
  return {
    get: (key: string) =>
      key === "SERVICE_API_KEYS" ? serviceApiKeys : undefined,
  } as unknown as ConfigService;
}

describe("HeaderBuilder", () => {
  let builder: HeaderBuilder;

  beforeEach(() => {
    builder = new HeaderBuilder(makeConfigService());
  });

  it("copies headers from request", () => {
    const req = makeRequest({ "content-type": "application/json" });
    const result = builder.build(req);
    expect(result["content-type"]).toBe("application/json");
  });

  it("removes hop-by-hop headers", () => {
    const req = makeRequest({
      "content-type": "application/json",
      host: "localhost",
      "content-length": "42",
      "transfer-encoding": "chunked",
    });
    const result = builder.build(req);
    expect(result["host"]).toBeUndefined();
    expect(result["content-length"]).toBeUndefined();
    expect(result["transfer-encoding"]).toBeUndefined();
  });

  it("removes spoofable proxy headers", () => {
    const req = makeRequest({
      "content-type": "application/json",
      "x-forwarded-for": "1.2.3.4",
      "x-forwarded-host": "evil.com",
      "x-forwarded-proto": "http",
      "x-real-ip": "5.6.7.8",
    });
    const result = builder.build(req);
    expect(result["content-type"]).toBe("application/json");
    expect(result["x-forwarded-for"]).toBeUndefined();
    expect(result["x-forwarded-host"]).toBeUndefined();
    expect(result["x-forwarded-proto"]).toBeUndefined();
    expect(result["x-real-ip"]).toBeUndefined();
  });

  it("injects Authorization header from accessToken cookie", () => {
    const req = makeRequest({}, { accessToken: "my-token" });
    const result = builder.build(req);
    expect(result["authorization"]).toBe("Bearer my-token");
  });

  it("does not set Authorization when accessToken cookie is absent", () => {
    const req = makeRequest({ "x-custom": "value" });
    const result = builder.build(req);
    expect(result["authorization"]).toBeUndefined();
  });

  it("preserves explicit Authorization header over cookie", () => {
    const req = makeRequest(
      { authorization: "Bearer old-token" },
      { accessToken: "new-token" },
    );
    const result = builder.build(req);
    expect(result["authorization"]).toBe("Bearer old-token");
  });

  it("injects x-api-key when serviceKey matches SERVICE_API_KEYS", () => {
    const b = new HeaderBuilder(
      makeConfigService("backend=secret123,internal=key456"),
    );
    const req = makeRequest({ "content-type": "application/json" });
    const result = b.build(req, "backend");
    expect(result["x-api-key"]).toBe("secret123");
  });

  it("does not inject x-api-key when serviceKey has no matching key", () => {
    const b = new HeaderBuilder(makeConfigService("backend=secret123"));
    const req = makeRequest({ "content-type": "application/json" });
    const result = b.build(req, "unknown");
    expect(result["x-api-key"]).toBeUndefined();
  });
});
