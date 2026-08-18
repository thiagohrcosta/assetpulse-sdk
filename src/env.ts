// env.ts
//
// Detects the runtime environment and resolves the `baseUrl` that the
// rest of the SDK (http.ts, client.ts) should use.
//
// Resolution priority (most explicit to most implicit):
//   1. `baseUrl` passed explicitly when instantiating the client.
//   2. Environment variable — `NEXT_PUBLIC_ASSETPULSE_API_URL` (client) or
//      `ASSETPULSE_API_URL` (server), depending on where the call runs.
//   3. Automatic local-environment detection: `window.location.hostname`
//      is localhost/127.0.0.1 in the browser, or `NODE_ENV ===
//      "development"` on the server (Next.js Server Component/Server
//      Action/Route Handler, where `window` doesn't exist).
//   4. Production URL (`DEFAULT_PRODUCTION_URL`), pointing at the Render
//      deployment.

const DEFAULT_PRODUCTION_URL = "https://assetpulse-lfgt.onrender.com/api/v1";

// The API is namespaced under `api/v1` (see asset-pulse-api's
// `config/routes.rb`: `namespace :api do namespace :v1 do ... end end`),
// not just `/api`.
const DEFAULT_LOCAL_URL = "http://localhost:3000/api/v1";

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.location !== "undefined";
}

function isServerDevelopment(): boolean {
  return typeof process !== "undefined" && process.env?.NODE_ENV === "development";
}

// In the browser, only `NEXT_PUBLIC_*` variables exist in the client
// bundle; on the server, prioritize `ASSETPULSE_API_URL` but fall back to
// `NEXT_PUBLIC_*` in case the same env var is reused on both sides.
function readEnvUrl(): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;

  if (isBrowser()) {
    return process.env.NEXT_PUBLIC_ASSETPULSE_API_URL;
  }

  return process.env.ASSETPULSE_API_URL ?? process.env.NEXT_PUBLIC_ASSETPULSE_API_URL;
}

export function resolveBaseUrl(explicitBaseUrl?: string): string {
  if (explicitBaseUrl) return explicitBaseUrl;

  const envUrl = readEnvUrl();
  if (envUrl) return envUrl;

  if (isBrowser() && isLocalHostname(window.location.hostname)) {
    return DEFAULT_LOCAL_URL;
  }

  if (!isBrowser() && isServerDevelopment()) {
    return DEFAULT_LOCAL_URL;
  }

  return DEFAULT_PRODUCTION_URL;
}

export { DEFAULT_LOCAL_URL, DEFAULT_PRODUCTION_URL };
