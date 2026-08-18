// http.ts
//
// Responsibility: the central fetch wrapper — resolves baseUrl + path,
// attaches `Authorization: Bearer <token>` and `Content-Type:
// application/json` on every call, exposes get/post/patch, and turns
// error responses (status >= 400) into a readable `AssetPulseApiError`
// instead of letting the raw fetch error leak out. Fails fast at
// construction time if `token` is missing (doesn't wait for the first
// network call to complain).
//
// Implemented in: Step 4.
