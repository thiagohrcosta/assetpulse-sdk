// validation/schemas.ts
//
// Responsibility: Zod schemas that mirror exactly the `null: false`
// columns from the real asset-pulse-api schema.rb (ignoring the ones the
// backend fills in on its own: id, company_id coming from the JWT, and
// timestamps). Each resource (resources/*.ts) uses the matching schema
// with .parse(input) before calling http.post/patch — if a field is
// missing, the error surfaces on the client, without spending a network
// call.
//
// Confirmed against the real backend
// (/home/thiago/Projeto-IA/AssetPulse/asset-pulse-api), not just the
// tutorial draft in .agents/instructions.md — see the note on
// LifecycleEventCreateSchema below for the one place they disagree.

import { z } from "zod";

// ---------------------------------------------------------------------------
// host_units (db/schema.rb: company_id, vin, description all `null: false`;
// company_id comes from the JWT, so only vin/description are required here)
// ---------------------------------------------------------------------------

export const HostUnitCreateSchema = z.object({
  vin: z.string().min(1, "vin is required"),
  description: z.string().min(1, "description is required"),
});

export const HostUnitUpdateSchema = HostUnitCreateSchema.partial();

export type HostUnitCreateInput = z.infer<typeof HostUnitCreateSchema>;
export type HostUnitUpdateInput = z.infer<typeof HostUnitUpdateSchema>;

// ---------------------------------------------------------------------------
// parts (db/schema.rb: part_type_reference_id, serial_number, manufacturer,
// model are `null: false`; host_unit_id is nullable — a part can exist
// before being installed; status defaults to "installed" in the DB, so
// it's optional here too)
// ---------------------------------------------------------------------------

export const PartCreateSchema = z.object({
  part_type_reference_id: z.number({ required_error: "part_type_reference_id is required" }),
  serial_number: z.string().min(1, "serial_number is required"),
  manufacturer: z.string().min(1, "manufacturer is required"),
  model: z.string().min(1, "model is required"),
  host_unit_id: z.number().optional(),
  status: z.string().optional(),
});

export const PartUpdateSchema = PartCreateSchema.partial();

export type PartCreateInput = z.infer<typeof PartCreateSchema>;
export type PartUpdateInput = z.infer<typeof PartUpdateSchema>;

// ---------------------------------------------------------------------------
// lifecycle_events (db/schema.rb: part_id, event_type, occurred_at,
// age_at_event_days are `null: false`; host_unit_id, installation_type,
// notes are nullable, so optional here).
//
// event_type/installation_type mirror the enums declared on the real Rails
// model (app/models/lifecycle_event.rb) — NOT the tutorial draft in
// .agents/instructions.md, which lists "discarded" as a valid event_type.
// The actual model uses "scrapped"; there is no "discarded" value.
//
// part_id is NOT part of this schema even though it's `null: false` in
// schema.rb: the real backend route is nested under
// /companies/:company_id/parts/:part_id/lifecycle_events (confirmed against
// the live swagger.yaml's LifecycleEventInput, which has no part_id
// property) — the backend takes it from the URL, not the body. The SDK
// mirrors that: LifecycleEventsResource methods take `partId` as a
// parameter instead of expecting it in the payload.
//
// No update schema is exported: lifecycle_events only supports find/create
// (see resources/lifecycleEvents.ts, ticket 06) — editing a historical
// event that already happened doesn't make business sense, so the SDK
// doesn't expose a way to validate an update payload for it either.
// ---------------------------------------------------------------------------

export const LifecycleEventCreateSchema = z.object({
  event_type: z.enum(
    ["installed", "maintenance", "replaced_wear", "replaced_defect", "reassigned", "scrapped"],
    { required_error: "event_type is required" }
  ),
  occurred_at: z.string().min(1, "occurred_at is required"),
  age_at_event_days: z.number({ required_error: "age_at_event_days is required" }),
  host_unit_id: z.number().optional(),
  installation_type: z.enum(["factory_original", "aftermarket_new", "aftermarket_refurbished"]).optional(),
  notes: z.string().optional(),
});

export type LifecycleEventCreateInput = z.infer<typeof LifecycleEventCreateSchema>;
