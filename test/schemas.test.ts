import { describe, expect, it } from "vitest";
import {
  HostUnitCreateSchema,
  HostUnitUpdateSchema,
  LifecycleEventCreateSchema,
  PartCreateSchema,
  PartUpdateSchema,
} from "../src/validation/schemas";

describe("HostUnitCreateSchema", () => {
  it("accepts a valid host unit", () => {
    const input = { vin: "4T1BF1FK5CU123456", description: "Ford Transit 2023" };
    expect(HostUnitCreateSchema.parse(input)).toEqual(input);
  });

  it("rejects a missing vin", () => {
    expect(() => HostUnitCreateSchema.parse({ description: "Ford Transit 2023" })).toThrow();
  });

  it("rejects a missing description", () => {
    expect(() => HostUnitCreateSchema.parse({ vin: "4T1BF1FK5CU123456" })).toThrow();
  });

  it("rejects an empty-string vin/description, not just a missing key", () => {
    expect(() => HostUnitCreateSchema.parse({ vin: "", description: "" })).toThrow();
  });
});

describe("HostUnitUpdateSchema", () => {
  it("allows a partial payload with a single field", () => {
    expect(HostUnitUpdateSchema.parse({ description: "Updated description" })).toEqual({
      description: "Updated description",
    });
  });

  it("allows an empty payload", () => {
    expect(HostUnitUpdateSchema.parse({})).toEqual({});
  });
});

describe("PartCreateSchema", () => {
  const validPart = {
    part_type_reference_id: 1,
    serial_number: "ABC123",
    manufacturer: "Bosch",
    model: "X100",
  };

  it("accepts a valid part without the optional fields", () => {
    expect(PartCreateSchema.parse(validPart)).toEqual(validPart);
  });

  it("accepts host_unit_id and status when provided", () => {
    const input = { ...validPart, host_unit_id: 42, status: "in_repair" };
    expect(PartCreateSchema.parse(input)).toEqual(input);
  });

  it.each(["part_type_reference_id", "serial_number", "manufacturer", "model"])(
    "rejects a payload missing %s",
    (field) => {
      const { [field]: _omitted, ...rest } = validPart as Record<string, unknown>;
      expect(() => PartCreateSchema.parse(rest)).toThrow();
    }
  );
});

describe("PartUpdateSchema", () => {
  it("allows a partial payload", () => {
    expect(PartUpdateSchema.parse({ status: "removed" })).toEqual({ status: "removed" });
  });
});

describe("LifecycleEventCreateSchema", () => {
  const validEvent = {
    event_type: "installed",
    occurred_at: "2026-08-18T00:00:00.000Z",
    age_at_event_days: 0,
  };

  it("accepts a valid event without the optional fields", () => {
    expect(LifecycleEventCreateSchema.parse(validEvent)).toEqual(validEvent);
  });

  it("accepts host_unit_id, installation_type and notes when provided", () => {
    const input = {
      ...validEvent,
      host_unit_id: 7,
      installation_type: "aftermarket_new",
      notes: "Swapped during scheduled maintenance",
    };
    expect(LifecycleEventCreateSchema.parse(input)).toEqual(input);
  });

  it.each(["event_type", "occurred_at", "age_at_event_days"])(
    "rejects a payload missing %s",
    (field) => {
      const { [field]: _omitted, ...rest } = validEvent as Record<string, unknown>;
      expect(() => LifecycleEventCreateSchema.parse(rest)).toThrow();
    }
  );

  it("accepts every event_type value from the real Rails enum, including 'scrapped'", () => {
    const eventTypes = ["installed", "maintenance", "replaced_wear", "replaced_defect", "reassigned", "scrapped"];
    for (const event_type of eventTypes) {
      expect(() => LifecycleEventCreateSchema.parse({ ...validEvent, event_type })).not.toThrow();
    }
  });

  it("rejects 'discarded' — that value doesn't exist on the real Rails model, only in the outdated tutorial draft", () => {
    expect(() => LifecycleEventCreateSchema.parse({ ...validEvent, event_type: "discarded" })).toThrow();
  });

  it("rejects an invalid installation_type", () => {
    expect(() =>
      LifecycleEventCreateSchema.parse({ ...validEvent, installation_type: "used" })
    ).toThrow();
  });
});