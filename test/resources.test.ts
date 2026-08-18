import { afterEach, describe, expect, it, vi } from "vitest";
import { createHttpClient } from "../src/http";
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

describe("HostUnitsResource", () => {
  it("list() GETs /companies/:companyId/host_units", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([{ id: 1 }]));
    vi.stubGlobal("fetch", fetchMock);
    const resource = new HostUnitsResource(createHttpClient({ token, baseUrl }), companyId);

    await expect(resource.list()).resolves.toEqual([{ id: 1 }]);
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/companies/${companyId}/host_units`,
      expect.objectContaining({ method: "GET" })
    );
  });

  it("find() GETs /companies/:companyId/host_units/:id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 1, vin: "4T1BF1FK5CU123456" }));
    vi.stubGlobal("fetch", fetchMock);
    const resource = new HostUnitsResource(createHttpClient({ token, baseUrl }), companyId);

    await expect(resource.find(1)).resolves.toEqual({ id: 1, vin: "4T1BF1FK5CU123456" });
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/companies/${companyId}/host_units/1`,
      expect.objectContaining({ method: "GET" })
    );
  });

  it("create() validates required fields before hitting the network", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const resource = new HostUnitsResource(createHttpClient({ token, baseUrl }), companyId);

    // @ts-expect-error deliberately missing `description` to assert the validation error
    await expect(resource.create({ vin: "1FTFW1ET5DFC99999" })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("create() POSTs /companies/:companyId/host_units with the validated payload", async () => {
    const input = { vin: "1FTFW1ET5DFC99999", description: "Ford Transit 2023" };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 2, ...input }));
    vi.stubGlobal("fetch", fetchMock);
    const resource = new HostUnitsResource(createHttpClient({ token, baseUrl }), companyId);

    await expect(resource.create(input)).resolves.toEqual({ id: 2, ...input });
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/companies/${companyId}/host_units`,
      expect.objectContaining({ method: "POST", body: JSON.stringify(input) })
    );
  });

  it("update() PATCHes /companies/:companyId/host_units/:id with a partial payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 2, description: "Updated" }));
    vi.stubGlobal("fetch", fetchMock);
    const resource = new HostUnitsResource(createHttpClient({ token, baseUrl }), companyId);

    await resource.update(2, { description: "Updated" });
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/companies/${companyId}/host_units/2`,
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ description: "Updated" }) })
    );
  });

  it("update() rejects an empty string for a field that is present", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const resource = new HostUnitsResource(createHttpClient({ token, baseUrl }), companyId);

    await expect(resource.update(2, { description: "" })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("delete() DELETEs /companies/:companyId/host_units/:id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(undefined, 204));
    vi.stubGlobal("fetch", fetchMock);
    const resource = new HostUnitsResource(createHttpClient({ token, baseUrl }), companyId);

    await resource.delete(2);
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/companies/${companyId}/host_units/2`,
      expect.objectContaining({ method: "DELETE" })
    );
  });
});

describe("PartsResource", () => {
  it("list() GETs /companies/:companyId/parts", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([{ id: 1 }]));
    vi.stubGlobal("fetch", fetchMock);
    const resource = new PartsResource(createHttpClient({ token, baseUrl }), companyId);

    await resource.list();
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/companies/${companyId}/parts`,
      expect.objectContaining({ method: "GET" })
    );
  });

  it("list() forwards filters as query params", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);
    const resource = new PartsResource(createHttpClient({ token, baseUrl }), companyId);

    await resource.list({ host_unit_id: 5, status: "installed" });
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/companies/${companyId}/parts?host_unit_id=5&status=installed`,
      expect.objectContaining({ method: "GET" })
    );
  });

  it("find() GETs /companies/:companyId/parts/:id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 1, serial_number: "SN-1" }));
    vi.stubGlobal("fetch", fetchMock);
    const resource = new PartsResource(createHttpClient({ token, baseUrl }), companyId);

    await resource.find(1);
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/companies/${companyId}/parts/1`,
      expect.objectContaining({ method: "GET" })
    );
  });

  it("create() validates required fields before hitting the network", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const resource = new PartsResource(createHttpClient({ token, baseUrl }), companyId);

    // @ts-expect-error deliberately missing required fields to assert the validation error
    await expect(resource.create({ serial_number: "SN-1" })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("create() POSTs /companies/:companyId/parts, host_unit_id/status stay optional", async () => {
    const input = {
      part_type_reference_id: 7,
      serial_number: "SN-1",
      manufacturer: "Bosch",
      model: "X100",
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 3, ...input }));
    vi.stubGlobal("fetch", fetchMock);
    const resource = new PartsResource(createHttpClient({ token, baseUrl }), companyId);

    await expect(resource.create(input)).resolves.toEqual({ id: 3, ...input });
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/companies/${companyId}/parts`,
      expect.objectContaining({ method: "POST", body: JSON.stringify(input) })
    );
  });

  it("update() PATCHes /companies/:companyId/parts/:id with a partial payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 3, status: "removed" }));
    vi.stubGlobal("fetch", fetchMock);
    const resource = new PartsResource(createHttpClient({ token, baseUrl }), companyId);

    await resource.update(3, { status: "removed" });
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/companies/${companyId}/parts/3`,
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ status: "removed" }) })
    );
  });

  it("delete() DELETEs /companies/:companyId/parts/:id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(undefined, 204));
    vi.stubGlobal("fetch", fetchMock);
    const resource = new PartsResource(createHttpClient({ token, baseUrl }), companyId);

    await resource.delete(3);
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/companies/${companyId}/parts/3`,
      expect.objectContaining({ method: "DELETE" })
    );
  });
});

describe("LifecycleEventsResource", () => {
  const partId = 6;

  it("list(partId) GETs /companies/:companyId/parts/:partId/lifecycle_events", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([{ id: 9 }]));
    vi.stubGlobal("fetch", fetchMock);
    const resource = new LifecycleEventsResource(createHttpClient({ token, baseUrl }), companyId);

    await resource.list(partId);
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/companies/${companyId}/parts/${partId}/lifecycle_events`,
      expect.objectContaining({ method: "GET" })
    );
  });

  it("find(partId, id) GETs /companies/:companyId/parts/:partId/lifecycle_events/:id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 9 }));
    vi.stubGlobal("fetch", fetchMock);
    const resource = new LifecycleEventsResource(createHttpClient({ token, baseUrl }), companyId);

    await resource.find(partId, 9);
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/companies/${companyId}/parts/${partId}/lifecycle_events/9`,
      expect.objectContaining({ method: "GET" })
    );
  });

  it("create() validates required fields before hitting the network", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const resource = new LifecycleEventsResource(createHttpClient({ token, baseUrl }), companyId);

    // @ts-expect-error deliberately missing required fields to assert the validation error
    await expect(resource.create(partId, {})).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("create() rejects an event_type not in the real backend enum", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const resource = new LifecycleEventsResource(createHttpClient({ token, baseUrl }), companyId);

    await expect(
      resource.create(partId, {
        // @ts-expect-error "discarded" isn't a real backend enum value (it's "scrapped") — see ticket 05
        event_type: "discarded",
        occurred_at: "2026-01-01T00:00:00Z",
        age_at_event_days: 10,
      })
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("create(partId, input) POSTs /companies/:companyId/parts/:partId/lifecycle_events with the validated payload, without part_id in the body", async () => {
    const input = {
      event_type: "installed" as const,
      occurred_at: "2026-01-01T00:00:00Z",
      age_at_event_days: 0,
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 10, part_id: partId, ...input }));
    vi.stubGlobal("fetch", fetchMock);
    const resource = new LifecycleEventsResource(createHttpClient({ token, baseUrl }), companyId);

    await expect(resource.create(partId, input)).resolves.toEqual({ id: 10, part_id: partId, ...input });
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/companies/${companyId}/parts/${partId}/lifecycle_events`,
      expect.objectContaining({ method: "POST", body: JSON.stringify(input) })
    );
  });

  it("delete(partId, id) DELETEs /companies/:companyId/parts/:partId/lifecycle_events/:id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(undefined, 204));
    vi.stubGlobal("fetch", fetchMock);
    const resource = new LifecycleEventsResource(createHttpClient({ token, baseUrl }), companyId);

    await resource.delete(partId, 9);
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/companies/${companyId}/parts/${partId}/lifecycle_events/9`,
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("does not expose update()", () => {
    const resource = new LifecycleEventsResource(createHttpClient({ token, baseUrl }), companyId);
    expect("update" in resource).toBe(false);
  });
});
