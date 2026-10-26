# REST API

Base `/api/v1`, JSON requests. Success `{success:true,data:...}`; failure `{success:false,error:{code,message,details}}`. Creation returns the state directly under data (including sessionId); unlike the original specification's nested create example, it does not return `{sessionId,state}`. This single-state envelope is used consistently by the frontend.

| Method | Path | Body | data |
|---|---|---|---|
| GET | /health (outside prefix) | — | status, service |
| POST | /simulations | `{source:"LI R1, 10"}` | State, 201 |
| POST | /simulations/validate | `{source:"LI R1, 10"}` | program |
| GET | /simulations/:id | — | State |
| POST | /simulations/:id/step | `{}` | State after one cycle |
| POST | /simulations/:id/run | `{maxCycles:200}` | state, runCycles, stopReason |
| POST | /simulations/:id/reset | `{}` | Reset state with same program and ID |
| DELETE | /simulations/:id | — | 204, no body |
| POST | /teammates/prepare | `{operation:"ADD",a:10,b:20,address:30}` | bot, mode, source, explanation |
| POST | /teammates/review | `{sessionId:"..."}` | verdict, expected, mismatches, summary, hazards, policy |

State contains sessionId, updatedAt, program, cycle, pc, status, registers, memory, pipeline, history, events, statistics. Status is ready, paused or completed; running is frontend playback state. Each history entry has cycle, stage-to-instruction-ID mapping and stalled. Each RAW event names producerId, consumerId, register, stage, cycle and reason. IDs are zero-based; the UI displays one-based labels.

Completed Step returns unchanged state. Run defaults to 200 cycles, accepts integers 1–5000, stops at completion/budget; the whole session is capped at 5000. Reset clears memory, registers, events, history and statistics. Frontend Run calls Step serially; Pause cancels future scheduled steps, so no backend pause endpoint is needed.

Errors: 400 validation/parse/JSON errors; 404 session or route missing; 409 cycle limit; 413 oversized body; 503 session capacity. Parser errors include source line details. Server errors do not expose stacks. Sessions are in-memory, maximum 100, lazily expired two hours after their last mutation. API and UI use the same origin or Vite's development proxy, so permissive CORS is unnecessary.
