import {createRegisters} from './registerFile.js';
import {STAGES} from '../../../shared/contracts.js';
export function createMachine(program){return {program,cycle:0,pc:0,status:'ready',registers:createRegisters(),memory:{},pipeline:Object.fromEntries(STAGES.map(s=>[s,null])),history:[],events:[],statistics:{instructionsLoaded:program.length,instructionsCompleted:0,cycles:0,stalls:0,cpi:null,ipc:0}};}
