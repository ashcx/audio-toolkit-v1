import test from 'node:test';
import assert from 'node:assert/strict';
import {isolate,fitIsolationFrames} from '../src/pcm/isolate.ts';
import {resample} from '../src/pcm/resample.ts';
function source(frames,rate,channels=1,frequency=440){return(async function*(){for(let offset=0;offset<frames;offset+=127){const length=Math.min(127,frames-offset);yield{origin:.625,offset,rate,planes:Array.from({length:channels},(_,c)=>Float32Array.from({length},(_,i)=>.1*Math.sin((offset+i)*2*Math.PI*(frequency+c*200)/rate)+.003))};}})();}
async function collect(stream){const samples=[];let frames=0;for await(const block of stream){assert.equal(block.origin,.625);assert.equal(block.offset,frames);assert(block.planes[0].length<=4096);samples.push(...block.planes[0]);frames+=block.planes[0].length;}return Float32Array.from(samples);}
const COEFFICIENTS=[.1,.2,.3,.4];
function stems(planes,scale=1){return{kind:'done',backend:'wasm',attempts:1,loads:1,stems:COEFFICIENTS.map(coefficient=>planes.map(plane=>plane.map(value=>value*coefficient*scale)))};}
const monoMean=samples=>samples.reduce((sum,value)=>sum+value,0)/samples.length;
function context(){let released=false,windows=0;const records=[];const stats={isolationPasses:0,isolationWindows:0,maxIsolationFrames:0,isolationLoads:0,isolationBackends:[]};return{
 signal:new AbortController().signal,stats,event:()=>{},get released(){return released;},
 checkpoint:async()=>({append:async block=>records.push({...block,planes:block.planes.map(plane=>new Float32Array(plane))}),seal:async()=>({read:()=> (async function*(){yield* records;})()}),discard:async()=>{released=true;records.length=0;}}),
 infer:async planes=>{windows++;return stems(planes);},
};}
test('both modes reconstruct the reference and retain rate/frame/source-time grids',async()=>{
 for(const [frames,rate,channels]of[[481,44100,1],[4095,192000,1],[96037,48000,2],[1733,16000,1]]){
  const voiceContext=context(),musicContext=context();const voice=await collect(isolate(source(frames,rate,channels),'voice',voiceContext)),music=await collect(isolate(source(frames,rate,channels),'music',musicContext));
  const reference=await collect(source(frames,rate,channels));assert.equal(voice.length,frames);assert.equal(music.length,frames);
  if(channels===1){
   const mean=monoMean(reference),edge=rate===44100?0:Math.ceil(rate/1000);let error=0;
   for(let i=edge;i<frames-edge;i++){error=Math.max(error,Math.abs(voice[i]-(.4*(reference[i]-mean)+mean)),Math.abs(music[i]-(.6*(reference[i]-mean)+3*mean)));}
   assert(error<(rate===44100?1e-6:2e-4),`${rate} vocals and drums+bass+other are restored with Demucs's per-stem mean ${error}`);
  }
  assert(voiceContext.released&&musicContext.released);assert.equal(voiceContext.stats.isolationPasses,1);assert.equal(voiceContext.stats.isolationLoads,voiceContext.stats.isolationWindows);
 }
});
test('final grid correction can drop samples spanning a block boundary',async()=>{
 const samples=await collect(fitIsolationFrames(source(4097,192000),4095,.625,192000));assert.equal(samples.length,4095);
});
test('inference failure discards the analysis checkpoint',async()=>{
 const state=context();state.infer=async()=>{throw new Error('Model failure');};await assert.rejects(async()=>collect(isolate(source(441,44100),'voice',state)),/Model failure/);assert.equal(state.released,true);
});


test('stereo isolation keeps every sample in place across long replay block boundaries',async()=>{
 const frames=573437;
 async function collectStereo(stream){const output=[new Float32Array(frames),new Float32Array(frames)];for await(const block of stream)block.planes.forEach((plane,channel)=>output[channel].set(plane,block.offset));return output;}
 function state(){const value=context();value.infer=async planes=>{await new Promise(resolve=>setTimeout(resolve,0));return stems(planes,.01);};return value;}
 const original=await collectStereo(source(frames,44100,2)),voice=await collectStereo(isolate(source(frames,44100,2),'voice',state())),music=await collectStereo(isolate(source(frames,44100,2),'music',state()));
 const mean=monoMean(Array.from(original[0],(value,index)=>(value+original[1][index])/2));
 for(let channel=0;channel<2;channel++)for(let index=0;index<frames;index++){const centered=original[channel][index]-mean;assert(Math.abs(voice[channel][index]-mean-.004*centered)<1e-7,`vocals channel ${channel}, frame ${index}`);assert(Math.abs(music[channel][index]-3*mean-.006*centered)<1e-7,`accompaniment channel ${channel}, frame ${index}`);}
});
test('silent and single-frame inputs stay finite and report completed work',async()=>{
 for(const frames of [1,441])for(const keep of ['voice','music']){const state=context(),events=[];state.event=event=>events.push(event);const input=(async function*(){yield{origin:.625,offset:0,rate:44100,planes:[new Float32Array(frames)]};})();const output=await collect(isolate(input,keep,state));assert.equal(output.length,frames);assert(output.every(value=>value===0));assert.deepEqual(events.filter(event=>event.kind==='isolation-progress'),[{kind:'isolation-progress',completed:0,total:1},{kind:'isolation-progress',completed:1,total:1}]);assert(state.released);}
});
test('empty audio fails before allocating a model or checkpoint',async()=>{
 const state=context();state.infer=async()=>assert.fail('Empty audio must not invoke inference');await assert.rejects(collect(isolate((async function*(){})(),'voice',state)),/no audio/);assert.equal(state.stats.isolationLoads,0);
});
test('failure after a completed window releases its checkpoint and does not advance progress',async()=>{
 const state=context(),events=[];let calls=0;state.event=event=>events.push(event);state.infer=async planes=>{if(++calls===2)throw new Error('Late model failure');return stems(planes);};await assert.rejects(collect(isolate(source(700000,44100),'music',state)),/Late model failure/);assert.equal(calls,2);assert(state.released);assert.deepEqual(events.filter(event=>event.kind==='isolation-progress').map(event=>event.completed),[0,1]);
});
