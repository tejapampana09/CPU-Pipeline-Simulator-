# COA Group Project: CPU Pipeline Simulator & Visualizer
## Project Specification vs. Implementation Analysis & Presentation Guide

> **Project Title:** Interactive CPU Pipeline Simulator and Visualization Tool  
> **Architecture:** 5-Stage MIPS-style Pipeline (IF → ID → EX → MEM → WB)  
> **Tech Stack:** React (Vite) Frontend + Node.js (Express) Authoritative Engine + Google Gemini AI  
> **Team Structure:** 7 Human Members + 2 Virtual AI Teammates

---

## 1. Specification Compliance Checklist

| Feature from Spec | Status | Where it is Implemented | Details |
|---|:---:|---|---|
| **5-Stage Pipeline** (IF, ID, EX, MEM, WB) | ✅ 100% | `backend/src/pipeline/pipelineEngine.js` | Single-cycle transition state machine with distinct stages. |
| **Simultaneous Overlapping Execution** | ✅ 100% | `frontend/src/components/PipelineDiagram.jsx` | Stage cards animate simultaneously showing distinct instructions per cycle. |
| **Cycle-by-Cycle Timing Diagram** | ✅ 100% | `frontend/src/components/TimingTable.jsx` | Grid showing instructions along Y-axis and Cycles along X-axis with color-coded stage cells. |
| **Interactive Controls** (Step, Run, Pause, Reset, Delay) | ✅ 100% | `frontend/src/App.jsx`, `hooks/useSimulation.js` | Single-cycle stepping, automated playback with customizable delay, and reset. |
| **Registers Display** (R0–R7) | ✅ 100% | `frontend/src/components/StatePanels.jsx` | 8 signed 32-bit registers, live highlight of non-zero and updated values. |
| **Memory Display** (1024 Words) | ✅ 100% | `frontend/src/components/StatePanels.jsx` | Word-addressed memory table tracking loads and stores. |
| **Hazard Detection & Stalls** | ✅ 100% | `backend/src/pipeline/hazardDetector.js`, `stallController.js` | Detects RAW dependencies; freezes PC and IF/ID; injects EX bubbles. |
| **7-Member Work Division** | ✅ 100% | `docs/TEAM_DIVISION.md` | Modular separation of responsibilities for all 7 team members. |
| **AI Bot Teammates** | 🚀 Enhanced | `backend/src/services/aiService.js`, `frontend/src/components/TeammatePanel.jsx` | Natural Language to Assembly generator + AI Pipeline Coach & Optimizer. |

---

## 2. Team Division & Presentation Ownership Guide

Each member has an isolated module and a clear narrative for faculty questions and viva:

### Detailed Member Responsibilities:

1. **Member 1 — Assembly Parser (`backend/src/parser/assemblyParser.js`, `validator.js`)**
   * **Role:** Parses user input assembly text, handles uppercase/lowercase, comments (`#`), operand counts, and register validation (`R0`–`R7`).
   * **Viva Talking Point:** *"My module is the gatekeeper. It parses assembly instructions into structured AST objects with PC offsets and flags syntax or operand errors at the exact line number."*

2. **Member 2 — CPU / Architectural Model (`backend/src/cpu/machine.js`, `registerFile.js`, `memory.js`)**
   * **Role:** Implements the 8 signed 32-bit registers (`R0`–`R7`), 1024-word memory, and wraps 32-bit two's-complement arithmetic.
   * **Viva Talking Point:** *"I manage the architectural state. R0 is writable, memory defaults to 0, and arithmetic correctly wraps to 32-bit signed integers."*

3. **Member 3 — Pipeline Engine (`backend/src/pipeline/pipelineEngine.js`, `instructionExecutor.js`)**
   * **Role:** Implements the 5-stage clock cycle state transitions. WB commits first so ID can read updated registers in the same cycle.
   * **Viva Talking Point:** *"I ensure that an instruction advances strictly IF → ID → EX → MEM → WB. A complete execution takes N+5 cycles under our published occupancy convention."*

4. **Member 4 — Hazard Detection & Stall Controller (`backend/src/pipeline/hazardDetector.js`, `stallController.js`)**
   * **Role:** Detects RAW (Read After Write) hazards. If an instruction in ID needs a register currently in EX or MEM, it signals the controller to freeze IF & ID and inject a bubble (NOP) into EX.
   * **Viva Talking Point:** *"Without forwarding, a producer in EX or MEM causes 2 stall cycles. My controller prevents data hazards by locking the program counter and injecting bubbles."*

5. **Member 5 — Frontend Dashboard & Controls (`frontend/src/App.jsx`, `useSimulation.js`, `StatePanels.jsx`)**
   * **Role:** Built the React single-page app, state synchronization, editor controls, speed toggles, and live registers/memory display.
   * **Viva Talking Point:** *"I built the client UI. The backend is the single source of truth; the UI renders authoritative snapshots returned on every clock cycle."*

6. **Member 6 — Pipeline Visualizer & Timing Matrix (`frontend/src/components/PipelineDiagram.jsx`, `TimingTable.jsx`)**
   * **Role:** Animated stage cards showing instruction tokens in IF, ID, EX, MEM, WB, and the dynamic timing diagram grid.
   * **Viva Talking Point:** *"My component visualizes concurrency. It clearly renders overlapping instructions across clock cycles and visually flags stalls in orange."*

7. **Member 7 — Integration, Test Automation & AI Teammates (`backend/src/app.js`, `aiService.js`, `tests/*`)**
   * **Role:** End-to-end integration, 16 automated regression tests, differential testing against a sequential interpreter, and the Google Gemini AI Bot Teammates.
   * **Viva Talking Point:** *"I integrated all sub-modules, authored 16 automated tests including a 100-program random differential verification, and built the dual-mode AI Assistant."*

---

## 3. Demo Walkthrough for Presentation

1. **Step 1: Open the App** (`http://localhost:5173`)
2. **Step 2: Load Dependencies Example**
   * Select `Dependencies` from the dropdown and click **Initialize program**.
3. **Step 3: Step-by-Step Execution**
   * Click **Step** 4 times. Point out how `LI R1, 10` is in EX/MEM while `ADD R3, R1, R2` in ID is stalled.
   * Show the orange **Bubble** injected into EX and explain the RAW hazard to the evaluators.
4. **Step 4: Automatic Run**
   * Click **Run** and watch the instructions fluidly drain through WB.
   * Show that `R1=10, R2=20, R3=30, R4=20, R5=20, Memory[30]=20`.
5. **Step 5: Show the Timing Diagram**
   * Scroll horizontally to show the diagonal pipeline flow:
     ```
     I1: IF  ID  EX  MEM  WB
     I2:     IF  ID  EX   MEM  WB
     I3:         IF  ID   --   --   EX  MEM  WB
     ```
6. **Step 6: Demonstrate the AI Teammates**
   * Click **AI Assembly Architect** → select *"RAW Hazard Demo"* → click **Generate with AI** → **Use in editor**.
   * Run the simulation and click **Explain & Optimize with AI** to display the automated COA breakdown!
