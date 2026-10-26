# Architecture

React controls → simulationApi → Express routes → simulationService → parser / machine / pipelineEngine → snapshot → visualization.

The backend is the single source of truth. The frontend never computes architectural register, memory or hazard results. The engine clones input state and derives next stages from the old snapshot. WB commits first, allowing same-cycle ID reads; EX/MEM producers determine stalls. A stalled ID holds IF and PC and bubbles EX while older instructions progress. STORE data is captured after dependencies resolve, then written at MEM exit.

Assembly Assistant returns code through /teammates/prepare. The same parser validates it. Pipeline Reviewer reads the server-owned session, independently computes expected results using a sequential interpreter, and compares final registers and memory only once the pipeline drains. The rule-based reviewer reports incomplete work as pending. It does not claim proof of every timing rule; timing properties are separately tested.

Server sessions are isolated with random UUIDs and bounded lifetime/capacity. There is no database. HTTP route handlers are thin and synchronous service mutations avoid interleaving within a step. Frontend lock prevents duplicate in-flight actions. Cleanup cancels playback after unmount; stale review results are labelled by snapshot.

Adding LLM assistance later: add a server-only provider service with input schema validation, timeout, bounded output and a per-action call budget. Model-proposed programs must pass parse validation, and all numerical claims should come from simulator snapshots. Keep deterministic bots available as fallback and label the active mode honestly. A model review is not a replacement for independent reference tests.
