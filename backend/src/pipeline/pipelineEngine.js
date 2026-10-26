import {execute} from '../cpu/instructionExecutor.js';
import {readMemory,writeMemory} from '../cpu/memory.js';
import {detectHazards} from './hazardDetector.js';
import {applyStall} from './stallController.js';
import {LIMITS} from '../../../shared/contracts.js';
import {fail} from '../parser/validator.js';
export function step(state){
 if(state.status==='completed')return state;
 if(state.cycle>=LIMITS.cycles)throw fail('Session cycle limit reached. Reset to continue.','CYCLE_LIMIT',409);
 const s=structuredClone(state),old=s.pipeline; s.cycle++;s.status='paused';
 if(old.WB){if(old.WB.dst)s.registers[old.WB.dst]=old.WB.result|0;s.statistics.instructionsCompleted++;}
 const hazards=detectHazards(old);
 const next={IF:null,ID:null,EX:null,MEM:null,WB:null};
 if(old.MEM){next.WB={...old.MEM};if(old.MEM.op==='LOAD')next.WB.result=readMemory(s.memory,Number(old.MEM.args[1]));if(old.MEM.op==='STORE')writeMemory(s.memory,Number(old.MEM.args[1]),old.MEM.values[0]);}
 if(old.EX)next.MEM={...old.EX,result:execute(old.EX)};
 if(hazards.length){applyStall(next,old);s.statistics.stalls++;s.events.push(...hazards.map(h=>({...h,cycle:s.cycle,type:'RAW',reason:`R${h.register.slice(1)} is awaiting writeback; hold IF/ID and insert an EX bubble.`})));}
 else {
  if(old.ID)next.EX={...old.ID,values:old.ID.src.map(r=>s.registers[r])};
  next.ID=old.IF;
  if(s.pc/4<s.program.length){next.IF={...s.program[s.pc/4]};s.pc+=4;}
 }
 s.pipeline=next;
 if(s.pc/4>=s.program.length&&Object.values(next).every(x=>x===null))s.status='completed';
 s.statistics.cycles=s.cycle;
 const n=s.statistics.instructionsCompleted;s.statistics.cpi=n?s.cycle/n:null;s.statistics.ipc=n/s.cycle;
 s.history.push({cycle:s.cycle,stages:Object.fromEntries(Object.entries(next).map(([k,v])=>[k,v?.id??null])),stalled:hazards.length>0});
 return s;
}
