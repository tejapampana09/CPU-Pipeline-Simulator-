# Complete source folder structure

Generated from the delivered project. node_modules and build output are excluded.

```text
coa-pipeline-simulator/
  .gitignore
  README.md
  backend/.env.example
  backend/package.json
  backend/src/agents/assemblyAssistant.js
  backend/src/agents/pipelineReviewer.js
  backend/src/app.js
  backend/src/cpu/instructionExecutor.js
  backend/src/cpu/machine.js
  backend/src/cpu/memory.js
  backend/src/cpu/registerFile.js
  backend/src/parser/assemblyParser.js
  backend/src/parser/validator.js
  backend/src/pipeline/hazardDetector.js
  backend/src/pipeline/pipelineEngine.js
  backend/src/pipeline/stallController.js
  backend/src/routes/simulation.routes.js
  backend/src/routes/teammate.routes.js
  backend/src/server.js
  backend/src/services/aiService.js
  backend/src/services/simulationService.js
  backend/.env
  docs/API.md
  docs/ARCHITECTURE.md
  docs/PROJECT_OVERVIEW_AND_VIVA_GUIDE.md
  docs/TEAM_DIVISION.md
  docs/TESTING.md
  frontend/index.html
  frontend/package.json
  frontend/src/App.jsx
  frontend/src/api/simulationApi.js
  frontend/src/components/PipelineDiagram.jsx
  frontend/src/components/StatePanels.jsx
  frontend/src/components/TeammatePanel.jsx
  frontend/src/components/TimingTable.jsx
  frontend/src/hooks/useSimulation.js
  frontend/src/main.jsx
  frontend/src/styles/app.css
  frontend/vite.config.js
  package-lock.json
  package.json
  shared/contracts.js
  tests/api.test.js
  tests/core.test.js
  docs/FOLDER_STRUCTURE.md
```

Run npm ci to restore dependencies, npm run build to generate frontend/dist.
