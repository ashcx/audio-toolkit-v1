import test from 'node:test';
import assert from 'node:assert/strict';
import {InferenceRunner} from '../src/inference/runner.ts';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fakeWorkers(){const previous=globalThis.Worker,workers=[];globalThis.Worker=class{constructor(){this.stopped=false;workers.push(this);}postMessage(data){this.input=data;}terminate(){this.stopped=true;}reply(data){this.onmessage({data});}};return{workers,restore:()=>{if(previous)globalThis.Worker=previous;else delete globalThis.Worker;}};}
test('GPU-session failure closes its worker before CPU fallback and keeps bounded input',async()=>{
 const fixture=fakeWorkers();try{const runner=new InferenceRunner(),planes=[new Float32Array([.1,.2])],pending=runner.run(planes,()=>{});fixture.workers[0].reply({kind:'error',stage:'session',backend:'webgpu+wasm',message:'GPU unavailable'});await tick();assert.equal(fixture.workers.length,2);assert.equal(fixture.workers[0].stopped,true);assert.equal(fixture.workers[1].input.backend,'wasm');assert.deepEqual(fixture.workers[1].input.planes,planes);fixture.workers[1].reply({kind:'done',planes,backend:'wasm'});const result=await pending;assert.equal(result.attempts,2);assert.equal(fixture.workers[1].stopped,true);runner.stop();}finally{fixture.restore();}
});
test('cancellation between GPU rejection and fallback cannot launch another worker',async()=>{
 const fixture=fakeWorkers();try{const runner=new InferenceRunner(),pending=runner.run([new Float32Array([.1])],()=>{});fixture.workers[0].reply({kind:'error',stage:'run',backend:'webgpu+wasm',message:'GPU failed'});runner.stop();await assert.rejects(pending,error=>error.name==='AbortError');assert.equal(fixture.workers.length,1);}finally{fixture.restore();}
});
test('model verification errors do not retry an unrelated backend',async()=>{
 const fixture=fakeWorkers();try{const runner=new InferenceRunner(),pending=runner.run([new Float32Array([.1])],()=>{});fixture.workers[0].reply({kind:'error',stage:'model',backend:'webgpu+wasm',message:'Model mismatch'});await assert.rejects(pending,/Model mismatch/);assert.equal(fixture.workers.length,1);runner.stop();}finally{fixture.restore();}
});
test('GPU fallback persists across the rest of the file',async()=>{
 const fixture=fakeWorkers();try{const runner=new InferenceRunner(),planes=[new Float32Array([.1])],first=runner.run(planes,()=>{});fixture.workers[0].reply({kind:'error',stage:'run',backend:'webgpu+wasm',message:'Device lost'});await tick();fixture.workers[1].reply({kind:'done',planes,backend:'wasm'});await first;const second=runner.run(planes,()=>{});assert.equal(fixture.workers[2].input.backend,'wasm');fixture.workers[2].reply({kind:'done',planes,backend:'wasm'});assert.equal((await second).attempts,1);runner.stop();}finally{fixture.restore();}
});
test('initialization and inference stalls terminate once without automatic loops',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 for(const separating of [false,true]){const fixture=fakeWorkers();try{const runner=new InferenceRunner(),pending=runner.run([new Float32Array([.1])],()=>{});const rejected=assert.rejects(pending,/stopped responding/);if(separating){fixture.workers[0].reply({kind:'phase',phase:'Separating'});t.mock.timers.tick(299999);fixture.workers[0].reply({kind:'phase',phase:'Separating'});t.mock.timers.tick(1);}else t.mock.timers.tick(120000);await rejected;assert.equal(fixture.workers.length,1);assert.equal(fixture.workers[0].stopped,true);fixture.workers[0].reply({kind:'done',planes:[new Float32Array([.2])],backend:'wasm'});runner.stop();}finally{fixture.restore();}}
});
test('cancellation from a progress callback cannot start work afterward',async()=>{
 const fixture=fakeWorkers();try{const runner=new InferenceRunner();await assert.rejects(runner.run([new Float32Array([.1])],()=>runner.stop()),error=>error.name==='AbortError');assert.equal(fixture.workers.length,0);}finally{fixture.restore();}
});
test('a stalled GPU session gets one CPU fallback, which stays selected',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const fixture=fakeWorkers();try{const runner=new InferenceRunner(),planes=[new Float32Array([.1])],pending=runner.run(planes,()=>{});fixture.workers[0].reply({kind:'backend',backend:'webgpu+wasm'});fixture.workers[0].reply({kind:'phase',phase:'Loading model'});t.mock.timers.tick(120000);await tick();assert.equal(fixture.workers.length,2);assert.equal(fixture.workers[0].stopped,true);assert.equal(fixture.workers[1].input.backend,'wasm');fixture.workers[1].reply({kind:'done',planes,backend:'wasm'});assert.equal((await pending).attempts,2);const next=runner.run(planes,()=>{});assert.equal(fixture.workers[2].input.backend,'wasm');fixture.workers[2].reply({kind:'done',planes,backend:'wasm'});await next;runner.stop();}finally{fixture.restore();}
});
test('device status distinguishes tentative GPU, confirmed hybrid and sticky CPU fallback',async()=>{
 const fixture=fakeWorkers();try{
  const runner=new InferenceRunner(),events=[],planes=[new Float32Array([.1])];
  let pending=runner.run(planes,event=>events.push(event));fixture.workers[0].reply({kind:'backend',backend:'webgpu+wasm'});assert.equal(events.filter(event=>event.kind==='isolation-device').at(-1).device,'preparing-gpu');fixture.workers[0].reply({kind:'done',planes,backend:'webgpu+wasm'});await pending;assert.equal(events.filter(event=>event.kind==='isolation-device').at(-1).device,'gpu');
  pending=runner.run(planes,event=>events.push(event));fixture.workers[1].reply({kind:'backend',backend:'webgpu+wasm'});assert.equal(events.filter(event=>event.kind==='isolation-device').at(-1).device,'gpu');fixture.workers[1].reply({kind:'error',stage:'run',backend:'webgpu+wasm',message:'lost GPU'});await tick();assert.equal(events.filter(event=>event.kind==='isolation-device').at(-1).device,'cpu-fallback');fixture.workers[2].reply({kind:'backend',backend:'wasm'});fixture.workers[2].reply({kind:'done',planes,backend:'wasm'});await pending;assert.equal(events.filter(event=>event.kind==='isolation-device').at(-1).device,'cpu-fallback');
  pending=runner.run(planes,event=>events.push(event));fixture.workers[3].reply({kind:'backend',backend:'wasm'});assert.equal(events.filter(event=>event.kind==='isolation-device').at(-1).device,'cpu-fallback');fixture.workers[3].reply({kind:'done',planes,backend:'wasm'});await pending;runner.stop();
 }finally{fixture.restore();}
});
