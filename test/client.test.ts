import { afterEach, describe, expect, it, vi } from "vitest";
import { AssetPulseClient } from "../src/index";
import { HostUnitsResource } from "../src/resources/hostUnits";
import { PartsResource } from "../src/resources/parts";
import { LifecycleEventsResource } from "../src/resources/lifecycleEvents";

const baseUrl = "https://api.example.com/api/v1";
const token = "test-token";
const companyId = 42;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AssetPulseClient", () => {
  it("exposes hostUnits/parts/lifecycleEvents as instances of the right resource classes", () => {
    const client = new AssetPulseClient({ token, companyId, baseUrl });

    expect(client.hostUnits).toBeInstanceOf(HostUnitsResource);
    expect(client.parts).toBeInstanceOf(PartsResource);
    expect(client.lifecycleEvents).toBeInstanceOf(LifecycleEventsResource);
  });

  it("throws synchronously when token is missing/empty, before any fetch call", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(() => new AssetPulseClient({ token: "", companyId, baseUrl })).toThrow(
      "AssetPulse API token is required"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws synchronously when companyId is missing/invalid, before any fetch call", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    // @ts-expect-error deliberately omitting companyId to assert the validation error
    expect(() => new AssetPulseClient({ token, baseUrl })).toThrow(/companyId/);
    expect(() => new AssetPulseClient({ token, companyId: 0, baseUrl })).toThrow(/companyId/);
    expect(() => new AssetPulseClient({ token, companyId: -1, baseUrl })).toThrow(/companyId/);
    // @ts-expect-error deliberately wrong type to assert the validation error
    expect(() => new AssetPulseClient({ token, companyId: "42", baseUrl })).toThrow(/companyId/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("threads token and companyId from the constructor into a resource request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new AssetPulseClient({ token, companyId, baseUrl });

    await client.hostUnits.find(1);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/companies/${companyId}/host_units/1`,
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: `Bearer ${token}` }),
      })
    );
  });

  it("honors an explicit baseUrl passed to the constructor", async () => {
    const customBaseUrl = "https://custom.example.com/api/v1";
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);
    const client = new AssetPulseClient({ token, companyId, baseUrl: customBaseUrl });

    await client.parts.list();

    expect(fetchMock).toHaveBeenCalledWith(
      `${customBaseUrl}/companies/${companyId}/parts`,
      expect.objectContaining({ method: "GET" })
    );
  });
});
