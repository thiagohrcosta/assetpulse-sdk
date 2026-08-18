// resources/hostUnits.ts
//
// Responsibility: semantic resource for the `host_units` table.
// find(vin) -> GET /host_units/:vin (vin is the unique identifier)
// create(input) -> validates with HostUnitCreateSchema, then POST /host_units
// update(vin, changes) -> validates partially, then PATCH /host_units/:vin
//
// Implemented in: Step 6.
