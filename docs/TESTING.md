# Verification

Run `npm ci`, `npm test`, `npm run build` from the project root.

Automated suite: 15 tests across core.test.js and api.test.js. Covers parser normalization/errors/ranges; immutable steps; independent-cycle count; RAW hold/bubble/release; document sample; LOAD/STORE dependencies; signed wrap and writable R0; multiple producers; completion; pending/failing reviews; bot cooperation; 100 seeded random programs compared against the independent sequential interpreter; health and all simulation lifecycle endpoints; malformed input; cycle budgets; session isolation.

Frontend production bundle is compiled by Vite. Browser UI behavior has not been automatically exercised in this environment. Before presentation, perform:

- Desktop and mobile widths: no clipped controls, stage/timing horizontal scrolling works.
- Keyboard focus and form labels; reduced-motion preference suppresses animation.
- Initialize valid/invalid source; error messages include lines.
- Step once advances cycle once; Run disables competing actions.
- Pause allows at most the current in-flight Step to finish and stops future steps.
- Reset clears state and retains program; editor changes require Initialize.
- Run Dependencies to completion, then review PASS.
- Generate each arithmetic operation in Bot 1; load, initialize, run, review using Bot 2.
- Review shows previous snapshot label after state changes.
- Export JSON trace and compare registers, events and history with the screen.
- Restart backend: old session returns 404; Initialize creates a new session.

The independent reference validates final architectural results; targeted tests validate timing and stall behavior. Neither is a formal proof of the simulator.
