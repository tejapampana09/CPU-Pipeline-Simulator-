import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {parse} from '../shared/parser.js';
import {parseProgram} from '../frontend/src/sim/parser.js';
import {SAMPLE_PROGRAMS,MEMORY_SIZE} from '../shared/constants.js';
import {createMachine} from '../backend/src/cpu/machine.js';
import {buildTrace,executeTrace} from '../backend/src/services/traceService.js';
import {review} from '../backend/src/agents/pipelineReviewer.js';
import {explainPipelineAi} from '../backend/src/services/bot2ReviewerService.js';
import {generateAssemblyAi} from '../backend/src/services/bot1AssemblyService.js';
import {createApp} from '../backend/src/app.js';
const run=(code,options)=>executeTrace(parse(code),options).at(-1);

test('canonical parser accepts every advertised sample; shared limits reject invalid addresses and immediates',()=>{
 for(const p of SAMPLE_PROGRAMS)assert.deepEqual(parseProgram(p.source).instructions,parse(p.source));
 for(const code of [`LOAD R1, ${MEMORY_SIZE}`,'LOAD R1, -1','LI R1, 2147483648','STORE R1, -1']){
  assert.throws(()=>parse(code));assert.ok(parseProgram(code).errors.length);
 }
 assert.equal(parse('LI R1, 1 ; comment')[0].args[1],'1');
});
test('LOAD reads zero by default in both modes; MUL and OUT agree with independent verifier',()=>{
 for(const mode of ['pipeline','parallel'])for(const forwarding of [false,true]){
  const s=run('LOAD R0, 10\nLI R1, 2147483647\nLI R2, 2\nMUL R3, R1, R2\nOUT R3',{mode,forwarding});
  assert.equal(s.registers.R0,0);assert.equal(s.registers.R3,-2);assert.equal(s.output[0].value,-2);assert.equal(review(s).verdict,'pass');
 }
});
test('parallel STORE→LOAD, LOAD→STORE and STORE→STORE preserve actual memory ordering, including address aliases',()=>{
 const states=executeTrace(parse('LI R1, 10\nADD R1, R1, R1\nSTORE R1, 020\nLOAD R2, 20\nSTORE R0, 20\nLOAD R3, 20'),{mode:'parallel'});
 const loadCycle=states.find(s=>s.executing?.includes(4)).cycle;
 const storeCycle=states.find(s=>s.executing?.includes(3)).cycle;
 assert.ok(loadCycle>storeCycle);assert.equal(states[1].registers.R2,0);
 assert.equal(states.at(-1).registers.R2,20);assert.equal(states.at(-1).registers.R3,0);assert.equal(review(states.at(-1)).verdict,'pass');
 const independent=run('STORE R1, 1\nLOAD R2, 2',{mode:'parallel'});assert.equal(independent.cycle,1);
});
test('parallel preserves OUT ordering even when earlier output waits for a producer',()=>{
 const s=run('LI R1, 5\nADD R2, R1, R1\nOUT R2\nOUT R0',{mode:'parallel'});
 assert.deepEqual(s.output.map(x=>x.value),[10,0]);assert.equal(review(s).verdict,'pass');
});
test('seeded mixed programs preserve sequential registers, memory and output in all execution configurations',()=>{
 let seed=19;const rand=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
 for(let k=0;k<30;k++){
  const lines=[];for(let j=0;j<25;j++){const r=()=>`R${rand(8)}`;const op=rand(7);lines.push(op===0?`LI ${r()}, ${rand(99)-40}`:op===1?`LOAD ${r()}, ${rand(5)}`:op===2?`STORE ${r()}, ${rand(5)}`:op===3?`OUT ${r()}`:`${['ADD','SUB','MUL','AND','OR'][rand(5)]} ${r()}, ${r()}, ${r()}`);}
  for(const options of [{mode:'pipeline',forwarding:true},{mode:'parallel',issueWidth:0},{mode:'parallel',issueWidth:2}])assert.equal(review(run(lines.join('\n'),options)).verdict,'pass',lines.join('\n'));
 }
});
test('API serves authoritative traces, cycle-specific reviews, parallel lifecycle and rejects forged snapshots',async()=>{
 const api=request(createApp());
 for(const mode of ['pipeline','parallel']){
  const source='LI R1, 7\nMUL R2, R1, R1\nOUT R2';
  const s=(await api.post('/api/v1/simulations').send({source,mode,issueWidth:2,forwarding:true}).expect(201)).body.data;
  const trace=(await api.get(`/api/v1/simulations/${s.sessionId}/trace`).expect(200)).body.data;
  assert.equal(trace.engine,'backend');assert.equal(trace.mode,mode);assert.equal(trace.snapshots.at(-1).registers.R2,49);
  const pending=await api.post('/api/v1/teammates/review').send({sessionId:s.sessionId,cycle:0});assert.equal(pending.body.data.verdict,'pending');
  const verified=await api.post('/api/v1/teammates/review').send({sessionId:s.sessionId,cycle:trace.summary.cycles,sessionState:{registers:{R2:100}}}).expect(200);assert.equal(verified.body.data.verdict,'pass');
  const done=(await api.post(`/api/v1/simulations/${s.sessionId}/run`).send({}).expect(200)).body.data.state;
  assert.deepEqual(done.registers,trace.snapshots.at(-1).registers);
  const reset=(await api.post(`/api/v1/simulations/${s.sessionId}/reset`).send({}).expect(200)).body.data;assert.equal(reset.mode,mode);assert.equal(reset.issueWidth,2);
  await api.delete(`/api/v1/simulations/${s.sessionId}`).expect(204);
 }
 await api.post('/api/v1/teammates/review').send({sessionState:{status:'completed'}}).expect(400);
 for(const options of [{mode:'bad'},{issueWidth:-1},{issueWidth:1.5},{forwarding:'false'}])await api.post('/api/v1/simulations').send({source:'LI R1, 1',...options}).expect(400);
});
test('offline teammates report configuration honestly and forwarding comparison is measured',async()=>{
 const previous=process.env.GEMINI_API_KEY;delete process.env.GEMINI_API_KEY;
 try{
  const source='LI R1, 5\nSTORE R1, 0\nLOAD R2, 0\nADD R3, R2, R2';
  const s=run(source,{forwarding:true}),result=await explainPipelineAi({sessionState:s});
  const off=run(source,{forwarding:false}).cycle;
  assert.equal(result.isConfigured,false);assert.equal(result.provider,'offline');assert.equal(result.forwarding.speedup,`${(off/s.cycle).toFixed(2)}×`);assert.equal(result.optimizedCode,null);
  const proposal=await generateAssemblyAi({prompt:'add numbers'});assert.equal(proposal.isConfigured,false);assert.ok(parse(proposal.source));
  assert.equal((await explainPipelineAi({sessionState:run(source,{mode:'parallel'})})).forwarding,null);
 }finally{if(previous!==undefined)process.env.GEMINI_API_KEY=previous;}
});
