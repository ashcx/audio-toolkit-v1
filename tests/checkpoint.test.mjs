import test from 'node:test';import assert from 'node:assert/strict';
import {checkpoint} from '../src/pcm/checkpoint.ts';
test('sealed PCM gives independent replay readers over immutable recorded samples',async()=>{
 const chunks=[];let discarded=0;const client={create:async()=>'id',write:async(id,position,data)=>chunks.push(new Uint8Array(data)),finish:async()=>new File(chunks,'analysis.pcm'),discard:async()=>{discarded++;}};
 const spool=await checkpoint(client);await spool.append({origin:.5,offset:1,rate:44100,planes:[new Float32Array([.1,.2])]});await spool.append({origin:.5,offset:3,rate:44100,planes:[new Float32Array([.3])]});const replay=await spool.seal(),a=replay.read()[Symbol.asyncIterator](),b=replay.read()[Symbol.asyncIterator]();
 const first=await a.next();first.value.planes[0][0]=999;assert.equal((await a.next()).value.offset,3);const independent=await b.next();assert.equal(independent.value.offset,1);assert(Math.abs(independent.value.planes[0][0]-.1)<1e-7);await a.return();await b.return();await spool.discard();assert.equal(discarded,1);
});
