import { ApiKeyAuthGuard } from "./api-key.guard";
import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

function makeContext(headers: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe("ApiKeyAuthGuard", () => {
  let guard: ApiKeyAuthGuard;
  const VALID_KEY = "test-api-key";

  beforeEach(() => {
    process.env.HOBOM_API_GATEWAY_KEY = VALID_KEY;
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    guard = new ApiKeyAuthGuard(reflector);
  });

  it("allows request with correct API key", () => {
    const ctx = makeContext({ "x-hobom-api-key": VALID_KEY });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("throws UnauthorizedException when API key is missing", () => {
    const ctx = makeContext({});
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it("throws UnauthorizedException when API key is wrong", () => {
    const ctx = makeContext({ "x-hobom-api-key": "wrong-key" });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it("bypasses auth check for @Public() routes", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(true),
    } as unknown as Reflector;
    const publicGuard = new ApiKeyAuthGuard(reflector);
    // No API key header, but should still pass
    const ctx = makeContext({});
    expect(publicGuard.canActivate(ctx)).toBe(true);
  });
});
