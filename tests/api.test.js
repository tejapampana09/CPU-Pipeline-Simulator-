import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {createApp} from '../backend/src/app.js';

test('health, create, get, step, run, review, reset and delete',async()=>{
  const api=request(createApp());
  await api.get('/health').expect(200);
  const created=await api.post('/api/v1/simulations').send({source:'LI R1, 4\nSTORE R1, 3'}).expect(201);
  const id=created.body.data.sessionId;
  assert.ok(id);
  await api.get(`/api/v1/simulations/${id}`).expect(200);
  const step=await api.post(`/api/v1/simulations/${id}/step`).send({}).expect(200);
  assert.equal(step.body.data.cycle,1);
  const result=await api.post(`/api/v1/simulations/${id}/run`).send({maxCycles:200}).expect(200);
  assert.equal(result.body.data.state.memory[3],4);
  const review=await api.post('/api/v1/teammates/review').send({sessionId:id}).expect(200);
  assert.equal(review.body.data.verdict,'pass');
  const reset=await api.post(`/api/v1/simulations/${id}/reset`).send({}).expect(200);
  assert.equal(reset.body.data.cycle,0);
  assert.deepEqual(reset.body.data.memory,{});
  await api.delete(`/api/v1/simulations/${id}`).expect(204);
  await api.get(`/api/v1/simulations/${id}`).expect(404);
});

test('API validation, malformed JSON and bounded runs',async()=>{
  const api=request(createApp());
  await api.post('/api/v1/simulations').send({source:'BAD R1'}).expect(400);
  await api.post('/api/v1/simulations').set('Content-Type','application/json').send('{broken').expect(400);
  const {body}=await api.post('/api/v1/simulations').send({source:'LI R1, 1'});
  const id=body.data.sessionId;
  for(const maxCycles of [0,-1,5001,1.5,'20',null])await api.post(`/api/v1/simulations/${id}/run`).send({maxCycles}).expect(400);
  const r=await api.post(`/api/v1/simulations/${id}/run`).send({maxCycles:1}).expect(200);
  assert.equal(r.body.data.stopReason,'budget');
  assert.equal(r.body.data.state.cycle,1);
  await api.get('/missing').expect(404);
});

test('session isolation and bot proposal validation',async()=>{
  const api=request(createApp());
  const a=(await api.post('/api/v1/simulations').send({source:'LI R1, 4'})).body.data;
  const b=(await api.post('/api/v1/simulations').send({source:'LI R1, 9'})).body.data;
  await api.post(`/api/v1/simulations/${a.sessionId}/run`).send({}).expect(200);
  const untouched=(await api.get(`/api/v1/simulations/${b.sessionId}`)).body.data;
  assert.equal(untouched.cycle,0);
  assert.equal(untouched.registers.R1,0);
  await api.post('/api/v1/teammates/prepare').send({operation:'ADD',a:3,b:4,address:20}).expect(200);
  await api.post('/api/v1/teammates/prepare').send({operation:'ADD',a:3,b:4,address:-1}).expect(400);
});

test('teammates AI endpoints: status, validation and graceful fallback',async()=>{
  const api=request(createApp());
  const statusRes=await api.get('/api/v1/teammates/status').expect(200);
  assert.equal(typeof statusRes.body.data.configured,'boolean');

  await api.post('/api/v1/teammates/ai-generate').send({}).expect(400);
  await api.post('/api/v1/teammates/ai-generate').send({prompt:'   '}).expect(400);

  const genFallback=await api.post('/api/v1/teammates/ai-generate').send({prompt:'Compute 2+2'}).expect(200);
  assert.ok(genFallback.body.data);

  await api.post('/api/v1/teammates/ai-explain').send({}).expect(400);
  const sim=(await api.post('/api/v1/simulations').send({source:'LI R1, 5'})).body.data;
  const explainRes=await api.post('/api/v1/teammates/ai-explain').send({sessionId:sim.sessionId}).expect(200);
  assert.ok(explainRes.body.data);
  assert.ok(explainRes.body.data.verdict);
});
