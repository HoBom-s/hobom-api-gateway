import { HeaderBuilder } from "./header.builder";
import { Request } from "express";

function makeRequest(
  headers: Record<string, string>,
  cookies: Record<string, string> = {},
): Request {
  return { headers, cookies } as unknown as Request;
}

describe("HeaderBuilder", () => {
  let builder: HeaderBuilder;

  beforeEach(() => {
    builder = new HeaderBuilder();
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

  it("accessToken cookie overrides existing authorization header", () => {
    const req = makeRequest(
      { authorization: "Bearer old-token" },
      { accessToken: "new-token" },
    );
    const result = builder.build(req);
    expect(result["authorization"]).toBe("Bearer new-token");
  });
});
