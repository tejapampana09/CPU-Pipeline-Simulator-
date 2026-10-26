export const STAGES = ['IF','ID','EX','MEM','WB'];
export const SPEC = {LI:['reg','int'],ADD:['reg','reg','reg'],SUB:['reg','reg','reg'],AND:['reg','reg','reg'],OR:['reg','reg','reg'],LOAD:['reg','addr'],STORE:['reg','addr']};
export const LIMITS = {instructions:200,cycles:5000,memory:1024,sessions:100};
export const SAMPLES = {
 'Dependencies': 'LI R1, 10\nLI R2, 20\nADD R3, R1, R2\nSUB R4, R3, R1\nSTORE R4, 30\nLOAD R5, 30',
 'Independent writes': 'LI R1, 5\nLI R2, 8\nLI R3, 13\nLI R4, 21',
 'Memory & logic': 'LI R1, 12\nLI R2, 10\nAND R3, R1, R2\nOR R4, R1, R2\nSTORE R4, 8\nLOAD R5, 8'
};
