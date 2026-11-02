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

test('Memory & State: STORE writes to memory and LOAD reads it back into registers', () => {
  const code = [
    'LI R1, 1234',
    'STORE R1, 250',
    'LOAD R2, 250',
    'LI R3, 500',
    'STORE R3, 251',
    'LOAD R4, 251'
  ].join('\n');

  const s = runPipeline(code);
  assert.equal(s.memory[250], 1234);
  assert.equal(s.memory[251], 500);
  assert.equal(s.registers.R2, 1234);
  assert.equal(s.registers.R4, 500);
  assert.equal(review(s).verdict, 'pass');
});

test('ALU Logic: verifies 32-bit AND, OR, ADD, SUB arithmetic correctness', () => {
  const code = [
    'LI R1, 12',     // 1100 in binary
    'LI R2, 10',     // 1010 in binary
    'AND R3, R1, R2', // 1000 in binary = 8
    'OR R4, R1, R2',  // 1110 in binary = 14
    'SUB R5, R1, R2', // 12 - 10 = 2
    'ADD R6, R4, R5'  // 14 + 2 = 16
  ].join('\n');

  const s = runPipeline(code);
  assert.equal(s.registers.R3, 8);
  assert.equal(s.registers.R4, 14);
  assert.equal(s.registers.R5, 2);
  assert.equal(s.registers.R6, 16);
  assert.equal(review(s).verdict, 'pass');
});

test('Boundary & Negative Numbers: verifies signed negative integers and two\'s complement', () => {
  const code = [
    'LI R1, -50',
    'LI R2, -25',
    'ADD R3, R1, R2', // -50 + -25 = -75
    'SUB R4, R1, R2'  // -50 - (-25) = -25
  ].join('\n');

  const s = runPipeline(code);
  assert.equal(s.registers.R3, -75);
  assert.equal(s.registers.R4, -25);
  assert.equal(review(s).verdict, 'pass');
});
