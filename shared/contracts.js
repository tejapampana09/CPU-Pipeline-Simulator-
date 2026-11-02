import {ISA, MEMORY_SIZE} from './constants.js';
export {STAGES} from './constants.js';
export const SPEC = Object.fromEntries(Object.entries(ISA).map(([op, spec]) => [op, spec.format.map(k => k === 'imm' ? 'int' : k)]));
export const LIMITS = {instructions:200,cycles:5000,memory:MEMORY_SIZE,sessions:100};
export const SAMPLES = {
 'Dependencies': 'LI R1, 10\nLI R2, 20\nADD R3, R1, R2\nSUB R4, R3, R1\nSTORE R4, 30\nLOAD R5, 30',
 'Independent writes': 'LI R1, 5\nLI R2, 8\nLI R3, 13\nLI R4, 21',
 'Memory & logic': 'LI R1, 12\nLI R2, 10\nAND R3, R1, R2\nOR R4, R1, R2\nSTORE R4, 8\nLOAD R5, 8'
};
