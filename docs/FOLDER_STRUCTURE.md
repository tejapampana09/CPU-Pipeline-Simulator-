# Folder structure

- `shared/`: canonical ISA/constants, derived contracts, pure parser and validator.
- `backend/src/parser/`: compatibility exports for the shared parser/validator.
- `backend/src/cpu/`: machine, registers, memory and instruction execution.
- `backend/src/pipeline/`: five-stage engine, hazard detection and stalls.
- `backend/src/parallel/`: dependency scheduling engine with register/memory/output ordering.
- `backend/src/services/`: sessions, trace adapter and two AI teammate services.
- `backend/src/agents/`: template author and independent sequential verifier.
- `backend/src/routes/`: simulation and teammate APIs.
- `frontend/src/api/`: one API transport and session/trace orchestration.
- `frontend/src/hooks/`: server-trace playback and session cleanup.
- `frontend/src/components/`: editor, controls, visualization, state panels and teammates.
- `frontend/src/sim/parser.js`: thin canonical validation adapter; no browser CPU engines.
- `frontend/src/utils/transpiler.js`: legacy 8085/8086 conversion.
- `tests/`: seven suites covering execution, APIs, forwarding, parallel, transpiler and architecture regressions.
- `docs/`: API, architecture, testing and team/viva references.
