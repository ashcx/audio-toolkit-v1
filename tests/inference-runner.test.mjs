import test from 'node:test';
import assert from 'node:assert/strict';
import {InferenceRunner,LOAD_WATCHDOG_MS,SEPARATE_WATCHDOG_MS} from '../src/inference/runner.ts';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fakeWorkers(){const previous=globalThis.Worker,workers=[];globalThis.Worker=class{constructor(){this.stopped=false;this.inputs=[];workers.push(this);}postMessage(data){this.input=data;this.inputs.push(data);}terminate(){this.stopped=true;}reply(data){this.onmessage({data});}};return{workers,restore:()=>{if(previous)globalThis.Worker=previous;else delete globalThis.Worker;}};}
const stems=planes=>[0,1,2,3].map(()=>planes.map(plane=>new Float32Array(plane)));
const done=(planes,backend,gpuDispatches=backend==='wasm'?0:1363)=>({kind:'done',stems:stems(planes),backend,gpuDispatches});
const lastDevice=events=>events.filter(event=>event.kind==='isolation-device').at(-1)?.device;

test('one worker and session serve every window of a job until it stops',async()=>{
 const fixture=fakeWorkers();try{
  const runner=new InferenceRunner(),planes=[new Float32Array([.1,.2])],loads=[];
  for(let window=0;window<3;window++){const pending=runner.run(planes,()=>{});fixture.workers[0].reply(done(planes,'webgpu+wasm'));const result=await pending;loads.push(result.loads);assert.equal(result.stems.length,4,'four stems reach the caller');}
  assert.equal(fixture.workers.length,1);assert.deepEqual(loads,[1,0,0]);assert.equal(fixture.workers[0].stopped,false);
  runner.stop();assert.equal(fixture.workers[0].stopped,true);
  await assert.rejects(runner.run(planes,()=>{}),error=>error.name==='AbortError');assert.equal(fixture.workers.length,1);
 }finally{fixture.restore();}
});
test('a GPU session or run failure closes its worker before one sticky CPU retry of the same window',async()=>{
 for(const stage of ['session','run']){const fixture=fakeWorkers();try{
  const runner=new InferenceRunner(),planes=[new Float32Array([.1,.2])],events=[];
  const pending=runner.run(planes,event=>events.push(event));fixture.workers[0].reply({kind:'error',stage,backend:'webgpu+wasm',message:'GPU failed'});await tick();
  assert.equal(fixture.workers[0].stopped,true);assert.equal(fixture.workers[1].input.backend,'wasm');assert.deepEqual(fixture.workers[1].input.planes,planes);
  fixture.workers[1].reply({kind:'backend',backend:'wasm'});fixture.workers[1].reply(done(planes,'wasm'));
  const result=await pending;assert.equal(result.backend,'wasm');assert.equal(result.loads,2,'the failed GPU worker and the CPU worker each loaded once');assert.equal(lastDevice(events),'cpu-fallback');
  const next=runner.run(planes,event=>events.push(event));assert.equal(fixture.workers.length,2,'the CPU worker is kept');assert.equal(fixture.workers[1].input.backend,'wasm');
  fixture.workers[1].reply(done(planes,'wasm'));assert.equal((await next).backend,'wasm');assert.equal(lastDevice(events),'cpu-fallback');runner.stop();
 }finally{fixture.restore();}}
});
test('cancellation between GPU rejection and fallback cannot launch another worker',async()=>{
 const fixture=fakeWorkers();try{const runner=new InferenceRunner(),pending=runner.run([new Float32Array([.1])],()=>{});fixture.workers[0].reply({kind:'error',stage:'run',backend:'webgpu+wasm',message:'GPU failed'});runner.stop();await assert.rejects(pending,error=>error.name==='AbortError');assert.equal(fixture.workers.length,1);}finally{fixture.restore();}
});
test('model download or verification errors do not retry on CPU',async()=>{
 const fixture=fakeWorkers();try{const runner=new InferenceRunner(),pending=runner.run([new Float32Array([.1])],()=>{});fixture.workers[0].reply({kind:'error',stage:'model',backend:'webgpu+wasm',message:'Model mismatch'});await assert.rejects(pending,/Model mismatch/);assert.equal(fixture.workers.length,1);assert.equal(fixture.workers[0].stopped,true);runner.stop();}finally{fixture.restore();}
});
test('the GPU label needs GPU dispatches; a WebGPU session that ran on CPU is reported as CPU',async()=>{
 for(const [dispatches,device,backend] of [[1363,'gpu','webgpu+wasm'],[0,'cpu','wasm']]){const fixture=fakeWorkers();try{
  const runner=new InferenceRunner(),planes=[new Float32Array([.1])],events=[];
  const pending=runner.run(planes,event=>events.push(event));fixture.workers[0].reply({kind:'backend',backend:'webgpu+wasm'});assert.equal(lastDevice(events),'preparing-gpu');
  fixture.workers[0].reply(done(planes,'webgpu+wasm',dispatches));const result=await pending;assert.equal(lastDevice(events),device);assert.equal(result.backend,backend);runner.stop();
 }finally{fixture.restore();}}
 const fixture=fakeWorkers();try{const runner=new InferenceRunner(),planes=[new Float32Array([.1])],events=[];const pending=runner.run(planes,event=>events.push(event));fixture.workers[0].reply({kind:'backend',backend:'wasm'});fixture.workers[0].reply(done(planes,'wasm'));await pending;assert.equal(lastDevice(events),'cpu');runner.stop();}finally{fixture.restore();}
});
test('a stalled download, session or window terminates once, and download progress keeps a slow download alive',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const fixture=fakeWorkers();try{
  const runner=new InferenceRunner(),pending=runner.run([new Float32Array([.1])],()=>{}),rejected=assert.rejects(pending,/stopped responding/);
  fixture.workers[0].reply({kind:'backend',backend:'wasm'});
  for(let step=0;step<3;step++){t.mock.timers.tick(LOAD_WATCHDOG_MS-1000);fixture.workers[0].reply({kind:'model-download',loaded:step,total:3});}
  fixture.workers[0].reply({kind:'phase',phase:'Separating'});t.mock.timers.tick(SEPARATE_WATCHDOG_MS-1);assert.equal(fixture.workers[0].stopped,false);t.mock.timers.tick(1);
  await rejected;assert.equal(fixture.workers.length,1);assert.equal(fixture.workers[0].stopped,true);runner.stop();
 }finally{fixture.restore();}
 const gpu=fakeWorkers();try{
  const runner=new InferenceRunner(),planes=[new Float32Array([.1])],events=[],pending=runner.run(planes,event=>events.push(event));gpu.workers[0].reply({kind:'backend',backend:'webgpu+wasm'});gpu.workers[0].reply({kind:'phase',phase:'Loading model'});t.mock.timers.tick(LOAD_WATCHDOG_MS);await tick();
  assert.equal(gpu.workers[0].stopped,true);assert.equal(gpu.workers[1].input.backend,'wasm','a stalled GPU session falls back to CPU');gpu.workers[1].reply(done(planes,'wasm'));assert.equal((await pending).backend,'wasm');assert.equal(lastDevice(events),'cpu-fallback');runner.stop();
 }finally{gpu.restore();}
});
test('cancellation from a progress callback cannot start work afterward',async()=>{
 const fixture=fakeWorkers();try{const runner=new InferenceRunner();await assert.rejects(runner.run([new Float32Array([.1])],()=>runner.stop()),error=>error.name==='AbortError');assert.equal(fixture.workers.length,0);}finally{fixture.restore();}
});
test('cancelling a running window terminates the worker at once',async()=>{
 const fixture=fakeWorkers();try{const runner=new InferenceRunner(),pending=runner.run([new Float32Array([.1])],()=>{});fixture.workers[0].reply({kind:'phase',phase:'Separating'});runner.stop();await assert.rejects(pending,error=>error.name==='AbortError');assert.equal(fixture.workers[0].stopped,true);}finally{fixture.restore();}
});
