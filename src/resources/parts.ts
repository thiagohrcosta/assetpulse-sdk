// resources/parts.ts
//
// Responsibility: semantic resource for the `parts` table.
//
// Every route is nested under the company (confirmed against the live
// backend's swagger.yaml at /api-docs): /api/v1/companies/:company_id/parts[/:id].
// companyId is bound once at construction — see hostUnits.ts.
//
// list(filters?) -> GET /companies/:companyId/parts (host_unit_id/status/
//   part_type_reference_id are optional query params on the real backend)
// find(id) -> GET /companies/:companyId/parts/:id (numeric primary key, not
//   the serial_number — the backend has no lookup-by-serial-number route)
// create(input) -> validates with PartCreateSchema, then POST /companies/:companyId/parts
// update(id, changes) -> validates partially, then PATCH /companies/:companyId/parts/:id
// delete(id) -> DELETE /companies/:companyId/parts/:id (backend returns 204
//   and cascades to the part's lifecycle_events)

import type { HttpClient } from "../http";
import {
  PartCreateSchema,
  PartUpdateSchema,
  type PartCreateInput,
  type PartUpdateInput,
} from "../validation/schemas";

// Mirrors db/schema.rb's `parts` table as the API returns it —
// company_id/created_at/updated_at are backend-filled, never sent by the SDK.
export interface Part {
  id: number;
  company_id: number;
  part_type_reference_id: number;
  host_unit_id: number | null;
  serial_number: string;
  manufacturer: string;
  model: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PartListFilters {
  host_unit_id?: number;
  status?: "installed" | "in_repair" | "removed" | "scrapped";
  part_type_reference_id?: number;
}

export class PartsResource {
  constructor(
    private readonly http: HttpClient,
    private readonly companyId: number
  ) {}

  private basePath(): string {
    return `/companies/${this.companyId}/parts`;
  }

  list(filters: PartListFilters = {}): Promise<Part[]> {
    const query = new URLSearchParams();
    if (filters.host_unit_id !== undefined) query.set("host_unit_id", String(filters.host_unit_id));
    if (filters.status !== undefined) query.set("status", filters.status);
    if (filters.part_type_reference_id !== undefined) {
      query.set("part_type_reference_id", String(filters.part_type_reference_id));
    }

    const queryString = query.toString();
    return this.http.get<Part[]>(queryString ? `${this.basePath()}?${queryString}` : this.basePath());
  }

  find(id: number): Promise<Part> {
    return this.http.get<Part>(`${this.basePath()}/${id}`);
  }

  // async so a Zod validation failure rejects the returned promise instead
  // of throwing synchronously — callers get one consistent error channel
  // (await/.catch()) whether the failure is local validation or a network
  // error from http.ts.
  async create(input: PartCreateInput): Promise<Part> {
    const payload = PartCreateSchema.parse(input);
    return this.http.post<Part, PartCreateInput>(this.basePath(), payload);
  }

  async update(id: number, changes: PartUpdateInput): Promise<Part> {
    const payload = PartUpdateSchema.parse(changes);
    return this.http.patch<Part, PartUpdateInput>(`${this.basePath()}/${id}`, payload);
  }

  delete(id: number): Promise<void> {
    return this.http.delete<void>(`${this.basePath()}/${id}`);
  }
}
