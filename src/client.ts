// client.ts
//
// Responsibility: the main `AssetPulseClient` class, the SDK's entry
// point. Takes `{ token, baseUrl? }`, resolves the final baseUrl (via
// env.ts), instantiates the http client (via http.ts), and exposes the
// semantic resources (this.hostUnits, this.parts, this.lifecycleEvents),
// each one receiving the already auth-configured http client.
//
// Implemented in: Step 7.
