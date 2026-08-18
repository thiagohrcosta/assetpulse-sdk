// resources/parts.ts
//
// Responsibility: semantic resource for the `parts` table.
// find(serialNumber) -> GET /parts/:serial_number (unique identifier)
// create(input) -> validates with PartCreateSchema, then POST /parts
// update(serialNumber, changes) -> validates partially, then PATCH /parts/:serial_number
//
// Implemented in: Step 6.
