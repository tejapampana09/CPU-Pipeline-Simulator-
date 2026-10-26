/**
 * Smart Assembly Transpiler & Compatibility Engine
 * Translates legacy 8085 & 8086 instructions (MVI, MOV, STA, LDA, 2-operand ALU, [addr] memory syntax)
 * into standard 5-stage RISC pipeline assembly (LI, ADD, SUB, AND, OR, LOAD, STORE).
 */

const REG_MAP = {
  // 8085 8-bit registers
  A: 'R1', // Accumulator maps to R1
  B: 'R2',
  C: 'R3',
  D: 'R4',
  E: 'R5',
  H: 'R6',
  L: 'R7',

  // 8086 16-bit general purpose registers
  AX: 'R1', // Accumulator
  BX: 'R2', // Base
  CX: 'R3', // Counter
  DX: 'R4', // Data
  SI: 'R5', // Source Index
  DI: 'R6', // Destination Index
  BP: 'R7', // Base Pointer
  SP: 'R0', // Stack Pointer

  // 8086 8-bit register halves
  AL: 'R1', AH: 'R1',
  BL: 'R2', BH: 'R2',
  CL: 'R3', CH: 'R3',
  DL: 'R4', DH: 'R4'
};

export function mapRegister(reg) {
  if (!reg) return 'R1';
  const u = reg.trim().toUpperCase();
  return REG_MAP[u] || u;
}

function cleanMemoryBracket(arg) {
  const m = (arg || '').match(/^\[\s*(\d+)\s*\]$/);
  return m ? m[1] : null;
}

export function detectLegacySyntax(source) {
  if (!source) return null;
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].split('#')[0].split(';')[0].trim();
    if (!rawLine) continue;
    const match = rawLine.match(/^([A-Za-z]+)\s*(.*)$/);
    if (!match) continue;
    const op = match[1].toUpperCase();
    const rawArgs = match[2] ? match[2].split(',').map(s => s.trim()) : [];

    // Detect HALT / HLT
    if (['HALT', 'HLT'].includes(op)) {
      return { line: i + 1, reason: `Legacy '${op}' detected (pipeline drains automatically)` };
    }
    // Detect 8086 registers
    if (rawArgs.some(a => /^(AX|BX|CX|DX|SI|DI|BP|SP|AL|AH|BL|BH|CL|CH|DL|DH)$/i.test(a))) {
      return { line: i + 1, reason: `8086 registers (AX..DX) detected` };
    }
    // Detect 8086 memory brackets [addr]
    if (rawArgs.some(a => /^\[\s*\d+\s*\]$/.test(a))) {
      return { line: i + 1, reason: `8086 memory pointer '[addr]' detected` };
    }
    // Detect 8085 opcodes
    if (['MVI', 'STA', 'LDA'].includes(op)) {
      return { line: i + 1, reason: `8085 '${op}' instruction detected` };
    }
    // Detect CISC / 8086 MOV
    if (op === 'MOV') {
      return { line: i + 1, reason: `8086 / CISC 'MOV' instruction detected` };
    }
    // Detect 2-operand ALU
    if (['ADD', 'SUB', 'AND', 'OR'].includes(op) && rawArgs.length === 2) {
      return { line: i + 1, reason: `2-operand '${op}' detected (RISC pipeline needs 3 operands)` };
    }
    // Detect 8085 1-operand accumulator ALU
    if (['ADD', 'SUB', 'AND', 'OR'].includes(op) && rawArgs.length === 1) {
      return { line: i + 1, reason: `8085 accumulator '${op}' detected` };
    }
    // Detect 8085 registers
    if (rawArgs.some(a => /^[ABCDEHL]$/i.test(a))) {
      return { line: i + 1, reason: `8085 register names (A..L) detected` };
    }
  }
  return null;
}

