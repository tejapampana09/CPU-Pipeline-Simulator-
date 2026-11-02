import {execute} from '../cpu/instructionExecutor.js';
import {readMemory,writeMemory} from '../cpu/memory.js';

// Teaching model: dependency-ready instructions execute in one cycle. This is
// not a cycle-accurate superscalar pipeline. Values are read at issue time.
export function dependencies(program) {
 return program.map((cur,i)=>program.slice(0,i).filter(prev=>
  (prev.dst && (cur.src.includes(prev.dst)||cur.dst===prev.dst)) ||
  (cur.dst && prev.src.includes(cur.dst)) ||
  (['LOAD','STORE'].includes(cur.op)&&['LOAD','STORE'].includes(prev.op)&&
   Number(cur.args[1])===Number(prev.args[1])&&(cur.op==='STORE'||prev.op==='STORE')) ||
  (cur.op==='OUT'&&prev.op==='OUT')
 ).map(p=>p.id));
}
export function stepParallel(state) {
 if(state.status==='completed')return state;
 const s=structuredClone(state), deps=dependencies(s.program);
 const done=new Set(s.done??[]);
 const batch=s.program.filter(p=>!done.has(p.id)&&deps[p.id].every(id=>done.has(id)))
  .slice(0,s.issueWidth||Infinity);
 s.cycle++;s.status='paused';s.details={};s.executing=batch.map(p=>p.id+1);
 s.events.push({cycle:s.cycle,type:'ISSUE',reason:`Issued ${batch.length} instruction(s)`});
 for(const inst of batch){
  const values=inst.src.map(r=>s.registers[r]);
  if(inst.op==='STORE')writeMemory(s.memory,Number(inst.args[1]),values[0]);
  else if(inst.op==='LOAD')s.registers[inst.dst]=readMemory(s.memory,Number(inst.args[1]));
  else if(inst.op==='OUT')s.output.push({cycle:s.cycle,id:inst.id+1,reg:inst.args[0],value:values[0]});
  else s.registers[inst.dst]=execute({...inst,values})|0;
  const value=inst.dst?s.registers[inst.dst]:values[0];
  s.details[inst.id+1]={value,a:values[0],b:values[1],note:inst.op==='OUT'?`OUT ${value}`:inst.op==='STORE'?`MEM[${inst.args[1]}] ← ${value}`:`${inst.dst} ← ${value}`};
  done.add(inst.id);
 }
 s.done=[...done];s.statistics.instructionsCompleted=done.size;
 s.statistics.cycles=s.cycle;s.statistics.cpi=s.cycle/done.size;s.statistics.ipc=done.size/s.cycle;
 s.statistics.peak=Math.max(s.statistics.peak??0,batch.length);
 if(done.size===s.program.length)s.status='completed';
 return s;
}
