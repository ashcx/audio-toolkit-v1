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
