import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_LOCAL_URL, DEFAULT_PRODUCTION_URL, resolveBaseUrl } from "../src/env";

const originalEnv = { ...process.env };

afterEach(() => {
  // @ts-expect-error -- clearing the window stub between tests
  delete globalThis.window;
  process.env = { ...originalEnv };
});

describe("resolveBaseUrl", () => {
  it("prioritizes the explicit baseUrl above everything else", () => {
    process.env.NODE_ENV = "development";
    expect(resolveBaseUrl("https://explicit.example.com/api/v1")).toBe(
      "https://explicit.example.com/api/v1"
    );
  });

  it("uses ASSETPULSE_API_URL on the server when there's no window", () => {
    process.env.ASSETPULSE_API_URL = "https://server-env.example.com/api/v1";
    expect(resolveBaseUrl()).toBe("https://server-env.example.com/api/v1");
  });

  it("uses NEXT_PUBLIC_ASSETPULSE_API_URL in the browser", () => {
    // @ts-expect-error -- minimal window stub to simulate the browser
    globalThis.window = { location: { hostname: "mysite.com" } };
    process.env.NEXT_PUBLIC_ASSETPULSE_API_URL = "https://client-env.example.com/api/v1";
    expect(resolveBaseUrl()).toBe("https://client-env.example.com/api/v1");
  });

  it("detects localhost in the browser and uses the local URL", () => {
    // @ts-expect-error -- minimal window stub
    globalThis.window = { location: { hostname: "localhost" } };
    expect(resolveBaseUrl()).toBe(DEFAULT_LOCAL_URL);
  });

  it("detects 127.0.0.1 in the browser and uses the local URL", () => {
    // @ts-expect-error -- minimal window stub
    globalThis.window = { location: { hostname: "127.0.0.1" } };
    expect(resolveBaseUrl()).toBe(DEFAULT_LOCAL_URL);
  });

  it("uses the local URL on the server when NODE_ENV=development", () => {
    process.env.NODE_ENV = "development";
    expect(resolveBaseUrl()).toBe(DEFAULT_LOCAL_URL);
  });

  it("falls back to the production URL outside localhost/development", () => {
    process.env.NODE_ENV = "production";
    // @ts-expect-error -- minimal window stub
    globalThis.window = { location: { hostname: "app.assetpulse.com" } };
    expect(resolveBaseUrl()).toBe(DEFAULT_PRODUCTION_URL);
  });
});
