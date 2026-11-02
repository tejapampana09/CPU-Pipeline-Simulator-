import {createRegisters} from './registerFile.js';
import {STAGES} from '../../../shared/contracts.js';
export function createMachine(program, options = {}){
  const forwarding = Boolean(options?.forwarding);
  return {
    program,
    cycle: 0,
    pc: 0,
    status: 'ready',
    forwarding,
    registers: createRegisters(),
    memory: {},
    output: [],
    mode: options.mode || 'pipeline',
    issueWidth: options.issueWidth ?? 0,
    pipeline: Object.fromEntries(STAGES.map(s => [s, null])),
    history: [],
    events: [],
    statistics: {
      instructionsLoaded: program.length,
      instructionsCompleted: 0,
      cycles: 0,
      stalls: 0,
      forwards: 0,
      cpi: null,
      ipc: 0
    }
  };
}
