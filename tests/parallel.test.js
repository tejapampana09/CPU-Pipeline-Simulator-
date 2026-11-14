import test from 'node:test';
import assert from 'node:assert/strict';
import {parse} from '../shared/parser.js';
import {buildTrace} from '../backend/src/services/traceService.js';
import {createMachine} from '../backend/src/cpu/machine.js';
const simulate=(source,options)=>buildTrace(createMachine(parse(source),options));

test('Parallel Issue: unbounded issue executes independent instructions in 1 cycle', () => {
  const code = [
    'LI R1, 10',
    'LI R2, 20',
    'LI R3, 30',
    'LI R4, 40'
  ].join('\n');

  const res = simulate(code, { mode: 'parallel', issueWidth: 0 });
  assert.equal(res.mode, 'parallel');
  assert.equal(res.summary.cycles, 1);
  assert.equal(res.summary.peak, 4);
  assert.equal(res.snapshots[1].executing.length, 4);
  assert.equal(res.snapshots[1].registers.R1, 10);
  assert.equal(res.snapshots[1].registers.R4, 40);
});

test('Parallel Issue: 2-wide superscalar issues at most 2 instructions per cycle', () => {
  const code = [
    'LI R1, 10',
    'LI R2, 20',
    'LI R3, 30',
    'LI R4, 40'
  ].join('\n');

  const res = simulate(code, { mode: 'parallel', issueWidth: 2 });
  assert.equal(res.summary.cycles, 2);
  assert.equal(res.summary.peak, 2);
  assert.equal(res.snapshots[1].executing.length, 2);
  assert.equal(res.snapshots[2].executing.length, 2);
});

test('Parallel Issue: preserves RAW, WAR, and WAW dependency order', () => {
  const code = [
    'LI R1, 10',       // Inst 1: writes R1
    'ADD R2, R1, R1',   // Inst 2: RAW on R1 from Inst 1
    'LI R1, 99',        // Inst 3: WAW with Inst 1, WAR with Inst 2
    'ADD R3, R2, R1'    // Inst 4: RAW on R2 (Inst 2) and R1 (Inst 3)
  ].join('\n');

  const res = simulate(code, { mode: 'parallel', issueWidth: 0 });
  
  // Inst 2 must execute strictly AFTER Inst 1
  // Inst 4 must execute strictly AFTER Inst 2 and Inst 3
  assert.ok(res.summary.cycles >= 3);
  const last = res.snapshots[res.snapshots.length - 1];
  assert.equal(last.registers.R2, 20); // 10 + 10 = 20
  assert.equal(last.registers.R1, 99); // updated to 99
  assert.equal(last.registers.R3, 119); // 20 + 99 = 119
});

test('Parallel Issue: width one preserves sequential architectural results and output order', () => {
  const source = [
    'LI R1, 7',
    'LI R2, 3',
    'MUL R3, R1, R2',
    'STORE R3, 4',
    'LOAD R4, 4',
    'OUT R4'
  ].join('\\n');
  const serial = simulate(source, { mode: 'parallel', issueWidth: 1 });
  const pipeline = simulate(source, { mode: 'pipeline', forwarding: true });
  assert.equal(serial.summary.cycles, 6);
  assert.ok(serial.snapshots.slice(1).every(s => s.executing.length <= 1));
  assert.deepEqual(serial.snapshots.at(-1).registers, pipeline.snapshots.at(-1).registers);
  assert.deepEqual(serial.snapshots.at(-1).memory, pipeline.snapshots.at(-1).memory);
  assert.deepEqual(serial.snapshots.at(-1).output.map(x => x.value), [21]);
  assert.deepEqual(pipeline.snapshots.at(-1).output.map(x => x.value), [21]);
});
