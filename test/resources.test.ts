import { afterEach, describe, expect, it, vi } from "vitest";
import { createHttpClient } from "../src/http";
import { HostUnitsResource } from "../src/resources/hostUnits";
import { PartsResource } from "../src/resources/parts";
import { LifecycleEventsResource } from "../src/resources/lifecycleEvents";

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

describe("HostUnitsResource", () => {
  it("find() GETs /host_units/:vin", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 1, vin: "4T1BF1FK5CU123456" }));
    vi.stubGlobal("fetch", fetchMock);
    const resource = new HostUnitsResource(createHttpClient({ token, baseUrl }));

    await expect(resource.find("4T1BF1FK5CU123456")).resolves.toEqual({ id: 1, vin: "4T1BF1FK5CU123456" });
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/host_units/4T1BF1FK5CU123456`,
      expect.objectContaining({ method: "GET" })
    );
  });

  it("find() URL-encodes the vin", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    const resource = new HostUnitsResource(createHttpClient({ token, baseUrl }));

    await resource.find("vin with spaces/slash");
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/host_units/${encodeURIComponent("vin with spaces/slash")}`,
      expect.objectContaining({ method: "GET" })
    );
  });

  it("create() validates required fields before hitting the network", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const resource = new HostUnitsResource(createHttpClient({ token, baseUrl }));

    // @ts-expect-error deliberately missing `description` to assert the validation error
    await expect(resource.create({ vin: "1FTFW1ET5DFC99999" })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("create() POSTs /host_units with the validated payload", async () => {
    const input = { vin: "1FTFW1ET5DFC99999", description: "Ford Transit 2023" };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 2, ...input }));
    vi.stubGlobal("fetch", fetchMock);
    const resource = new HostUnitsResource(createHttpClient({ token, baseUrl }));

    await expect(resource.create(input)).resolves.toEqual({ id: 2, ...input });
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/host_units`,
      expect.objectContaining({ method: "POST", body: JSON.stringify(input) })
    );
  });

  it("update() PATCHes /host_units/:vin with a partial payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 2, description: "Updated" }));
    vi.stubGlobal("fetch", fetchMock);
    const resource = new HostUnitsResource(createHttpClient({ token, baseUrl }));

    await resource.update("1FTFW1ET5DFC99999", { description: "Updated" });
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/host_units/1FTFW1ET5DFC99999`,
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ description: "Updated" }) })
    );
  });

  it("update() rejects an empty string for a field that is present", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const resource = new HostUnitsResource(createHttpClient({ token, baseUrl }));

    await expect(resource.update("1FTFW1ET5DFC99999", { description: "" })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("PartsResource", () => {
  it("find() GETs /parts/:serial_number", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 1, serial_number: "SN-1" }));
    vi.stubGlobal("fetch", fetchMock);
    const resource = new PartsResource(createHttpClient({ token, baseUrl }));

    await resource.find("SN-1");
    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/parts/SN-1`, expect.objectContaining({ method: "GET" }));
  });

  it("create() validates required fields before hitting the network", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const resource = new PartsResource(createHttpClient({ token, baseUrl }));

    // @ts-expect-error deliberately missing required fields to assert the validation error
    await expect(resource.create({ serial_number: "SN-1" })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("create() POSTs /parts, host_unit_id/status stay optional", async () => {
    const input = {
      part_type_reference_id: 7,
      serial_number: "SN-1",
      manufacturer: "Bosch",
      model: "X100",
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 3, ...input }));
    vi.stubGlobal("fetch", fetchMock);
    const resource = new PartsResource(createHttpClient({ token, baseUrl }));

    await expect(resource.create(input)).resolves.toEqual({ id: 3, ...input });
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/parts`,
      expect.objectContaining({ method: "POST", body: JSON.stringify(input) })
    );
  });

  it("update() PATCHes /parts/:serial_number with a partial payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 3, status: "removed" }));
    vi.stubGlobal("fetch", fetchMock);
    const resource = new PartsResource(createHttpClient({ token, baseUrl }));

    await resource.update("SN-1", { status: "removed" });
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/parts/SN-1`,
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ status: "removed" }) })
    );
  });
});

describe("LifecycleEventsResource", () => {
  it("find() GETs /lifecycle_events/:id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 9 }));
    vi.stubGlobal("fetch", fetchMock);
    const resource = new LifecycleEventsResource(createHttpClient({ token, baseUrl }));

    await resource.find(9);
    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/lifecycle_events/9`, expect.objectContaining({ method: "GET" }));
  });

  it("create() validates required fields before hitting the network", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const resource = new LifecycleEventsResource(createHttpClient({ token, baseUrl }));

    // @ts-expect-error deliberately missing required fields to assert the validation error
    await expect(resource.create({ part_id: 1 })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("create() rejects an event_type not in the real backend enum", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const resource = new LifecycleEventsResource(createHttpClient({ token, baseUrl }));

    await expect(
      resource.create({
        part_id: 1,
        // @ts-expect-error "discarded" isn't a real backend enum value (it's "scrapped") — see ticket 05
        event_type: "discarded",
        occurred_at: "2026-01-01T00:00:00Z",
        age_at_event_days: 10,
      })
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("create() POSTs /lifecycle_events with the validated payload", async () => {
    const input = {
      part_id: 1,
      event_type: "installed" as const,
      occurred_at: "2026-01-01T00:00:00Z",
      age_at_event_days: 0,
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 10, ...input }));
    vi.stubGlobal("fetch", fetchMock);
    const resource = new LifecycleEventsResource(createHttpClient({ token, baseUrl }));

    await expect(resource.create(input)).resolves.toEqual({ id: 10, ...input });
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/lifecycle_events`,
      expect.objectContaining({ method: "POST", body: JSON.stringify(input) })
    );
  });

  it("does not expose update()", () => {
    const resource = new LifecycleEventsResource(createHttpClient({ token, baseUrl }));
    expect("update" in resource).toBe(false);
  });
});
