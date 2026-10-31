// Shared ISA rules — the single source of truth for the backend parser and the frontend.

export const REGISTER_COUNT = 8
export const MEMORY_SIZE = 4096

export const ISA = {
  LOAD:  { format: ['reg', 'imm'],        syntax: 'LOAD Rd, imm',     semantics: 'Rd ← imm',        summary: 'Load an immediate value' },
  LI:    { format: ['reg', 'imm'],        syntax: 'LI Rd, imm',       semantics: 'Rd ← imm',        summary: 'Load an immediate value' },
  ADD:   { format: ['reg', 'reg', 'reg'], syntax: 'ADD Rd, Rs, Rt',   semantics: 'Rd ← Rs + Rt',    summary: 'Add two registers' },
  SUB:   { format: ['reg', 'reg', 'reg'], syntax: 'SUB Rd, Rs, Rt',   semantics: 'Rd ← Rs − Rt',    summary: 'Subtract Rt from Rs' },
  MUL:   { format: ['reg', 'reg', 'reg'], syntax: 'MUL Rd, Rs, Rt',   semantics: 'Rd ← Rs × Rt',    summary: 'Multiply two registers' },
  AND:   { format: ['reg', 'reg', 'reg'], syntax: 'AND Rd, Rs, Rt',   semantics: 'Rd ← Rs & Rt',    summary: 'Bitwise AND two registers' },
  OR:    { format: ['reg', 'reg', 'reg'], syntax: 'OR Rd, Rs, Rt',    semantics: 'Rd ← Rs | Rt',    summary: 'Bitwise OR two registers' },
  STORE: { format: ['reg', 'addr'],       syntax: 'STORE Rs, addr',   semantics: 'MEM[addr] ← Rs',  summary: 'Write a register to memory' },
  OUT:   { format: ['reg'],               syntax: 'OUT Rs',           semantics: 'output ← Rs',     summary: 'Print a register value' },
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
LOAD R1, 10
LOAD R2, 20
ADD  R3, R1, R2
SUB  R4, R3, R1
STORE R4, 30`,
  },
  {
    id: 'independent',
    name: 'Independent stream',
    source: `# No dependencies — the ideal pipeline (CPI → 1)
LOAD R1, 4
LOAD R2, 9
LOAD R3, 2
LOAD R4, 7
LOAD R5, 3
LOAD R6, 5`,
  },
  {
    id: 'math',
    name: 'Arithmetic',
    source: `LOAD R1, 8
LOAD R2, 3
MUL  R3, R1, R2
ADD  R4, R3, R2
OUT  R4`,
  },
  {
    id: 'memory',
    name: 'Memory writes',
    source: `LOAD  R1, 42
STORE R1, 100
LOAD  R2, 7
ADD   R3, R1, R2
STORE R3, 101
OUT   R3`,
  },
  {
    id: 'parallel',
    name: 'Parallel mix',
    source: `# Try this in Parallel Issue mode
LOAD R1, 10
LOAD R2, 20
LOAD R5, 7
ADD  R3, R1, R2
SUB  R4, R2, R1
MUL  R6, R5, R1
STORE R3, 30
OUT  R4`,
  },
]