export function transpileToPipelineIsa(source) {
  if (!source) return '';
  const lines = source.split(/\r?\n/);
  const converted = lines.map(line => {
    const commentIdx = line.indexOf('#') !== -1 ? line.indexOf('#') : line.indexOf(';');
    let code = (commentIdx >= 0 ? line.slice(0, commentIdx) : line).trim();
    const comment = commentIdx >= 0 ? ' #' + line.slice(commentIdx + 1).trim() : '';
    if (!code) return line;

    const match = code.match(/^([A-Za-z]+)\s*(.*)$/);
    if (!match) return line;
    const op = match[1].toUpperCase();
    const rawArgs = match[2] ? match[2].split(',').map(s => s.trim()) : [];

    // HALT / HLT -> comment out because pipeline drains naturally
    if (['HALT', 'HLT'].includes(op)) {
      return `# ${op} (pipeline automatically drains when finished)${comment}`;
    }

    // 8086: MOV [30], AX (STORE memory[30] = reg)
    if (op === 'MOV' && rawArgs.length === 2 && cleanMemoryBracket(rawArgs[0])) {
      const addr = cleanMemoryBracket(rawArgs[0]);
      const reg = mapRegister(rawArgs[1]);
      return `STORE ${reg}, ${addr}${comment}`;
    }

    // 8086: MOV AX, [30] (LOAD reg = memory[30])
    if (op === 'MOV' && rawArgs.length === 2 && cleanMemoryBracket(rawArgs[1])) {
      const reg = mapRegister(rawArgs[0]);
      const addr = cleanMemoryBracket(rawArgs[1]);
      return `LOAD ${reg}, ${addr}${comment}`;
    }

    // 1. MVI A, 10  ->  LI R1, 10
    if (op === 'MVI' && rawArgs.length === 2) {
      const reg = mapRegister(rawArgs[0]);
      return `LI ${reg}, ${rawArgs[1]}${comment}`;
    }

    // 2. MOV Rd, imm (immediate integer) -> LI Rd, imm
    if (op === 'MOV' && rawArgs.length === 2 && /^-?\d+$/.test(rawArgs[1])) {
      const reg = mapRegister(rawArgs[0]);
      return `LI ${reg}, ${rawArgs[1]}${comment}`;
    }

    // 3. MOV Rd, Rs (register copy) -> OR Rd, Rs, Rs
    if (op === 'MOV' && rawArgs.length === 2) {
      const rd = mapRegister(rawArgs[0]);
      const rs = mapRegister(rawArgs[1]);
      return `OR ${rd}, ${rs}, ${rs}${comment}`;
    }

    // 4. 8085 single operand ADD B -> ADD R1, R1, R2 (accumulator A = R1)
    if (op === 'ADD' && rawArgs.length === 1) {
      const rs = mapRegister(rawArgs[0]);
      return `ADD R1, R1, ${rs}${comment}`;
    }

    // 5. 8085 single operand SUB B -> SUB R1, R1, R2
    if (op === 'SUB' && rawArgs.length === 1) {
      const rs = mapRegister(rawArgs[0]);
      return `SUB R1, R1, ${rs}${comment}`;
    }

    // 6. 2-operand ADD AX, BX -> ADD R1, R1, R2
    if (['ADD', 'SUB', 'AND', 'OR'].includes(op) && rawArgs.length === 2) {
      const rd = mapRegister(rawArgs[0]);
      const rs = mapRegister(rawArgs[1]);
      return `${op} ${rd}, ${rd}, ${rs}${comment}`;
    }

    // 7. 3-operand with 8085/8086 reg names e.g. ADD AX, BX, CX -> ADD R1, R2, R3
    if (['ADD', 'SUB', 'AND', 'OR'].includes(op) && rawArgs.length === 3) {
      const rd = mapRegister(rawArgs[0]);
      const rs1 = mapRegister(rawArgs[1]);
      const rs2 = mapRegister(rawArgs[2]);
      return `${op} ${rd}, ${rs1}, ${rs2}${comment}`;
    }

    // 8. STA addr -> STORE R1, addr
    if (op === 'STA' && rawArgs.length === 1) {
      return `STORE R1, ${rawArgs[0]}${comment}`;
    }

    // 9. LDA addr -> LOAD R1, addr
    if (op === 'LDA' && rawArgs.length === 1) {
      return `LOAD R1, ${rawArgs[0]}${comment}`;
    }

    // 10. LI with mapped reg
    if (op === 'LI' && rawArgs.length === 2) {
      return `LI ${mapRegister(rawArgs[0])}, ${rawArgs[1]}${comment}`;
    }

    // 11. LOAD / STORE with mapped reg
    if ((op === 'LOAD' || op === 'STORE') && rawArgs.length === 2) {
      return `${op} ${mapRegister(rawArgs[0])}, ${rawArgs[1]}${comment}`;
    }

    return line;
  });

  return converted.join('\n');
}
