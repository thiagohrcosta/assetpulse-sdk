// resources/lifecycleEvents.ts
//
// Responsibility: semantic resource for the `lifecycle_events` table.
//
// Every route is nested two levels deep (confirmed against the live
// backend's swagger.yaml at /api-docs):
//   /api/v1/companies/:company_id/parts/:part_id/lifecycle_events[/:id]
// companyId is bound once at construction (see hostUnits.ts); partId
// varies per call since events for many parts are reachable from the same
// client instance, so it's a method parameter instead.
//
// Deliberately no update() — "editing" a historical event that already
// happened doesn't make business sense, even though the real backend does
// expose a PATCH route for it. The SDK's API reflects that rule instead of
// mirroring raw CRUD.
//
// list(partId) -> GET /companies/:companyId/parts/:partId/lifecycle_events
// find(partId, id) -> GET .../lifecycle_events/:id (no natural business key
//   like VIN/serial_number exists on this table, unlike host_units/parts,
//   so the primary key is the identifier here)
// create(partId, input) -> validates with LifecycleEventCreateSchema, then
//   POST .../lifecycle_events (part_id itself comes from the URL, not the
//   body — see the schema's comment)
// delete(partId, id) -> DELETE .../lifecycle_events/:id (backend returns 204)

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
  constructor(
    private readonly http: HttpClient,
    private readonly companyId: number
  ) {}

  private basePath(partId: number): string {
    return `/companies/${this.companyId}/parts/${partId}/lifecycle_events`;
  }

  list(partId: number): Promise<LifecycleEvent[]> {
    return this.http.get<LifecycleEvent[]>(this.basePath(partId));
  }

  find(partId: number, id: number): Promise<LifecycleEvent> {
    return this.http.get<LifecycleEvent>(`${this.basePath(partId)}/${id}`);
  }

  // async so a Zod validation failure rejects the returned promise instead
  // of throwing synchronously — callers get one consistent error channel
  // (await/.catch()) whether the failure is local validation or a network
  // error from http.ts.
  async create(partId: number, input: LifecycleEventCreateInput): Promise<LifecycleEvent> {
    const payload = LifecycleEventCreateSchema.parse(input);
    return this.http.post<LifecycleEvent, LifecycleEventCreateInput>(this.basePath(partId), payload);
  }

  delete(partId: number, id: number): Promise<void> {
    return this.http.delete<void>(`${this.basePath(partId)}/${id}`);
  }
}
