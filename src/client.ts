// client.ts
//
// Responsibility: the main `AssetPulseClient` class, the SDK's entry
// point. Takes `{ token, companyId, baseUrl? }`, resolves the http client
// (via http.ts, which itself resolves baseUrl via env.ts), and exposes the
// semantic resources (this.hostUnits, this.parts, this.lifecycleEvents),
// each one receiving the already auth-configured http client plus
// companyId.
//
// NOTE: this differs from the tutorial's original Passo 7
// (.agents/instructions.md), which assumed the backend derived company_id
// from the JWT and didn't need it on the client at all. The real backend
// (confirmed in ticket 06's "2026-08-18 update") nests every route under
// /companies/:company_id/..., so companyId is required here and threaded
// into every resource instead.
//
// AssetPulseClient itself holds no other state/logic — it's purely a
// composition root, per the tutorial's closing note that the SDK "never
// holds state or heavy business logic".

import { createHttpClient } from "./http";
import { HostUnitsResource } from "./resources/hostUnits";
import { PartsResource } from "./resources/parts";
import { LifecycleEventsResource } from "./resources/lifecycleEvents";

export interface AssetPulseClientOptions {
  token: string;
  companyId: number;
  baseUrl?: string;
}

function assertValidCompanyId(companyId: unknown): asserts companyId is number {
  if (typeof companyId !== "number" || !Number.isFinite(companyId) || companyId <= 0) {
    throw new Error("AssetPulse companyId is required and must be a positive number");
  }
}

export class AssetPulseClient {
  readonly hostUnits: HostUnitsResource;
  readonly parts: PartsResource;
  readonly lifecycleEvents: LifecycleEventsResource;

  constructor(options: AssetPulseClientOptions) {
    // Fails fast, synchronously, at construction time — same principle as
    // http.ts failing fast on a missing token, not waiting for the first
    // request to 404/error against the wrong URL.
    assertValidCompanyId(options.companyId);

    const http = createHttpClient({ token: options.token, baseUrl: options.baseUrl });

    this.hostUnits = new HostUnitsResource(http, options.companyId);
    this.parts = new PartsResource(http, options.companyId);
    this.lifecycleEvents = new LifecycleEventsResource(http, options.companyId);
  }
}
