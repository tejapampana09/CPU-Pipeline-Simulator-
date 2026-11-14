import test from 'node:test';
import assert from 'node:assert/strict';
import {createReviewCache} from '../frontend/src/api/reviewCache.js';

test('reviews deduplicate concurrent calls and replay while keeping session/cycle isolation', async () => {
 let calls=0;
 const cache=createReviewCache(async (sessionId,cycle)=>({sessionId,cycle,call:++calls}));
 const [first,concurrent]=await Promise.all([cache.load('a',5),cache.load('a',5)]);
 assert.deepEqual(first,concurrent);
 assert.equal(calls,1);
 assert.deepEqual(await cache.load('a',5),first);
 assert.deepEqual(cache.peek('a',5),first);
 await cache.load('a',6);
 await cache.load('b',5);
 assert.equal(calls,3);
});

test('failed review is not marked successful and can be retried', async () => {
 let calls=0;
 const cache=createReviewCache(async()=>{if(++calls===1)throw new Error('Offline');return {verdict:'pass'};});
 await assert.rejects(cache.load('a',5),/Offline/);
 assert.equal(cache.peek('a',5),undefined);
 assert.equal((await cache.load('a',5)).verdict,'pass');
 assert.equal(calls,2);
});

test('review cache expires old entries and bounds retained history', async () => {
 let clock=0,calls=0;
 const cache=createReviewCache(async()=>++calls,{maxEntries:2,ttl:10,now:()=>clock});
 await cache.load('a',1);await cache.load('a',2);await cache.load('a',3);
 assert.equal(cache.peek('a',1),undefined);
 assert.equal(cache.peek('a',2),2);
 clock=10;
 assert.equal(cache.peek('a',2),undefined);
 assert.equal(await cache.load('a',2),4);
});
