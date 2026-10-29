import test from 'node:test';
import assert from 'node:assert/strict';
import {gain,trim,channels,normalize,BLOCK_FRAMES} from '../src/pcm/blocks.ts';
import {resample} from '../src/pcm/resample.ts';
async function* source(planes,rate=48000,chunk=4096,origin=0){for(let offset=0;offset<planes[0].length;offset+=chunk)yield{planes:planes.map(p=>p.slice(offset,offset+chunk)),rate,origin,offset};}
async function collect(stream){const chunks=[];for await(const block of stream){assert(block.planes[0].length<=BLOCK_FRAMES);chunks.push(block);}const count=chunks.reduce((n,b)=>n+b.planes[0].length,0);const planes=chunks.length?chunks[0].planes.map(()=>new Float32Array(count)):[];let cursor=0;for(const b of chunks){b.planes.forEach((p,c)=>planes[c].set(p,cursor));cursor+=b.planes[0].length;}return{planes,chunks,count};}
const tone=(frequency,frames=48000,rate=48000)=>Float32Array.from({length:frames},(_,i)=>.5*Math.sin(2*Math.PI*frequency*i/rate));
const rms=plane=>Math.sqrt(plane.reduce((s,x)=>s+x*x,0)/plane.length);
function context(){let opened=0,closed=0;return{get opened(){return opened;},get closed(){return closed;},signal:new AbortController().signal,async checkpoint(){opened++;const values=[];return{async append(block){values.push(block);},async seal(){return{read:()=> (async function*(){yield* values;})()};},async discard(){closed++;}};}};}
test('trim retains half-open source positions; gain and mono/stereo mappings are deterministic',async()=>{
 const left=Float32Array.from({length:10000},(_,i)=>i/10000),right=left.map(x=>-x);
 const selected=await collect(trim(source([left,right],48000,17),.01,.05));assert.equal(selected.count,1920);assert.equal(selected.chunks[0].offset,480);assert.equal(selected.planes[0][0],left[480]);assert.equal(selected.planes[0].at(-1),left[2399]);
 const mono=await collect(channels(source([left,right]),1));assert(mono.planes[0].every(x=>x===0));
 const stereo=await collect(channels(source([left]),2));assert.deepEqual(stereo.planes[0],stereo.planes[1]);
 const amplified=await collect(gain(source([left]),2));assert.equal(amplified.planes[0][9999],Math.fround(left[9999]*2));assert.equal(left[9999],Math.fround(.9999));
});
test('normalization at its actual position changes trim results; silence is finite and checkpoints always close',async()=>{
 const data=Float32Array.from({length:48000},(_,i)=>i<24000?.2:.8),target=10**(-1/20);
 const before=context(),after=context();
 const normThenTrim=await collect(trim(normalize(source([data]),-1,before),0,.5));
 const trimThenNorm=await collect(normalize(trim(source([data]),0,.5),-1,after));
 assert(Math.abs(normThenTrim.planes[0][100]-.25*target)<1e-7);assert(Math.abs(trimThenNorm.planes[0][100]-target)<1e-7);
 const silence=context();const silent=await collect(normalize(source([new Float32Array(10000)]),-1,silence));assert(silent.planes[0].every(x=>x===0));
 const nearSilent=await collect(normalize(source([Float32Array.of(1e-11)]),-1,context()));assert.equal(nearSilent.planes[0][0],Math.fround(1e-11));
 let limited=0;const quiet=await collect(normalize(source([Float32Array.of(1e-4)]),-1,{...context(),onNormalizationLimit:()=>limited++}));assert(Math.abs(quiet.planes[0][0]-.1)<1e-7);assert.equal(limited,1);
 assert.equal(before.closed,1);assert.equal(after.closed,1);assert.equal(silence.closed,1);
 const cancelled=context();const controller=new AbortController();controller.abort();await assert.rejects(collect(normalize(source([data]),-1,{...cancelled,signal:controller.signal})),{name:'AbortError'});assert.equal(cancelled.closed,1);
});
test('streaming sinc resampling preserves rate, duration, passband and arbitrary block boundaries',async()=>{
 const input=tone(1000);
 for(const rate of [44100,32000,24000,16000]){
  const a=await collect(resample(source([input],48000,4096),rate));
  const b=await collect(resample(source([input],48000,17),rate));
  assert.equal(a.count,rate);assert.deepEqual(a.planes[0],b.planes[0]);
  const db=20*Math.log10(rms(a.planes[0].subarray(100,-100))/(.5/Math.sqrt(2)));assert(Math.abs(db)<.02,`${rate} passband ${db}dB`);
 }
});
test('downsampling rejects out-of-band aliases and preserves the source clock through repeated conversion before trim',async()=>{
 const rejected=await collect(resample(source([tone(12000)]),16000));const aliasDb=20*Math.log10(rms(rejected.planes[0].subarray(100,-100))/(.5/Math.sqrt(2)));assert(aliasDb< -60,`alias ${aliasDb}dB`);
 const stream=resample(resample(source([tone(1000)],48000,37),44100),48000);
 const kept=await collect(trim(stream,.25,.75));assert.equal(kept.count,24000);const first=kept.chunks[0];assert.equal(first.origin+first.offset/first.rate,.25);
});
