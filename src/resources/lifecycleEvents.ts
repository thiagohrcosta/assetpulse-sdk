// resources/lifecycleEvents.ts
//
// Responsibility: semantic resource for the `lifecycle_events` table.
// Only exposes find() and create() — deliberately no update(), since
// "editing" a historical event that already happened doesn't make
// business sense. The SDK's API reflects that rule instead of mirroring
// raw CRUD.
// create(input) -> validates with LifecycleEventCreateSchema, then POST /lifecycle_events
//
// Implemented in: Step 6.
