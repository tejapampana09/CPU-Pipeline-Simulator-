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
 const forwarding=Boolean(s.forwarding);
 const hazards=detectHazards(old, forwarding);
 const next={IF:null,ID:null,EX:null,MEM:null,WB:null};
 if(old.MEM){next.WB={...old.MEM};if(old.MEM.op==='LOAD')next.WB.result=readMemory(s.memory,Number(old.MEM.args[1]));if(old.MEM.op==='STORE')writeMemory(s.memory,Number(old.MEM.args[1]),old.MEM.values[0]);}
 if(old.EX)next.MEM={...old.EX,result:execute(old.EX)};
 if(hazards.length){
   applyStall(next,old);
   s.statistics.stalls++;
   s.events.push(...hazards.map(h=>({...h,cycle:s.cycle,type:'RAW',reason:h.isLoadUse?`Load-use hazard on ${h.register}; 1 cycle bubble inserted while LOAD reads data memory.`:`R${h.register.slice(1)} is awaiting writeback; hold IF/ID and insert an EX bubble.`})));
 }
 else {
   if(old.ID){
     let forwardEvents = [];
     const values = old.ID.src.map(r => {
       if (forwarding) {
         // EX/MEM to EX forwarding (most recent ALU computation in this cycle)
         if (next.MEM && next.MEM.dst === r) {
           forwardEvents.push({register: r, from: 'EX/MEM'});
           return next.MEM.result;
         }
         // MEM/WB to EX forwarding (stage that just completed memory or ALU computation)
         if (next.WB && next.WB.dst === r) {
           forwardEvents.push({register: r, from: 'MEM/WB'});
           return next.WB.result;
         }
       }
       return s.registers[r];
     });
     next.EX = {...old.ID, values};
     if (forwardEvents.length > 0) {
       s.statistics.forwards = (s.statistics.forwards || 0) + forwardEvents.length;
       for (const f of forwardEvents) {
         s.events.push({
           cycle: s.cycle,
           type: 'FORWARD',
           register: f.register,
           producerStage: f.from,
           consumerId: old.ID.id,
           reason: `${f.register} bypassed from ${f.from} directly into EX ALU input (0 stall cycles)`
         });
       }
     }
   }
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
