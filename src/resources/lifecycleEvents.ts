// resources/lifecycleEvents.ts
//
// Responsibility: semantic resource for the `lifecycle_events` table.
// Only exposes find() and create() — deliberately no update(), since
// "editing" a historical event that already happened doesn't make
// business sense. The SDK's API reflects that rule instead of mirroring
// raw CRUD.
// find(id) -> GET /lifecycle_events/:id (no natural business key like
// VIN/serial_number exists on this table, unlike host_units/parts, so the
// primary key is the identifier here)
// create(input) -> validates with LifecycleEventCreateSchema, then POST /lifecycle_events

import type { HttpClient } from "../http";
import { LifecycleEventCreateSchema, type LifecycleEventCreateInput } from "../validation/schemas";

// Mirrors db/schema.rb's `lifecycle_events` table as the API returns it —
// company_id/created_at/updated_at are backend-filled, never sent by the SDK.
export interface LifecycleEvent {
  id: number;
  company_id: number;
  part_id: number;
  host_unit_id: number | null;
  event_type: string;
  installation_type: string | null;
  occurred_at: string;
  age_at_event_days: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export class LifecycleEventsResource {
  constructor(private readonly http: HttpClient) {}

  find(id: number): Promise<LifecycleEvent> {
    return this.http.get<LifecycleEvent>(`/lifecycle_events/${id}`);
  }

  // async so a Zod validation failure rejects the returned promise instead
  // of throwing synchronously — callers get one consistent error channel
  // (await/.catch()) whether the failure is local validation or a network
  // error from http.ts.
  async create(input: LifecycleEventCreateInput): Promise<LifecycleEvent> {
    const payload = LifecycleEventCreateSchema.parse(input);
    return this.http.post<LifecycleEvent, LifecycleEventCreateInput>("/lifecycle_events", payload);
  }
}
