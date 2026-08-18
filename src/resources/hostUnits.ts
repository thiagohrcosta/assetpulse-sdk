// resources/hostUnits.ts
//
// Responsibility: semantic resource for the `host_units` table.
// find(vin) -> GET /host_units/:vin (vin is the unique identifier)
// create(input) -> validates with HostUnitCreateSchema, then POST /host_units
// update(vin, changes) -> validates partially, then PATCH /host_units/:vin

import type { HttpClient } from "../http";
import {
  HostUnitCreateSchema,
  HostUnitUpdateSchema,
  type HostUnitCreateInput,
  type HostUnitUpdateInput,
} from "../validation/schemas";

// Mirrors db/schema.rb's `host_units` table as the API returns it —
// company_id/created_at/updated_at are backend-filled, never sent by the SDK.
export interface HostUnit {
  id: number;
  company_id: number;
  vin: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export class HostUnitsResource {
  constructor(private readonly http: HttpClient) {}

  find(vin: string): Promise<HostUnit> {
    return this.http.get<HostUnit>(`/host_units/${encodeURIComponent(vin)}`);
  }

  // async so a Zod validation failure rejects the returned promise instead
  // of throwing synchronously — callers get one consistent error channel
  // (await/.catch()) whether the failure is local validation or a network
  // error from http.ts.
  async create(input: HostUnitCreateInput): Promise<HostUnit> {
    const payload = HostUnitCreateSchema.parse(input);
    return this.http.post<HostUnit, HostUnitCreateInput>("/host_units", payload);
  }

  async update(vin: string, changes: HostUnitUpdateInput): Promise<HostUnit> {
    const payload = HostUnitUpdateSchema.parse(changes);
    return this.http.patch<HostUnit, HostUnitUpdateInput>(`/host_units/${encodeURIComponent(vin)}`, payload);
  }
}
