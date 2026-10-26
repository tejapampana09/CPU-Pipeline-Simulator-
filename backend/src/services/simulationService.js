import {randomUUID} from 'node:crypto';
import {parse} from '../parser/assemblyParser.js';
import {fail} from '../parser/validator.js';
import {createMachine} from '../cpu/machine.js';
import {step} from '../pipeline/pipelineEngine.js';
import {LIMITS} from '../../../shared/contracts.js';
export function createService(){
 const sessions=new Map();const ttl=2*60*60*1000;
 function clean(){for(const [id,s] of sessions)if(Date.now()-s.updatedAt>ttl)sessions.delete(id);}
 function get(id){clean();const s=sessions.get(id);if(!s)throw fail('Session not found or expired.','SIMULATION_NOT_FOUND',404);return s;}
 function save(s){s.updatedAt=Date.now();sessions.set(s.sessionId,s);return s;}
 return {
 get,
 create(source){clean();if(sessions.size>=LIMITS.sessions)throw fail('Session capacity reached.','CAPACITY',503);return save({...createMachine(parse(source)),sessionId:randomUUID()});},
 step(id){return save(step(get(id)));},
 reset(id){const s=get(id);return save({...createMachine(s.program),sessionId:id});},
 remove(id){get(id);sessions.delete(id);},
 run(id,maxCycles=200){if(!Number.isInteger(maxCycles)||maxCycles<1||maxCycles>5000)throw fail('maxCycles must be 1–5000.');let s=get(id),count=0;while(s.status!=='completed'&&count<maxCycles){s=step(s);count++;}save(s);return {state:s,runCycles:count,stopReason:s.status==='completed'?'completed':'budget'};}
 };
}
