// resources/hostUnits.ts
//
// Responsibility: semantic resource for the `host_units` table.
//
// Every route is nested under the company (confirmed against the live
// backend's swagger.yaml at /api-docs): /api/v1/companies/:company_id/host_units[/:id].
// companyId is bound once at construction — same pattern for parts.ts —
// since a given SDK client instance always acts on behalf of one company.
//
// list() -> GET /companies/:companyId/host_units
// find(id) -> GET /companies/:companyId/host_units/:id (numeric primary key,
//   not the vin — the backend has no lookup-by-vin route)
// create(input) -> validates with HostUnitCreateSchema, then POST /companies/:companyId/host_units
// update(id, changes) -> validates partially, then PATCH /companies/:companyId/host_units/:id
// delete(id) -> DELETE /companies/:companyId/host_units/:id (backend returns 204;
//   parts installed on this host unit have their host_unit_id nulled, not deleted)

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
  constructor(
    private readonly http: HttpClient,
    private readonly companyId: number
  ) {}

  private basePath(): string {
    return `/companies/${this.companyId}/host_units`;
  }

  list(): Promise<HostUnit[]> {
    return this.http.get<HostUnit[]>(this.basePath());
  }

  find(id: number): Promise<HostUnit> {
    return this.http.get<HostUnit>(`${this.basePath()}/${id}`);
  }

  // async so a Zod validation failure rejects the returned promise instead
  // of throwing synchronously — callers get one consistent error channel
  // (await/.catch()) whether the failure is local validation or a network
  // error from http.ts.
  async create(input: HostUnitCreateInput): Promise<HostUnit> {
    const payload = HostUnitCreateSchema.parse(input);
    return this.http.post<HostUnit, HostUnitCreateInput>(this.basePath(), payload);
  }

  async update(id: number, changes: HostUnitUpdateInput): Promise<HostUnit> {
    const payload = HostUnitUpdateSchema.parse(changes);
    return this.http.patch<HostUnit, HostUnitUpdateInput>(`${this.basePath()}/${id}`, payload);
  }

  delete(id: number): Promise<void> {
    return this.http.delete<void>(`${this.basePath()}/${id}`);
  }
}
