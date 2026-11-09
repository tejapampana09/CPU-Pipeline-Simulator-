import test from 'node:test';
import assert from 'node:assert/strict';
import {transpileToRisc, detectLegacySyntax, mapRegister} from '../frontend/src/utils/transpiler.js';
import {parse} from '../shared/parser.js';
import {executeTrace} from '../backend/src/services/traceService.js';

test('Transpiler: refuses byte-register aliasing and preserves source on rejection', () => {
  const source='MOV AL, 1\nMOV AH, 2\nMOV BX, AX';
  assert.throws(()=>transpileToRisc(source),/Line 1: byte-register/);
  for(const reg of ['AL','AH','BL','BH','CL','CH','DL','DH']) assert.throws(()=>mapRegister(reg),/unsupported/);
});

test('Transpiler: only accepts a final halt, and validates the complete converted program', () => {
  assert.throws(()=>transpileToRisc('LI R1, 1\nHLT\nLI R1, 2'),/Instructions after a halt/);
  assert.throws(()=>transpileToRisc('MOV AX, 1\nHALT AX'),/without operands/);
  assert.throws(()=>transpileToRisc('MOV AX, 1\nJMP 0'),/Line 2: unsupported conversion/);
  const converted=transpileToRisc('MOV AX, 7 ; first # second\nHLT\n# end');
  assert.equal(executeTrace(parse(converted)).at(-1).registers.R1,7);
});

test('Transpiler: translates 8086 MOV and 8085 MVI immediate values to LI', () => {
  const code8086 = 'MOV AX, 15\nMOV BX, 25';
  const risc = transpileToRisc(code8086);
  assert.equal(risc, 'LI R1, 15\nLI R2, 25');

  const code8085 = 'MVI A, 42\nMVI B, 8';
  assert.equal(transpileToRisc(code8085), 'LI R1, 42\nLI R2, 8');
});

test('Transpiler: converts 2-operand ALU instructions into 3-operand RISC instructions', () => {
  const code = 'ADD AX, BX\nSUB CX, DX\nAND SI, DI';
  const risc = transpileToRisc(code);
  assert.equal(risc, 'ADD R1, R1, R2\nSUB R3, R3, R4\nAND R5, R5, R6');
});

test('Transpiler: converts bracketed memory access [addr] into LOAD and STORE', () => {
  // Store register AX into memory address 50
  const storeCode = 'MOV [50], AX';
  assert.equal(transpileToRisc(storeCode), 'STORE R1, 50');

  // Load from memory address 50 into register AX
  const loadCode = 'MOV AX, [50]';
  assert.equal(transpileToRisc(loadCode), 'LOAD R1, 50');

  // 8085 STA / LDA
  assert.equal(transpileToRisc('STA 100'), 'STORE R1, 100');
  assert.equal(transpileToRisc('LDA 100'), 'LOAD R1, 100');
});

test('Transpiler: detects legacy syntax in user code and returns explanatory reason', () => {
  const notice1 = detectLegacySyntax('MOV AX, 10');
  assert.ok(notice1);
  assert.equal(notice1.line, 1);
  assert.match(notice1.reason, /8086|MOV/i);

  const notice2 = detectLegacySyntax('# Clean code\nADD R1, R2, R3\nHLT');
  assert.ok(notice2);
  assert.equal(notice2.line, 3);
  assert.match(notice2.reason, /HLT|HALT/i);

  // Pure 5-stage RISC code should NOT trigger legacy warnings
  const cleanCode = 'LI R1, 10\nADD R2, R1, R1\nSTORE R2, 20';
  assert.equal(detectLegacySyntax(cleanCode), null);
});

test('Transpiler: maps standard 8086 registers correctly to R0-R7', () => {
  assert.equal(mapRegister('AX'), 'R1');
  assert.equal(mapRegister('BX'), 'R2');
  assert.equal(mapRegister('CX'), 'R3');
  assert.equal(mapRegister('DX'), 'R4');
  assert.equal(mapRegister('SI'), 'R5');
  assert.equal(mapRegister('DI'), 'R6');
  assert.equal(mapRegister('BP'), 'R7');
  assert.equal(mapRegister('SP'), 'R0');
});

