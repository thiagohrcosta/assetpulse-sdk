// index.ts
//
// Public entry point of the package. Re-exports only `AssetPulseClient`
// and its public types — the only thing anyone installing
// @assetpulse/sdk should ever import. Internal plumbing (the Zod schemas,
// HttpClient/createHttpClient, env.ts) stays unexported.

export { AssetPulseClient } from "./client";
export type { AssetPulseClientOptions } from "./client";

export { AssetPulseApiError } from "./http";

export type { HostUnit } from "./resources/hostUnits";
export type { HostUnitCreateInput, HostUnitUpdateInput } from "./validation/schemas";

export type { Part, PartListFilters } from "./resources/parts";
export type { PartCreateInput, PartUpdateInput } from "./validation/schemas";

export type { LifecycleEvent } from "./resources/lifecycleEvents";
export type { LifecycleEventCreateInput } from "./validation/schemas";
