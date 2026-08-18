import { afterEach, describe, expect, it, vi } from "vitest";
import { AssetPulseApiError, createHttpClient } from "../src/http";

const baseUrl = "https://api.example.com/api/v1";
const token = "test-token";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createHttpClient", () => {
  it("sends authenticated GET requests to baseUrl + path and returns parsed JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "host-1" }));
    vi.stubGlobal("fetch", fetchMock);

    const client = createHttpClient({ token, baseUrl });

    await expect(client.get("/host_units/host-1")).resolves.toEqual({ id: "host-1" });
    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/host_units/host-1`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: undefined,
    });
  });

  it("sends authenticated POST requests with a JSON body and returns parsed JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "part-1" }));
    vi.stubGlobal("fetch", fetchMock);
    const body = { serial: "ABC123" };

    const client = createHttpClient({ token, baseUrl });

    await expect(client.post("/parts", body)).resolves.toEqual({ id: "part-1" });
    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/parts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  });

  it("sends authenticated PATCH requests with a JSON body and returns parsed JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ serial: "ABC123", description: "Updated" }));
    vi.stubGlobal("fetch", fetchMock);
    const body = { description: "Updated" };

    const client = createHttpClient({ token, baseUrl });

    await expect(client.patch("/parts/ABC123", body)).resolves.toEqual({
      serial: "ABC123",
      description: "Updated",
    });
    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/parts/ABC123`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  });

  it("sends authenticated DELETE requests and returns undefined for an empty 204 body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const client = createHttpClient({ token, baseUrl });

    await expect(client.delete("/parts/1")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/parts/1`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: undefined,
    });
  });

  it("throws AssetPulseApiError for singular Rails error responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "Missing token" }, 401)));

    const client = createHttpClient({ token, baseUrl });
    const promise = client.get("/host_units");

    await expect(promise).rejects.toMatchObject({
      name: "AssetPulseApiError",
      status: 401,
      body: { error: "Missing token" },
      message: "Missing token",
    });
    await expect(promise).rejects.toBeInstanceOf(AssetPulseApiError);
  });

  it("throws AssetPulseApiError for Rails validation error responses", async () => {
    const errors = ["vin is required", "description is required"];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ errors }, 422)));

    const client = createHttpClient({ token, baseUrl });
    const promise = client.post("/host_units", {});

    await expect(promise).rejects.toMatchObject({
      name: "AssetPulseApiError",
      status: 422,
      body: { errors },
      message: "vin is required, description is required",
    });
    await expect(promise).rejects.toBeInstanceOf(AssetPulseApiError);
  });

  it("falls back to a generic message instead of throwing when a 500 response isn't JSON", async () => {
    const htmlResponse = new Response("<html>Internal Server Error</html>", {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(htmlResponse));

    const client = createHttpClient({ token, baseUrl });
    const promise = client.get("/host_units");

    await expect(promise).rejects.toMatchObject({
      name: "AssetPulseApiError",
      status: 500,
      body: "<html>Internal Server Error</html>",
      message: "AssetPulse API request failed with status 500",
    });
    await expect(promise).rejects.toBeInstanceOf(AssetPulseApiError);
  });

  it("wraps network-level failures (e.g. offline/DNS) in AssetPulseApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))
    );

    const client = createHttpClient({ token, baseUrl });
    const promise = client.get("/host_units");

    await expect(promise).rejects.toMatchObject({
      name: "AssetPulseApiError",
      status: 0,
    });
    await expect(promise).rejects.toBeInstanceOf(AssetPulseApiError);
  });

  it("throws synchronously when token is empty before calling fetch", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(() => createHttpClient({ token: "", baseUrl })).toThrow("AssetPulse API token is required");
    expect(() => createHttpClient({ token: "   ", baseUrl })).toThrow("AssetPulse API token is required");
    expect(() => createHttpClient({ baseUrl } as { token: string; baseUrl: string })).toThrow(
      "AssetPulse API token is required"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
