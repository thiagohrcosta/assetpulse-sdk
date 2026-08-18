import { resolveBaseUrl } from "./env";

export interface HttpClientOptions {
  token: string;
  baseUrl?: string;
}

export interface HttpClient {
  get<TResponse = unknown>(path: string): Promise<TResponse>;
  post<TResponse = unknown, TBody = unknown>(path: string, body: TBody): Promise<TResponse>;
  patch<TResponse = unknown, TBody = unknown>(path: string, body: TBody): Promise<TResponse>;
}

export class AssetPulseApiError extends Error {
  public readonly status: number;
  public readonly body: unknown;

  constructor(message: string, options: { status: number; body: unknown }) {
    super(message);
    this.name = "AssetPulseApiError";
    this.status = options.status;
    this.body = options.body;
  }
}

type HttpMethod = "GET" | "POST" | "PATCH";

const jsonHeaders = {
  "Content-Type": "application/json",
} as const;

function normalizeErrorMessage(status: number, body: unknown): string {
  if (isRecord(body)) {
    if (typeof body.error === "string" && body.error.length > 0) {
      return body.error;
    }

    if (Array.isArray(body.errors)) {
      const messages = body.errors.filter((error): error is string => typeof error === "string");
      if (messages.length > 0) return messages.join(", ");
    }
  }

  return `AssetPulse API request failed with status ${status}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) return undefined;

  return JSON.parse(text) as unknown;
}

export function createHttpClient(options: HttpClientOptions): HttpClient {
  if (typeof options.token !== "string" || options.token.trim().length === 0) {
    throw new Error("AssetPulse API token is required");
  }

  const baseUrl = resolveBaseUrl(options.baseUrl);

  async function request<TResponse>(path: string, method: HttpMethod, body?: unknown): Promise<TResponse> {
    let response: Response;

    try {
      response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          ...jsonHeaders,
          Authorization: `Bearer ${options.token}`,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (error) {
      // Network-level failures do not have an HTTP status. We use status 0 so
      // callers can still detect them through the SDK's public error class.
      throw new AssetPulseApiError("AssetPulse API request failed before receiving a response", {
        status: 0,
        body: undefined
      });
    }

    const responseBody = await parseJsonResponse(response);

    if (response.status >= 400) {
      throw new AssetPulseApiError(normalizeErrorMessage(response.status, responseBody), {
        status: response.status,
        body: responseBody,
      });
    }

    return responseBody as TResponse;
  }

  return {
    get: <TResponse = unknown>(path: string) => request<TResponse>(path, "GET"),
    post: <TResponse = unknown, TBody = unknown>(path: string, body: TBody) =>
      request<TResponse>(path, "POST", body),
    patch: <TResponse = unknown, TBody = unknown>(path: string, body: TBody) =>
      request<TResponse>(path, "PATCH", body),
  };
}
