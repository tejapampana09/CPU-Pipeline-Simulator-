# Pipeline Lab — CPU Pipeline Simulator

[![CI](https://github.com/tejapampana09/CPU-Pipeline-Simulator-/actions/workflows/ci.yml/badge.svg)](https://github.com/tejapampana09/CPU-Pipeline-Simulator-/actions/workflows/ci.yml)

Complete React + Vite frontend and Node.js + Express backend for a seven-member COA project, with two optional AI bot teammates. The backend is authoritative; the UI renders returned snapshots.

## Quick start (Windows, macOS or Linux)

Install Node.js 22 or newer and npm. Extract the ZIP, open the `coa-pipeline-simulator` folder in VS Code, and open its terminal:

```bash
npm ci
npm run dev
```

Visit **http://localhost:5173**. Vite proxies `/api` to Express at port 3000. Both servers run from one command; Ctrl+C stops them. Initial dependency installation requires internet. The Express backend must run for simulation. Offline bot templates and verification require no API key; Gemini generation/explanation requires a configured key and network access. If PowerShell blocks npm.ps1, use Command Prompt or run `npm.cmd` instead of `npm`.

Production-style local run:

```bash
npm run build
npm start
```

Visit **http://localhost:3000**. Express serves the built frontend and the API on the same origin. No hosted deployment is included in this source deliverable.

Verify:

```bash
npm test
```

## Included features

- Shared validated assembly editor with five example programs and line-level errors.
- Eight writable signed 32-bit registers (R0–R7), 1024 word-addressed memory locations, PC in bytes.
- LI, LOAD, STORE, ADD, SUB, MUL, AND, OR and OUT.
- Five-stage pipeline with RAW stalls, forwarding ON/OFF and one-cycle load-use bubbles.
- Parallel dependency scheduling with selectable issue width; register, memory and output ordering are preserved.
- Step forward/back, run/pause, reset playback, seek and speed selection over backend-generated traces.
- Animated stage cards, timing grid, event log, registers, memory and output panels.
- Cycle count, retired instructions, stalls, CPI, IPC and speedup with an explicit comparison baseline.
- Two optional AI teammates: validated assembly generation and independent result verification with explanations.
- Limited legacy syntax conversion with validation; unsafe byte-register and mid-program halt conversions are rejected.
- Isolated in-memory sessions, execution limits, structured API errors, capacity and expiry.
- Automated regression and seeded differential tests against an independent sequential interpreter.

## Two bot teammates

Open **AI Teammates** to use the Assembly Architect and Pipeline Reviewer. With a configured Gemini key, Bot 1 generates assembly and Bot 2 explains verified simulation facts. Without a key or after a provider failure, the UI explicitly identifies limited offline templates/analysis. The simulator and final-state verifier remain deterministic; AI never decides CPU results. Keep credentials in the backend environment, never in browser/Vite variables.

**Auto-review on completion is off by default.** Enable it or click **Review Current Cycle**. Successful and in-flight reviews are cached by session and cycle in the browser, including across replay and panel reopen. The cache holds up to 100 entries for up to two hours and resets on page reload. New simulation settings create a new session. Failed requests can be retried; only a successful response displays the reviewed badge, and an old cycle's response is never displayed as the current review.

## Pipeline timing

A snapshot shows the stages occupied during that numbered cycle and the state after their work. A single instruction occupies IF at cycle 1, ID at 2, EX at 3, MEM at 4 and WB at 5. Its register write or OUT output commits in cycle 5; no empty drain cycle is counted. An independent N-instruction stream takes **N+4 cycles**, and a stalled stream takes **N+4+stall cycles**. The final WB card remains visible as the last cycle's work; the session is complete and cannot retire it twice.

ALU results are calculated in EX, memory accesses happen in MEM, and retirement occurs in WB. Without forwarding, a dependent instruction waits in ID until the producer's WB cycle completes before entering EX. With forwarding, ALU results bypass through EX/MEM or MEM/WB; an immediately dependent LOAD consumer still stalls once. Count one stall per stalled cycle even when multiple dependency events are recorded.

Pipeline speedup compares against the same program taking five cycles per instruction without overlap: `5N / pipelineCycles`. Bot 2 separately reports measured forwarding speedup as `cyclesWithoutForwarding / cyclesWithForwarding`. Parallel mode compares against one instruction per cycle and is a dependency scheduling teaching model, not a cycle-accurate superscalar CPU.

## Legacy syntax limits

The converter accepts a limited set of MOV/MVI, STA/LDA, numeric memory brackets, register aliases and two-operand arithmetic forms. The output uses this simulator's **32-bit teaching ISA**, not 8085/8086 flags or 8-/16-bit arithmetic. AL/AH-style byte halves are rejected. HLT/HALT is accepted only without operands at the end of a nonempty program, where automatic pipeline draining is equivalent for this model. Unsupported converted instructions fail validation without replacing the editor source. Branches, labels, stack operations and interrupts are not emulated.

## Demo

1. Load **RAW hazard chain** from Examples; samples assemble automatically.
2. Step until the first stall. Point out held IF/ID and the EX bubble.
3. Run to completion: R1=10, R2=20, R3=30, R4=20, R5=20 and memory[30]=20.
4. Toggle forwarding and compare cycle/stall counts and bypass links.
5. Open AI Teammates and click **Review Current Cycle** at completion for PASS.
6. Generate a program, inspect its provider/fallback notice, then **Load into Editor**.
7. Switch to **Parallel Issue**, choose an issue width and inspect the dependency scheduling model.
8. Reset/seek to replay the existing trace; reset playback shows the initial zero state.

## Project references

- `docs/FOLDER_STRUCTURE.md`: every included source file.
- `docs/TEAM_DIVISION.md`: ownership for 7 human members + 2 bots.
- `docs/API.md`: request/response contracts and limits.
- `docs/TESTING.md`: verified checks and manual browser checklist.
- `docs/ARCHITECTURE.md`: module boundaries and extension guidance.

## Limitations

Sessions expire after two hours without mutation and disappear on backend restart. Maximum 100 sessions, 200 instructions, 5000 cycles per session, 40 KB JSON request body. This is a local educational app without accounts or public multi-user security. Pause stops local trace playback. Reset playback returns to cycle zero; it does not mutate the backend session. Browser layout/interaction needs the manual checklist in `docs/TESTING.md`; the delivered automated checks cover the engine, API, agents, and frontend compilation.

## Authoritative simulation

Both execution modes run in the backend. The browser validates through the shared parser and renders server traces. Supported instructions: LI, LOAD, STORE, ADD, SUB, MUL, AND, OR, OUT. Memory contains 1024 zero-initialized words. See docs/ARCHITECTURE.md and docs/API.md for trace playback, session lifecycle and teammate status details.

