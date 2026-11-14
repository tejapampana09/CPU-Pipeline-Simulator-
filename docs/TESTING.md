# Testing

Run `npm ci`, `npm test`, and `npm run build` from the repository root.

The suite registers **46 automated tests across nine files**:
- `core.test.js`: parser, pipeline stages, RAW interlocks, signed arithmetic, register writes, and 100 seeded differential programs.
- `forwarding.test.js`: ALU bypass paths, forwarding speedup, and load-use stalls.
- `timing.test.js`: cycle conventions, WB retirement, MEM timing, output retirement, and producer-aware forwarding trace.
- `parallel.test.js` and `architecture.test.js`: issue width, RAW/WAR/WAW, memory alias ordering, OUT ordering, and seeded mixed-program comparison with the independent interpreter.
- `memory_and_logic.test.js`: memory read/write, ALU logic, and signed values.
- `api.test.js`: health, lifecycle, malformed requests, session isolation, and teammate endpoints.
- `transpiler.test.js`: legacy conversion, unsupported byte registers, halt safety, and complete output validation.
- `review_cache.test.js`: in-flight deduplication, session/cycle isolation, retry, expiry, and bounded cache size.

GitHub Actions runs `npm ci`, `npm test`, and `npm run build on Node.js 22 and 24 for pushes to `main` and `fix/**`, pull requests targeting `main`, and manual dispatch. The README CI badge links to the workflow history. A green workflow means the automated suite and production build passed on both Node versions; it does not replace browser/manual checks.

Gemini live requests require an API key and are not exercised by the offline suite.

## Manual browser checklist

- Assemble all five examples in pipeline mode and parallel mode.
- Toggle forwarding and issue width; compare the final architectural state.
- Play, pause, step forward/back, reset playback, seek, and change playback speed.
- Inspect timing, registers, memory, outputs, stalls, and forwarding producer IDs.
- Generate and load Bot 1 code; verify provider and offline-fallback labels.
- Review pending and completed cycles with Bot 2; confirm auto-review starts unchecked.
- Stop the backend and confirm request failures remain visible instead of silently switching engines.
- Check desktop and mobile layouts and keyboard shortcuts.
- Try supported and rejected legacy syntax; a failed conversion must leave the original source unchanged.

API tests and production compilation do not substitute for browser interaction checks.
