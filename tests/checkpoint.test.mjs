import test from 'node:test';import assert from 'node:assert/strict';
import {checkpoint} from '../src/pcm/checkpoint.ts';
test('sealed PCM gives independent replay readers over immutable recorded samples',async()=>{
 const chunks=[];let discarded=0;const client={create:async()=>'id',write:async(id,position,data)=>chunks.push(new Uint8Array(data)),finish:async()=>new File(chunks,'analysis.pcm'),discard:async()=>{discarded++;}};
 const spool=await checkpoint(client,0);await spool.append({origin:.5,offset:1,rate:44100,planes:[new Float32Array([.1,.2])]});await spool.append({origin:.5,offset:3,rate:44100,planes:[new Float32Array([.3])]});const replay=await spool.seal(),a=replay.read()[Symbol.asyncIterator](),b=replay.read()[Symbol.asyncIterator]();
 const first=await a.next();first.value.planes[0][0]=999;assert.equal((await a.next()).value.offset,3);const independent=await b.next();assert.equal(independent.value.offset,1);assert(Math.abs(independent.value.planes[0][0]-.1)<1e-7);await a.return();await b.return();await spool.discard();assert.equal(discarded,1);
});

test('a short recording stays in memory, replays independently and never touches storage',async()=>{
 const calls=[];const client=new Proxy({},{get:(_,name)=>async()=>{calls.push(name);return 'id';}});
 const spool=await checkpoint(client);await spool.append({origin:0,offset:0,rate:48000,planes:[new Float32Array([.5,.25])]});
 const replay=await spool.seal();const a=[];for await(const block of replay.read())a.push(block);a[0].planes[0][0]=9;
 const b=[];for await(const block of replay.read())b.push(block);assert.equal(b[0].planes[0][0],.5);await spool.discard();assert.deepEqual(calls,[]);
});
test('a recording past the memory limit spills in order and replays every block across read windows',async()=>{
 const chunks=[];let created=0,discarded=0;const client={create:async()=>{created++;return 'id';},write:async(id,position,data)=>{chunks.push({position,data:new Uint8Array(data)});},finish:async()=>{const size=Math.max(...chunks.map(c=>c.position+c.data.length));const bytes=new Uint8Array(size);for(const c of chunks)bytes.set(c.data,c.position);return new File([bytes],'spill.pcm');},discard:async()=>{discarded++;}};
 const spool=await checkpoint(client,4*4096*2);const blocks=[];
 for(let i=0;i<1500;i++){const frames=i%7===0?100:4096;blocks.push({origin:1,offset:i*4096,rate:44100,planes:[Float32Array.from({length:frames},(_,k)=>i+k/1e4),Float32Array.from({length:frames},(_,k)=>-i-k/1e4)]});await spool.append(blocks[i]);}
 assert.equal(created,1);const replay=await spool.seal();let n=0;for await(const block of replay.read()){const want=blocks[n++];assert.equal(block.offset,want.offset);assert.equal(block.planes[0].length,want.planes[0].length);assert.deepEqual([...block.planes[1].slice(0,3)],[...want.planes[1].slice(0,3)]);}
 assert.equal(n,1500);await spool.discard();assert.equal(discarded,1);
});
