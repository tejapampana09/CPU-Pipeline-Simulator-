import test from 'node:test';
import assert from 'node:assert/strict';
import {parse} from '../shared/parser.js';
import {createMachine} from '../backend/src/cpu/machine.js';
import {buildTrace, executeTrace} from '../backend/src/services/traceService.js';
import {step} from '../backend/src/pipeline/pipelineEngine.js';

test('single instruction completes in its fifth stage with a consistent speedup baseline', () => {
 const trace=buildTrace(createMachine(parse('LI R1, 7')));
 assert.equal(trace.summary.cycles,5);
 assert.equal(trace.summary.cpi,5);
 assert.equal(trace.summary.speedup,1);
 assert.equal(trace.snapshots[4].registers.R1,0);
 assert.equal(trace.snapshots[5].registers.R1,7);
 assert.equal(trace.snapshots[5].completed,1);
 assert.equal(trace.timing[1][5].stage,'WB');
 assert.match(trace.snapshots[5].events.find(e=>e.kind==='wb').text,/R1 ← 7/);
});

test('memory changes in MEM and output retires exactly once in WB', () => {
 for(const forwarding of [false,true]) {
  const states=executeTrace(parse('LI R1, 42\nSTORE R1, 3\nLOAD R2, 3\nOUT R2'),{forwarding});
  const store=states.find(s=>s.pipeline.MEM?.op==='STORE');
  const load=states.find(s=>s.pipeline.MEM?.op==='LOAD');
  assert.equal(states[store.cycle-1].memory[3],undefined);
  assert.equal(store.memory[3],42);
  assert.equal(load.pipeline.MEM.result,42);
  const last=states.at(-1);
  assert.equal(last.pipeline.WB.op,'OUT');
  assert.deepEqual(last.output,[{cycle:last.cycle,id:4,reg:'R2',value:42}]);
  assert.deepEqual(step(last),last);
  assert.equal(last.cycle,4+4+last.statistics.stalls);
 }
});

test('forwarding trace identifies the actual producer and its value', () => {
 const trace=buildTrace(createMachine(parse('LI R1, 7\nADD R2, R1, R1'),{forwarding:true}));
 const snapshot=trace.snapshots.find(s=>s.forwards.length);
 for(const forward of snapshot.forwards) {
  assert.equal(forward.producer,1);
  assert.equal(forward.consumer,2);
  assert.equal(snapshot.details[forward.producer].value,7);
 }
 assert.equal(trace.snapshots.at(-1).registers.R2,14);
});
