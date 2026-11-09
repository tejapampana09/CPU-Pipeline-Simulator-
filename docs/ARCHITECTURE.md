# Architecture

React sends source and configuration to the Express session API. It renders server-generated snapshots and plays, seeks, resets or steps through the returned trace; it never computes CPU results. A session is removed when replaced or the UI unmounts. Backend failures remain visible instead of triggering a different execution engine.

`shared/constants.js` defines the ISA, registers, memory size and stages. `shared/contracts.js` derives operand specifications and limits. `shared/parser.js` and `shared/validator.js` provide identical validation for the browser and backend; backend parser files are compatibility exports.

`simulationService.js` owns sessions, lifecycle, configuration and cycle-specific review state. `traceService.js` adapts authoritative states into the visualization contract and measures both forwarding configurations with the real pipeline engine. UI playback does not mutate the server session; `/step`, `/run`, and `/reset` remain available for API clients.

The backend pipeline implements IF, ID, EX, MEM and WB. Register values are calculated from actual operands, memory reads happen in MEM, and retirement completes in the displayed WB cycle. The final WB snapshot is retained as completed work, with no extra drain cycle. An independent N-instruction stream takes N+4 cycles. Forwarding bypasses ALU values and retains one load-use bubble.

The backend parallel engine is a dependency scheduling teaching model: ready instructions execute in one cycle, bounded by issue width (zero means unbounded). It preserves RAW, WAR, WAW, conflicting same-address memory accesses, and output ordering. Different memory addresses remain independent. It reads values at issue time. It is not a cycle-accurate superscalar processor.

The independent sequential verifier checks registers, memory and ordered output. Both AI teammates remain: assembly generation validates against the canonical parser; the reviewer uses a real server session and selected cycle. Offline templates are labeled as limited examples. Gemini explanations do not replace deterministic verification or measured performance fields. Unsafe unverified instruction reordering is not offered.


`usePipelineReview.js` handles review loading, success and retry states for the selected session/cycle. `reviewCache.js` deduplicates pending calls and reuses successful responses across replay and panel remounts (100 entries, two-hour TTL). Auto-review is opt-in and stays configured while the panel is closed; it runs only while the panel is mounted. Old responses cannot replace a different cycle's review.

Legacy conversion is a validated syntax adapter, not CPU emulation. It rejects byte-register halves and non-terminal halts and keeps the source unchanged on failure. The active timing component is `TimingGrid.jsx`; the active stylesheet is `frontend/src/styles.css`.
