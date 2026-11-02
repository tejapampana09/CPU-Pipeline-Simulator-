# API

All responses except DELETE use `{success:true,data:...}`; errors use `{success:false,error:{code,message,details}}`.

| Method | Path | Payload / result |
|---|---|---|
| GET | `/health` | Service health |
| POST | `/api/v1/simulations/validate` | `{source}` → canonical program |
| POST | `/api/v1/simulations` | `{source,mode:'pipeline'|'parallel',forwarding:boolean,issueWidth:0..200}` → session |
| GET | `/api/v1/simulations/:id` | Current mutable session state |
| GET | `/api/v1/simulations/:id/trace` | Full authoritative trace from cycle zero, including measured forwarding comparison; does not advance mutable session |
| POST | `/api/v1/simulations/:id/step` | Advance one cycle |
| POST | `/api/v1/simulations/:id/run` | `{maxCycles:1..5000}` (default 200) → state, runCycles, stopReason |
| POST | `/api/v1/simulations/:id/reset` | Optional `{forwarding}`; retains mode and issue width |
| DELETE | `/api/v1/simulations/:id` | Delete, HTTP 204 |
| GET | `/api/v1/teammates/status` | Gemini configured flag and configured model name |
| POST | `/api/v1/teammates/ai-generate` | `{prompt}` → validated source, provider, model, mode, isConfigured, fallback notice |
| POST | `/api/v1/teammates/prepare` | Deterministic template parameters |
| POST | `/api/v1/teammates/ai-explain` | `{sessionId,cycle?}` → analysis of server-owned state at selected cycle |
| POST | `/api/v1/teammates/review` | `{sessionId,cycle?}` → independent verification |

Bot aliases `/bot1/generate`, `/bot1/prepare`, `/bot2/explain`, `/bot2/review` remain available. Client-supplied sessionState is not trusted. Omitted cycle reviews the mutable session; UI always supplies the selected trace cycle. Verification stays pending until completion.

Use same-origin `/api/v1` in production and the Vite proxy in development. Optional `VITE_API_URL` applies to every API request; a separately hosted API requires an appropriate deployment proxy/CORS configuration. No silent local engine fallback exists.
