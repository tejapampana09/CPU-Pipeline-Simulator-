# Pipeline Lab — CPU Pipeline Simulator

Complete React + Vite frontend and Node.js + Express backend for a seven-member COA project, with two integrated rule-based bot teammates. The backend is authoritative; the UI renders returned snapshots.

## Quick start (Windows, macOS or Linux)

Install Node.js 22 or newer and npm. Extract the ZIP, open the `coa-pipeline-simulator` folder in VS Code, and open its terminal:

```bash
npm ci
npm run dev
```

Visit **http://localhost:5173**. Vite proxies `/api` to Express at port 3000. Both servers run from one command; Ctrl+C stops them. Initial dependency installation requires internet. After installation, the app and bots require no network or API keys. If PowerShell blocks npm.ps1, use Command Prompt or run `npm.cmd` instead of `npm`.

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

- Validated assembly editor, three examples, line-level errors.
- Eight writable signed 32-bit registers (R0–R7), 1024 word-addressed memory locations, PC in bytes.
- LI, ADD, SUB, AND, OR, LOAD, STORE; immediate values from -2147483648 to 2147483647.
- Deterministic five-stage pipeline, no forwarding, RAW interlocks, EX bubbles.
- Initialize, Step, Run, Pause, Reset; selectable playback delay and no overlapping Step requests.
- Animated stage cards, last-30-cycle timing table, hazard log, register and memory panels.
- Completed instruction count, cycle count, stall cycles, provisional CPI, IPC in exported state.
- JSON trace export with full history and all events.
- Assembly Assistant generates validated arithmetic/logic programs from structured inputs.
- Pipeline Reviewer independently executes the program sequentially and checks all final register/memory values.
- In-memory isolated sessions, bounded execution, structured API errors, session capacity and TTL.
- 15 automated tests, including a seeded 100-program differential test.

## Two bot teammates

The two bots are **deterministic, rule-based software agents**, not LLM-powered conversational AI. This is explicitly labelled in the UI. They work end-to-end without keys, external inference, quota consumption or fabricated explanations. The Assistant proposes code; the user loads and initializes it; the backend runs it; the Reviewer compares actual results with an independent interpreter. Review output is marked as a previous snapshot if the simulation changes.

If your faculty specifically requires generative AI, an additional backend provider adapter and credentials are needed. Preserve this deterministic execution and verification layer when adding one. Never let model output decide CPU results. Never place provider keys in Vite variables or browser code.

## Pipeline convention (read before presenting)

A snapshot shows stage occupancy **after** a transition. Cycle 1 places the first instruction in IF. The instruction moves to ID at cycle 2, EX at 3, MEM at 4, WB at 5, and commits when it leaves WB at cycle 6. Completion includes draining all stages. Thus an independent N-instruction program takes **N+5 displayed transitions** in this implementation. Textbooks counting WB completion in its occupancy cycle commonly use N+4; these are different counting conventions, not directly comparable cycle numbers.

WB commits before ID reads during a transition. Producers currently in EX or MEM block dependent ID instructions; IF and PC freeze, and EX receives a bubble. A producer currently in WB does not block ID. Count one stall per stalled cycle, even when two source registers create two hazard events. Memory reads/writes occur when the old MEM token exits. Uninitialized memory reads zero. R0 is writable. Arithmetic wraps to signed 32 bits. There are no branches, forwarding, caches, exceptions, superscalar issue or out-of-order execution.

## Demo

1. Choose Dependencies and click Initialize program.
2. Click Step four times; point out IF/ID holds and the EX bubble.
3. Click Run, then Pause; resume until completed.
4. Expected: R1=10, R2=20, R3=30, R4=20, R5=20, memory[30]=20.
5. Open Hazard log and explain producer/consumer/register fields.
6. Click Review current run: expected verdict PASS.
7. Generate another program with Assembly Assistant, Use in editor, then Initialize.
8. Reset to show architectural state clearing; export the trace.

## Project references

- `docs/FOLDER_STRUCTURE.md`: every included source file.
- `docs/TEAM_DIVISION.md`: ownership for 7 human members + 2 bots.
- `docs/API.md`: request/response contracts and limits.
- `docs/TESTING.md`: verified checks and manual browser checklist.
- `docs/ARCHITECTURE.md`: module boundaries and extension guidance.

## Limitations

Sessions expire after two hours without mutation and disappear on backend restart. Maximum 100 sessions, 200 instructions, 5000 cycles per session, 40 KB JSON request body. This is a local educational app without accounts or public multi-user security. Pause stops scheduling new steps; an already in-flight Step may finish once. Browser layout/interaction needs the manual checklist in `docs/TESTING.md`; the delivered automated checks cover the engine, API, agents, and frontend compilation.
