# Testing

Run `npm ci`, `npm test`, and `npm run build` from the repository root.

The suite registers 38 tests across seven files. Coverage includes canonical parser and range parity, signed arithmetic, MUL/OUT, default-zero LOAD, forwarding on/off and load-use stalls, lifecycle/trace API, selected-cycle review, forged snapshot rejection, parallel RAW/WAR/WAW and memory ordering (including equivalent numeric addresses), output ordering, independent issue width, transpiler behavior and honest offline teammate status. Seeded generated programs are compared with an independent sequential interpreter for pipeline and parallel configurations.

Gemini live requests require an API key and are not exercised by the offline suite.

Manual browser checklist: assemble samples in both modes; toggle forwarding and issue width; play/pause/step/back/reset/seek; inspect timing, registers, memory and outputs; generate and load Bot 1 code; review pending and complete cycles with Bot 2; stop backend and confirm visible request failure. Check desktop and mobile layouts. API tests and production compilation do not substitute for browser interaction checks.
