<img width="1536" height="1024" alt="image" src="https://github.com/user-attachments/assets/73b8376c-cc7f-4da0-b124-a083d83dae49" />

# @thiagohrcosta/assetpulse-sdk

**A typed, semantic TypeScript client for the AssetPulse API.**

`@thiagohrcosta/assetpulse-sdk` wraps the AssetPulse REST API (a Rails backend) behind a small, resource-oriented interface. Instead of hand-writing `fetch()` calls, juggling auth headers, and guessing which fields a Rails `422` wants, you get `client.hostUnits.create({ ... })` — validated locally, typed end to end, and authenticated automatically.

[![npm version](https://img.shields.io/npm/v/%40thiagohrcosta%2Fassetpulse-sdk.svg)](https://www.npmjs.com/package/@thiagohrcosta/assetpulse-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#license)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6.svg)](#typescript)

---

## Why

Talking to a REST API by hand usually means repeating the same four mistakes across every call site:

- Forgetting the `Authorization` header, or a `Content-Type` that doesn't match the body.
- Finding out a required field was missing only after a round trip, from a generic `422`.
- Hardcoding `http://localhost:3000` in one file and the production URL in another.
- Re-declaring the shape of the same resource in every file that touches it.

`@thiagohrcosta/assetpulse-sdk` exists to remove all four:

- **Semantic resources** — `client.parts.list()`, `client.hostUnits.create(...)`, not raw URLs.
- **Validate-before-send** — every write is checked against a [Zod](https://zod.dev) schema that mirrors the backend's actual `NOT NULL` constraints, so a missing field fails instantly on the client, with a readable message, and never spends a network call.
- **Automatic environment resolution** — the same code targets `localhost:3000` in development and your production API in deployment, with no `if` statements in application code.
- **One typed error class** — `AssetPulseApiError`, whether the failure was a network error, a validation error, or a `4xx`/`5xx` from the API.
- **Zero runtime dependencies of consequence** — the only dependency is `zod`.

---

## Table of contents

- [Installation](#installation)
- [Quick start](#quick-start)
- [Core concepts](#core-concepts)
  - [The client](#the-client)
  - [Environment resolution](#environment-resolution)
  - [Error handling](#error-handling)
  - [Validation](#validation)
- [API reference](#api-reference)
  - [`hostUnits`](#hostunits)
  - [`parts`](#parts)
  - [`lifecycleEvents`](#lifecycleevents)
- [Usage with Next.js](#usage-with-nextjs)
- [TypeScript](#typescript)
- [Local development](#local-development)
- [Testing](#testing)
- [Design principles](#design-principles)
- [License](#license)

---

## Installation

```bash
npm install @thiagohrcosta/assetpulse-sdk
# or
pnpm add @thiagohrcosta/assetpulse-sdk
# or
yarn add @thiagohrcosta/assetpulse-sdk
```

Requires Node.js 18+ (for global `fetch`). Ships as dual ESM/CJS with bundled type declarations — no extra `@types` package needed.

---

## Quick start

```ts
import { AssetPulseClient } from "@thiagohrcosta/assetpulse-sdk";

const client = new AssetPulseClient({
  token: userJwtToken, // Bearer token issued by AssetPulse's auth (Devise + JWT)
  companyId: 42,       // every route is scoped to a company
});

// Create a host unit (validated locally before any request is sent)
const unit = await client.hostUnits.create({
  vin: "1FTFW1ET5DFC99999",
  description: "Ford Transit 2023",
});

// List parts installed on that host unit
const parts = await client.parts.list({ host_unit_id: unit.id, status: "installed" });

// Record a lifecycle event for a part
await client.lifecycleEvents.create(parts[0].id, {
  event_type: "maintenance",
  occurred_at: new Date().toISOString(),
  age_at_event_days: 120,
  notes: "Routine inspection, no issues found.",
});
```

If a required field is missing, you find out immediately — no request is made:

```ts
await client.hostUnits.create({ vin: "1FTFW1ET5DFC99999" } as any);
// ZodError: description is required
```

---

## Core concepts

### The client

`AssetPulseClient` is the single entry point. It holds no business logic and no mutable state — it validates its own options, builds one shared HTTP client, and hands it to each resource:

```ts
new AssetPulseClient({
  token: string,       // required — Bearer token, thrown synchronously if missing/empty
  companyId: number,   // required — positive number, thrown synchronously if missing/invalid
  baseUrl?: string,    // optional — see "Environment resolution" below
});
```

Both `token` and `companyId` are validated **at construction time**, synchronously — `new AssetPulseClient({})` fails immediately with a clear error instead of failing later on the first network call.

Every route in the AssetPulse API is nested under `/companies/:company_id/...`, which is why `companyId` is required up front: a single client instance always acts on behalf of one company, and that scoping is threaded into every resource for you.

### Environment resolution

You almost never need to pass `baseUrl` explicitly. Resolution follows this order, most explicit first:

1. **Explicit option** — `new AssetPulseClient({ baseUrl: "..." })`.
2. **Environment variable** — `ASSETPULSE_API_URL` on the server, `NEXT_PUBLIC_ASSETPULSE_API_URL` on the client (browser bundles only ever see `NEXT_PUBLIC_*` variables).
3. **Automatic local detection** — `http://localhost:3000/api/v1` when `window.location.hostname` is `localhost`/`127.0.0.1` in the browser, or when `NODE_ENV === "development"` on the server (e.g. inside a Next.js Server Component/Action, where `window` doesn't exist).
4. **Production default** — a configurable fallback baked into the package.

This means the same call site works unmodified in local development, CI, and production — set the environment variable once per deployment target and forget about it. A new backend URL never requires publishing a new SDK version.

### Error handling

Every failure — a validation error, a network failure, or an API error response — surfaces through one exception type: `AssetPulseApiError`.

```ts
import { AssetPulseClient, AssetPulseApiError } from "@thiagohrcosta/assetpulse-sdk";

try {
  await client.parts.find(999999);
} catch (error) {
  if (error instanceof AssetPulseApiError) {
    console.error(error.status);  // HTTP status, or 0 for a network-level failure
    console.error(error.message); // human-readable, parsed from the API's error body when possible
    console.error(error.body);    // the raw parsed response body
  }
}
```

- **`status >= 400`** → the response body is parsed and, when it matches AssetPulse's Rails error shape (`{ error: string }` or `{ errors: string[] }`), that message is surfaced directly; otherwise a generic `AssetPulse API request failed with status <n>` is used.
- **Network failure** (offline, DNS, CORS) → `status: 0`, so you can distinguish "never reached the server" from "server responded with an error" through the same class.
- **Non-JSON response body** (e.g. an upstream proxy returning HTML) → falls back to the raw text instead of letting a raw `SyntaxError` escape.

### Validation

Every `create`/`update` call is validated locally with [Zod](https://zod.dev) **before** a request is sent. The schemas mirror the backend's real `NOT NULL` database columns — not a hand-guessed contract — so a validation failure on the client means the request would have failed on the server too, just without the round trip.

```ts
try {
  await client.hostUnits.create({ vin: "" } as any);
} catch (error) {
  // ZodError — description is required
}
```

`create` schemas' required fields become optional on `update`, via Zod's `.partial()`, so partial updates ("just change the status") work without re-sending the whole object.

Fields the backend always fills in on its own — `id`, `company_id`, `created_at`, `updated_at` — are never part of an input schema; you can't accidentally (or intentionally) set them from the client.

---

## API reference

Every list/find/create/update/delete method returns a `Promise`. `create`/`update` are `async` even where nothing awaits internally, so a local validation failure rejects the returned promise instead of throwing synchronously — you get one consistent error channel (`await`/`.catch()`) regardless of whether the failure was local validation or a network error.

### `hostUnits`

CRUD for host units (`GET/POST/PATCH/DELETE /companies/:companyId/host_units`).

| Method | Signature | Description |
| --- | --- | --- |
| `list` | `list(): Promise<HostUnit[]>` | List every host unit for the client's company. |
| `find` | `find(id: number): Promise<HostUnit>` | Fetch one host unit by numeric ID. |
| `create` | `create(input: HostUnitCreateInput): Promise<HostUnit>` | Validate and create a host unit. |
| `update` | `update(id: number, changes: HostUnitUpdateInput): Promise<HostUnit>` | Validate and partially update a host unit. |
| `delete` | `delete(id: number): Promise<void>` | Delete a host unit. Parts installed on it have their `host_unit_id` nulled, not deleted. |

```ts
interface HostUnit {
  id: number;
  company_id: number;
  vin: string;
  description: string;
  created_at: string;
  updated_at: string;
}
```

**Required on create:** `vin`, `description`.

### `parts`

CRUD for parts (`GET/POST/PATCH/DELETE /companies/:companyId/parts`), with list-time filtering.

| Method | Signature | Description |
| --- | --- | --- |
| `list` | `list(filters?: PartListFilters): Promise<Part[]>` | List parts, optionally filtered. |
| `find` | `find(id: number): Promise<Part>` | Fetch one part by numeric ID. |
| `create` | `create(input: PartCreateInput): Promise<Part>` | Validate and create a part. |
| `update` | `update(id: number, changes: PartUpdateInput): Promise<Part>` | Validate and partially update a part. |
| `delete` | `delete(id: number): Promise<void>` | Delete a part. Cascades to its lifecycle events. |

```ts
interface Part {
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

interface PartListFilters {
  host_unit_id?: number;
  status?: "installed" | "in_repair" | "removed" | "scrapped";
  part_type_reference_id?: number;
}
```

**Required on create:** `part_type_reference_id`, `serial_number`, `manufacturer`, `model`.
**Optional:** `host_unit_id` (a part can exist before being installed), `status` (defaults to `"installed"` server-side).

```ts
const inRepair = await client.parts.list({ status: "in_repair" });
```

### `lifecycleEvents`

Append-only history for a part (`GET/POST/DELETE /companies/:companyId/parts/:partId/lifecycle_events`). Every method takes `partId`, since events for many parts are reachable from the same client instance.

There is deliberately **no `update`**: editing a historical event that already happened doesn't make business sense, even though the backend technically exposes a `PATCH` route for it. The SDK's surface reflects the business rule, not the raw CRUD capability.

| Method | Signature | Description |
| --- | --- | --- |
| `list` | `list(partId: number): Promise<LifecycleEvent[]>` | List all events for a part. |
| `find` | `find(partId: number, id: number): Promise<LifecycleEvent>` | Fetch one event by ID. |
| `create` | `create(partId: number, input: LifecycleEventCreateInput): Promise<LifecycleEvent>` | Validate and record a new event. |
| `delete` | `delete(partId: number, id: number): Promise<void>` | Delete an event. |

```ts
interface LifecycleEvent {
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
```

**Required on create:** `event_type`, `occurred_at`, `age_at_event_days`.
**Optional:** `host_unit_id`, `installation_type`, `notes`.

`event_type` accepts: `installed`, `maintenance`, `replaced_wear`, `replaced_defect`, `reassigned`, `scrapped`.
`installation_type` accepts: `factory_original`, `aftermarket_new`, `aftermarket_refurbished`.

`part_id` is intentionally **not** part of the input type — it comes from the `partId` argument (and, on the wire, from the URL), matching the backend's route shape.

---

## Usage with Next.js

`@thiagohrcosta/assetpulse-sdk` was designed to sit inside Next.js Server Components, Server Actions, and Route Handlers — anywhere a session's JWT is available server-side. **Never instantiate the client in browser code with a raw token**; read it from an `httpOnly` session cookie on the server first.

```ts
// app/actions/host-units.ts
"use server";

import { AssetPulseClient } from "@thiagohrcosta/assetpulse-sdk";
import { getSessionToken, getCompanyId } from "@/lib/auth";

export async function getHostUnit(id: number) {
  const client = new AssetPulseClient({
    token: await getSessionToken(),
    companyId: await getCompanyId(),
  });

  return client.hostUnits.find(id);
}
```

Set `ASSETPULSE_API_URL` (server-side calls) and/or `NEXT_PUBLIC_ASSETPULSE_API_URL` (if the client is ever instantiated in browser code) in your deployment environment — no code change or SDK release is needed to point at a new backend.

---

## TypeScript

The package is written in strict TypeScript and ships its own declarations — no `@types/assetpulse__sdk` needed. Only `AssetPulseClient`, its options, `AssetPulseApiError`, and the public resource/input types are exported; internal plumbing (the HTTP client, environment detection, raw Zod schemas) is intentionally not part of the public API surface.

```ts
import type {
  AssetPulseClientOptions,
  HostUnit,
  HostUnitCreateInput,
  HostUnitUpdateInput,
  Part,
  PartListFilters,
  PartCreateInput,
  PartUpdateInput,
  LifecycleEvent,
  LifecycleEventCreateInput,
} from "@thiagohrcosta/assetpulse-sdk";
```

Build output: ESM (`dist/index.mjs`), CommonJS (`dist/index.js`), and type declarations (`dist/index.d.ts`), generated by [`tsup`](https://tsup.egoist.dev), targeting ES2020.

---

## Local development

```bash
git clone git@github.com:thiagohrcosta/assetpulse-sdk.git
cd assetpulse-sdk
npm install
```

| Script | Description |
| --- | --- |
| `npm run build` | Build ESM/CJS bundles + type declarations into `dist/`. |
| `npm run dev` | Build in watch mode. |
| `npm test` | Run the test suite once. |
| `npm run test:watch` | Run the test suite in watch mode. |
| `npm run typecheck` | Type-check the project without emitting output. |

### Linking into a consuming app without publishing

```bash
# inside assetpulse-sdk/
npm run build
npm link

# inside the consuming app
npm link @thiagohrcosta/assetpulse-sdk
```

Run `npm unlink @thiagohrcosta/assetpulse-sdk` in the consuming app afterward to go back to the published version.

---

## Testing

Tests run on [Vitest](https://vitest.dev) with `fetch` stubbed via `vi.stubGlobal`, so the suite never hits a real network — every resource, the HTTP layer, environment resolution, and every validation schema are covered in isolation.

```bash
npm test
```

---

## Design principles

These are the rules the codebase is held to, not just a description of what it happens to do today:

- **The SDK never holds state or business logic.** It resolves environment, attaches auth, validates input, and translates semantic calls into HTTP requests — nothing more.
- **Fail fast, and fail locally.** Missing token, invalid `companyId`, or a missing required field all throw before a network call is made, not after.
- **Validation mirrors the real schema.** Zod schemas are kept in lockstep with the backend's actual `NOT NULL` columns — not a guessed or aspirational contract.
- **The public API reflects business rules, not raw CRUD.** `lifecycleEvents` has no `update` because editing history doesn't make sense, even though the underlying route exists.
- **One error channel.** Every failure mode — validation, network, or API error — surfaces as `AssetPulseApiError` (or a `ZodError` from `.parse()`), through a rejected promise, whether or not anything in the method body actually awaits.

---

## License

[MIT](https://opensource.org/licenses/MIT) © [Thiago Costa](mailto:thiagohrcosta86@gmail.com)
