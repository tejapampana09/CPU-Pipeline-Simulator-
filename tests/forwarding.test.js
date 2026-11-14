import test from 'node:test';
import assert from 'node:assert/strict';
import {parse} from '../backend/src/parser/assemblyParser.js';
import {createMachine} from '../backend/src/cpu/machine.js';
import {step} from '../backend/src/pipeline/pipelineEngine.js';
import {review} from '../backend/src/agents/pipelineReviewer.js';

function runPipeline(source, forwarding = false) {
  let s = createMachine(parse(source), { forwarding });
  for (let i = 0; i < 5000 && s.status !== 'completed'; i++) {
    s = step(s);
  }
  assert.equal(s.status, 'completed');
  return s;
}

test('Hardware forwarding: eliminates ALU-to-ALU RAW stalls completely (0 stalls)', () => {
  const code = 'LI R1, 10\nADD R2, R1, R1\nSUB R3, R2, R1';
  
  // Without forwarding: 4 stall cycles (2 stalls per dependent instruction)
  const noFwd = runPipeline(code, false);
  assert.equal(noFwd.statistics.stalls, 4);
  assert.equal(noFwd.cycle, 11);
  assert.equal(noFwd.registers.R2, 20);
  assert.equal(noFwd.registers.R3, 10);

  // With forwarding: 0 stall cycles (ALU outputs bypass directly into EX)
  const fwd = runPipeline(code, true);
  assert.equal(fwd.statistics.stalls, 0);
  assert.equal(fwd.cycle, 7);
  assert.equal(fwd.registers.R2, 20);
  assert.equal(fwd.registers.R3, 10);
  assert.ok(fwd.statistics.forwards >= 2);
});

test('Hardware forwarding: proves significant clock cycle reduction and speedup', () => {
  const code = [
    'LI R1, 10',
    'LI R2, 20',
    'ADD R3, R1, R2',
    'SUB R4, R3, R1',
    'STORE R4, 30'
  ].join('\n');

  const noFwd = runPipeline(code, false);
  const fwd = runPipeline(code, true);

  // Verifies cycle reduction
  assert.equal(noFwd.cycle, 15);
  assert.equal(fwd.cycle, 9);
  assert.equal(noFwd.statistics.stalls, 6);
  assert.equal(fwd.statistics.stalls, 0);

  // Speedup: 15 cycles / 9 cycles ≈ 1.67x speedup
  const speedup = noFwd.cycle / fwd.cycle;
  assert.ok(speedup >= 1.5, `Speedup should be at least 1.5x, got ${speedup}`);

  // Both modes must calculate identical architectural results
  assert.equal(fwd.registers.R4, noFwd.registers.R4);
  assert.equal(fwd.memory[30], noFwd.memory[30]);
  assert.equal(review(fwd).verdict, 'pass');
});

test('Hardware forwarding: enforces exactly 1 stall cycle on Load-Use hazard', () => {
  // LOAD reads data memory in the MEM stage. An immediate consumer in ID
  // cannot bypass until MEM finishes, requiring exactly 1 stall bubble.
  const loadUseCode = 'LOAD R1, 10\nADD R2, R1, R1';

  // Without forwarding: stalls 2 cycles until WB
  const noFwd = runPipeline(loadUseCode, false);
  assert.equal(noFwd.statistics.stalls, 2);

  // With forwarding: stalls exactly 1 cycle (MEM to EX forwarding)
  const fwd = runPipeline(loadUseCode, true);
  assert.equal(fwd.statistics.stalls, 1);
  assert.equal(fwd.cycle, 7); // 2 inst + 1 stall + 4 = 7 cycles
});

test('Hardware forwarding: handles chaining of EX/MEM and MEM/WB bypass paths', () => {
  const chainCode = [
    'LI R1, 5',
    'ADD R2, R1, R1',   // Needs R1 from EX/MEM -> EX (forwarded)
    'ADD R3, R2, R1',   // Needs R2 from EX/MEM and R1 from MEM/WB (both forwarded)
    'SUB R4, R3, R2'    // Needs R3 from EX/MEM and R2 from MEM/WB (both forwarded)
  ].join('\n');

  const fwd = runPipeline(chainCode, true);
  assert.equal(fwd.statistics.stalls, 0);
  assert.equal(fwd.registers.R1, 5);
  assert.equal(fwd.registers.R2, 10);
  assert.equal(fwd.registers.R3, 15);
  assert.equal(fwd.registers.R4, 5);
  assert.equal(review(fwd).verdict, 'pass');
});

