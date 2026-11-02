import {randomUUID} from 'node:crypto';
import {parse} from '../parser/assemblyParser.js';
import {fail} from '../parser/validator.js';
import {createMachine} from '../cpu/machine.js';
import {advance as step,buildTrace,executeTrace} from './traceService.js';
import {LIMITS} from '../../../shared/contracts.js';
export function createService(){
 const sessions=new Map();const ttl=2*60*60*1000;
 function clean(){for(const [id,s] of sessions)if(Date.now()-s.updatedAt>ttl)sessions.delete(id);}
 function get(id){clean();const s=sessions.get(id);if(!s)throw fail('Session not found or expired.','SIMULATION_NOT_FOUND',404);return s;}
 function save(s){s.updatedAt=Date.now();sessions.set(s.sessionId,s);return s;}
 return {
 get,
 trace(id){return buildTrace(get(id));},
 stateAt(id,cycle){if(typeof id!=='string'||!id)throw fail('Valid sessionId is required');const session=get(id);if(cycle===undefined)return session;if(!Number.isInteger(cycle)||cycle<0||cycle>LIMITS.cycles)throw fail('Invalid cycle');const states=executeTrace(session.program,session);if(cycle>=states.length)throw fail('Cycle exceeds completed trace');return {...states[cycle],sessionId:id};},
 create(source, options = {}){if(options.mode!==undefined&&!['pipeline','parallel'].includes(options.mode))throw fail('Invalid simulation mode');if(options.issueWidth!==undefined&&(!Number.isInteger(options.issueWidth)||options.issueWidth<0||options.issueWidth>200))throw fail('issueWidth must be 0–200');if(options.forwarding!==undefined&&typeof options.forwarding!=='boolean')throw fail('forwarding must be boolean');clean();if(sessions.size>=LIMITS.sessions)throw fail('Session capacity reached.','CAPACITY',503);return save({...createMachine(parse(source), options),sessionId:randomUUID()});},
 step(id){return save(step(get(id)));},
 reset(id, options = {}){if(options.forwarding!==undefined&&typeof options.forwarding!=='boolean')throw fail('forwarding must be boolean');const s=get(id);const fwd = options?.forwarding !== undefined ? Boolean(options.forwarding) : Boolean(s.forwarding);return save({...createMachine(s.program, {forwarding: fwd,mode:s.mode,issueWidth:s.issueWidth}),sessionId:id});},
 remove(id){get(id);sessions.delete(id);},
 run(id,maxCycles=200){if(!Number.isInteger(maxCycles)||maxCycles<1||maxCycles>5000)throw fail('maxCycles must be 1–5000.');let s=get(id),count=0;while(s.status!=='completed'&&count<maxCycles){s=step(s);count++;}save(s);return {state:s,runCycles:count,stopReason:s.status==='completed'?'completed':'budget'};}
 };
}
