import {createMachine} from '../cpu/machine.js';
import {step} from '../pipeline/pipelineEngine.js';
import {stepParallel,dependencies} from '../parallel/parallelEngine.js';
import {LIMITS} from '../../../shared/contracts.js';

export const advance = state => state.mode==='parallel'?stepParallel(state):step(state);
export function executeTrace(program,options={}) {
 let state=createMachine(program,options);const states=[state];
 while(state.status!=='completed'&&state.cycle<LIMITS.cycles){state=advance(state);states.push(state);}
 if(state.status!=='completed')throw new Error('Simulation cycle limit reached');
 return states;
}
export function buildTrace(session) {
 const states=executeTrace(session.program,session);
 const instructions=session.program.map(p=>({
  ...p,id:p.id+1,operands:p.args.map(x=>/^R/.test(x)?x:Number(x)),dest:p.dst,
  srcs:[...new Set(p.src)],addr:['LOAD','STORE'].includes(p.op)?Number(p.args[1]):undefined,
  imm:p.op==='LI'?Number(p.args[1]):undefined,
 }));
 const deps=dependencies(session.program), timing={};
 const snapshots=states.map((s,index)=>{
  const prev=states[index-1],events=s.events.slice(prev?.events.length??0);
  const hazards=events.filter(e=>e.type==='RAW').map(e=>({reg:e.register,producer:e.producerId+1,consumer:e.consumerId+1,producerStage:e.stage==='EX'?'MEM':'WB',isLoadUse:e.isLoadUse}));
  const forwards=events.filter(e=>e.type==='FORWARD').map(e=>({reg:e.register,consumer:e.consumerId+1,from:e.producerStage==='EX/MEM'?'MEM':'WB',path:e.producerStage}));
  const stalled=hazards.length>0;
  const stages=Object.fromEntries(Object.entries(s.pipeline).map(([stage,p])=>[stage,p?{id:p.id+1,stalled:stalled&&['IF','ID'].includes(stage)}:null]));
  if(stalled)stages.EX={bubble:true,bid:s.cycle,cause:hazards[0].consumer};
  for(const [stage,p]of Object.entries(stages))if(p&&!p.bubble)(timing[p.id]??={})[s.cycle]={stage,stalled:p.stalled};
  for(const id of s.executing??[])(timing[id]??={})[s.cycle]={stage:'EX',stalled:false};
  const status=Object.fromEntries(s.program.map(p=>[p.id+1,(s.done??[]).includes(p.id)?(s.executing?.includes(p.id+1)?'executing':'done'):deps[p.id].every(id=>(s.done??[]).includes(id))?'ready':'waiting']));
  const displayEvents=events.map(e=>({kind:e.type==='RAW'?'stall':e.type==='FORWARD'?'fwd':e.type==='ISSUE'?'issue':'info',text:e.reason}));
  if(!index)displayEvents.push({kind:'info',text:'Program loaded; registers and memory cleared'});
  if(s.mode!=='parallel'&&prev){
   const fetched=s.pipeline.IF;
   if(fetched&&fetched.id!==prev.pipeline.IF?.id)displayEvents.push({kind:'fetch',text:`Fetch #${fetched.id+1} ${fetched.text}`});
   const mem=prev.pipeline.MEM;
   if(mem&&['LOAD','STORE'].includes(mem.op))displayEvents.push({kind:'mem',text:mem.op==='STORE'?`MEM[${mem.args[1]}] ← ${mem.values[0]}`:`MEM[${mem.args[1]}] → ${s.pipeline.WB.result}`});
   const retired=prev.pipeline.WB;
   if(retired)displayEvents.push({kind:retired.op==='OUT'?'out':retired.dst?'wb':'retire',text:retired.op==='OUT'?`OUT ${retired.result}`:retired.dst?`${retired.dst} ← ${s.registers[retired.dst]} (#${retired.id+1} retired)`:`#${retired.id+1} retired`});
  }
  if(s.status==='completed')displayEvents.push({kind:'done',text:`Completed in ${s.cycle} cycles`});
  const details={...s.details};
  for(const p of Object.values(s.pipeline))if(p){
   const value=p.result??(p.op==='LI'?Number(p.args[1]):p.op==='STORE'?p.values?.[0]:undefined);
   details[p.id+1]={value,a:p.values?.[0],b:p.values?.[1]};
  }
  return {details,cycle:s.cycle,pc:s.pc/4,stages,executing:s.executing??[],status,
   registers:s.registers,memory:s.memory,output:s.output,completed:s.statistics.instructionsCompleted,
   stalls:s.statistics.stalls,forwardCount:s.statistics.forwards,hazards,forwards,
   changedRegs:Object.keys(s.registers).filter(k=>prev&&s.registers[k]!==prev.registers[k]),
   changedMem:Object.keys(s.memory).filter(k=>prev&&s.memory[k]!==prev.memory[k]),
   events:displayEvents,
  };
 });
 for(const p of instructions)p.deps=deps[p.id-1].map(id=>({id:id+1,kind:'dependency'}));
 const last=states.at(-1),n=instructions.length,cycles=last.cycle;
 const summary={cycles,instructions:n,stalls:last.statistics.stalls,forwards:last.statistics.forwards,
  cpi:cycles/n,ipc:n/cycles,peak:last.statistics.peak??0,unpipelined:n*5,
  speedup:(session.mode==='parallel'?n:n*5)/cycles};
 if(session.mode!=='parallel')summary.alternate={forwarding:!session.forwarding,cycles:executeTrace(session.program,{forwarding:!session.forwarding}).at(-1).cycle};
 return {sessionId:session.sessionId,engine:'backend',mode:session.mode,options:{forwarding:session.forwarding,issueWidth:session.issueWidth},instructions,snapshots,timing,summary};
}
