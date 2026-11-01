// Shared ISA rules — the single source of truth for the backend parser and the frontend.

export const REGISTER_COUNT = 8
export const MEMORY_SIZE = 4096

export const ISA = {
  LI:    { format: ['reg', 'imm'],        syntax: 'LI Rd, imm',       semantics: 'Rd ← imm',        summary: 'Load immediate 32-bit constant into register' },
  LOAD:  { format: ['reg', 'imm'],        syntax: 'LOAD Rd, addr',    semantics: 'Rd ← MEM[addr]',  summary: 'Load word from memory address into register' },
  STORE: { format: ['reg', 'addr'],       syntax: 'STORE Rs, addr',   semantics: 'MEM[addr] ← Rs',  summary: 'Write register value to memory address' },
  ADD:   { format: ['reg', 'reg', 'reg'], syntax: 'ADD Rd, Rs, Rt',   semantics: 'Rd ← Rs + Rt',    summary: 'Add two registers' },
  SUB:   { format: ['reg', 'reg', 'reg'], syntax: 'SUB Rd, Rs, Rt',   semantics: 'Rd ← Rs − Rt',    summary: 'Subtract Rt from Rs' },
  MUL:   { format: ['reg', 'reg', 'reg'], syntax: 'MUL Rd, Rs, Rt',   semantics: 'Rd ← Rs × Rt',    summary: 'Multiply two registers' },
  AND:   { format: ['reg', 'reg', 'reg'], syntax: 'AND Rd, Rs, Rt',   semantics: 'Rd ← Rs & Rt',    summary: 'Bitwise AND two registers' },
  OR:    { format: ['reg', 'reg', 'reg'], syntax: 'OR Rd, Rs, Rt',    semantics: 'Rd ← Rs | Rt',    summary: 'Bitwise OR two registers' },
  OUT:   { format: ['reg'],               syntax: 'OUT Rs',           semantics: 'output ← Rs',     summary: 'Print register value' },
}

export const STAGES = ['IF', 'ID', 'EX', 'MEM', 'WB']

export const STAGE_INFO = {
  IF:  { name: 'Instruction Fetch' },
  ID:  { name: 'Decode · Reg Read' },
  EX:  { name: 'Execute · ALU' },
  MEM: { name: 'Memory Access' },
  WB:  { name: 'Write Back' },
}

export const SAMPLE_PROGRAMS = [
  {
    id: 'raw',
    name: 'RAW hazard chain',
    source: `# Back-to-back dependencies — toggle forwarding to compare
LI R1, 10
LI R2, 20
ADD  R3, R1, R2
SUB  R4, R3, R1
STORE R4, 30
LOAD R5, 30`,
  },
  {
    id: 'independent',
    name: 'Independent stream',
    source: `# No dependencies — the ideal pipeline (CPI → 1)
LI R1, 4
LI R2, 9
LI R3, 2
LI R4, 7
LI R5, 3
LI R6, 5`,
  },
  {
    id: 'math',
    name: 'Arithmetic',
    source: `LI R1, 8
LI R2, 3
MUL  R3, R1, R2
ADD  R4, R3, R2
OUT  R4`,
  },
  {
    id: 'memory',
    name: 'Memory writes',
    source: `LI   R1, 42
STORE R1, 100
LOAD  R2, 100
ADD   R3, R1, R2
STORE R3, 101
OUT   R3`,
  },
  {
    id: 'parallel',
    name: 'Parallel mix',
    source: `# Try this in Parallel Issue mode
LI R1, 10
LI R2, 20
LI R5, 7
ADD  R3, R1, R2
SUB  R4, R2, R1
MUL  R6, R5, R1
STORE R3, 30
OUT  R4`,
  },
]
