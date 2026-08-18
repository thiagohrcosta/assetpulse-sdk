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
// HostUnitCreateSchema, PartCreateSchema, LifecycleEventCreateSchema
// (+ .partial() variants for update).
//
// Implemented in: Step 5.
