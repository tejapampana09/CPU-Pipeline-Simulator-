# Team ownership: 7 members + 2 bots

| Owner | Files | Acceptance responsibility |
|---|---|---|
| Member 1 — Parser | backend/src/parser/assemblyParser.js, validator.js | Operand validation, line errors, internal instruction format |
| Member 2 — CPU | backend/src/cpu/* | Register/memory rules, PC model, signed arithmetic |
| Member 3 — Pipeline | backend/src/pipeline/pipelineEngine.js | Single-cycle immutable transitions, commit order, completion |
| Member 4 — Hazards | backend/src/pipeline/hazardDetector.js, stallController.js | RAW interlocks, IF/ID hold, no lost/duplicated instructions |
| Member 5 — Frontend | frontend/src/App.jsx, api/*, hooks/*, StatePanels.jsx, TeammatePanel.jsx, styles/* | Editor, controls, API state, responsive dashboard |
| Member 6 — Visualization | frontend/src/components/PipelineDiagram.jsx, TimingTable.jsx | Stage animation, timing cells, stall highlighting |
| Member 7 — Integration & Testing | backend/src/app.js, server.js, routes/*, services/*, tests/*, docs/* | API integration, tests, setup, documentation and demo |
| Bot 1 — Assembly Assistant | backend/src/agents/assemblyAssistant.js | Validated assembly proposal from structured inputs |
| Bot 2 — Pipeline Reviewer | backend/src/agents/pipelineReviewer.js | Independent final-state verification and trace-based explanation |

Shared contract changes in shared/contracts.js must be coordinated by Members 1, 2, 3 and 7. Member 5 owns bot UI integration and Member 7 owns bot API tests. The bots are application features; human members remain responsible for the implementation and review.

Suggested integration sequence: parser + CPU → pipeline + hazards → API → frontend + visualization → bots → full regression + demo. Use individual branches; run npm test and npm run build before integration. Forwarding is a future feature and must be added with new timing/hazard tests, documentation and explicit UI mode selection.
