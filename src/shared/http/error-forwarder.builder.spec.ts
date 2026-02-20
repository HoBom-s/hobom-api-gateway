import { ErrorForwarderBuilder } from "./error-forwarder.builder";
import { Response } from "express";
import { AxiosError } from "axios";

function makeResponse(): jest.Mocked<Response> {
  const res: Partial<jest.Mocked<Response>> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as jest.Mocked<Response>;
}

function makeAxiosError(
  status?: number,
  data?: unknown,
  message = "request failed",
): AxiosError {
  const error = new AxiosError(message);
  if (status !== undefined) {
    error.response = {
      status,
      data,
      headers: {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config: { headers: {} } as any,
      statusText: String(status),
    };
  }
  return error;
}

describe("ErrorForwarderBuilder", () => {
  let builder: ErrorForwarderBuilder;

  beforeEach(() => {
    builder = new ErrorForwarderBuilder();
  });

  it("forwards upstream status and data", () => {
    const res = makeResponse();
    builder.build(makeAxiosError(404, { message: "Not found" }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Not found" });
  });

  it("returns 500 when no upstream response is present", () => {
    const res = makeResponse();
    builder.build(makeAxiosError(undefined, undefined, "ECONNREFUSED"), res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith("Internal Server Error");
  });

  it("returns 500 for 5xx upstream errors", () => {
    const res = makeResponse();
    builder.build(makeAxiosError(503, "Service Unavailable"), res);
    expect(res.status).toHaveBeenCalledWith(503);
  });
});
