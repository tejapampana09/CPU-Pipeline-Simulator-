// Independent sequential interpreter: intentionally does not use pipeline execution helpers.
export function review(s){
 const registers=Object.fromEntries(Array.from({length:8},(_,i)=>['R'+i,0])),memory={},output=[];
 for(const {op,args:x} of s.program){const a=registers[x[1]],b=registers[x[2]];switch(op){case 'LI':registers[x[0]]=Number(x[1]);break;case 'ADD':registers[x[0]]=(a+b)|0;break;case 'MUL':registers[x[0]]=Math.imul(a,b);break;case 'OUT':output.push(registers[x[0]]);break;case 'SUB':registers[x[0]]=(a-b)|0;break;case 'AND':registers[x[0]]=a&b;break;case 'OR':registers[x[0]]=a|b;break;case 'LOAD':registers[x[0]]=memory[Number(x[1])]??0;break;case 'STORE':memory[Number(x[1])]=registers[x[0]];}}
 const complete=s.status==='completed';
 const mismatches=[];
 if(complete){
  if(JSON.stringify(output)!==JSON.stringify((s.output??[]).map(x=>x.value)))mismatches.push('Output sequence differs from sequential execution.');
  for(const key of Object.keys(registers))if(registers[key]!==s.registers[key])mismatches.push(`${key}: expected ${registers[key]}, got ${s.registers[key]}`);
  for(const key of new Set([...Object.keys(memory),...Object.keys(s.memory)]))if((memory[key]??0)!==(s.memory[key]??0))mismatches.push(`memory[${key}]: expected ${memory[key]??0}, got ${s.memory[key]??0}`);
 }
 return {bot:'Pipeline Reviewer',mode:'deterministic',verdict:complete?(mismatches.length?'fail':'pass'):'pending',mismatches,expected:{registers,memory,output},summary:complete?`Sequential reference ${mismatches.length?'disagrees':'matches'}. ${s.cycle} cycles, ${s.statistics.stalls} stall cycles, CPI ${s.statistics.cpi.toFixed(2)}.`:'Run to completion for final-state verification.',hazards:s.events.slice(-12),policy:s.mode==='parallel'?'Dependency-scheduled single-cycle issue model; R0 is writable.':`Forwarding ${s.forwarding?'on':'off'}. WB commits before ID reads in the same cycle. R0 is writable.`};
}
