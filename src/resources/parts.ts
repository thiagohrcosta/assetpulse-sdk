// resources/parts.ts
//
// Responsibility: semantic resource for the `parts` table.
// find(serialNumber) -> GET /parts/:serial_number (unique identifier)
// create(input) -> validates with PartCreateSchema, then POST /parts
// update(serialNumber, changes) -> validates partially, then PATCH /parts/:serial_number

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

export class PartsResource {
  constructor(private readonly http: HttpClient) {}

  find(serialNumber: string): Promise<Part> {
    return this.http.get<Part>(`/parts/${encodeURIComponent(serialNumber)}`);
  }

  // async so a Zod validation failure rejects the returned promise instead
  // of throwing synchronously — callers get one consistent error channel
  // (await/.catch()) whether the failure is local validation or a network
  // error from http.ts.
  async create(input: PartCreateInput): Promise<Part> {
    const payload = PartCreateSchema.parse(input);
    return this.http.post<Part, PartCreateInput>("/parts", payload);
  }

  async update(serialNumber: string, changes: PartUpdateInput): Promise<Part> {
    const payload = PartUpdateSchema.parse(changes);
    return this.http.patch<Part, PartUpdateInput>(`/parts/${encodeURIComponent(serialNumber)}`, payload);
  }
}
