import test from 'node:test';
import assert from 'node:assert/strict';
import {isolate,fitIsolationFrames} from '../src/pcm/isolate.ts';
import {resample} from '../src/pcm/resample.ts';
function source(frames,rate,channels=1,frequency=440){return(async function*(){for(let offset=0;offset<frames;offset+=127){const length=Math.min(127,frames-offset);yield{origin:.625,offset,rate,planes:Array.from({length:channels},(_,c)=>Float32Array.from({length},(_,i)=>.1*Math.sin((offset+i)*2*Math.PI*(frequency+c*200)/rate)+.003))};}})();}
async function collect(stream){const samples=[];let frames=0;for await(const block of stream){assert.equal(block.origin,.625);assert.equal(block.offset,frames);assert(block.planes[0].length<=4096);samples.push(...block.planes[0]);frames+=block.planes[0].length;}return Float32Array.from(samples);}
function context(){let released=false,windows=0;const records=[];const stats={isolationPasses:0,isolationWindows:0,maxIsolationFrames:0,isolationLoads:0,isolationBackends:[]};return{
 signal:new AbortController().signal,stats,event:()=>{},get released(){return released;},
 checkpoint:async()=>({append:async block=>records.push({...block,planes:block.planes.map(plane=>new Float32Array(plane))}),seal:async()=>({read:()=> (async function*(){yield* records;})()}),discard:async()=>{released=true;records.length=0;}}),
 infer:async planes=>{windows++;return{kind:'done',backend:'wasm',attempts:1,planes:planes.map(plane=>plane.map(value=>value*.4))};},
};}
test('both modes reconstruct the reference and retain rate/frame/source-time grids',async()=>{
 for(const [frames,rate,channels]of[[481,44100,1],[4095,192000,1],[96037,48000,2],[1733,16000,1]]){
  const voiceContext=context(),musicContext=context();const voice=await collect(isolate(source(frames,rate,channels),'voice',voiceContext)),music=await collect(isolate(source(frames,rate,channels),'music',musicContext));
  const reference=await collect(source(frames,rate,channels));assert.equal(voice.length,frames);assert.equal(music.length,frames);
  let error=0;for(let i=0;i<frames;i++)error=Math.max(error,Math.abs(voice[i]+music[i]-reference[i]));assert(error<1e-5,`${rate} reconstruction ${error}`);assert(voiceContext.released&&musicContext.released);assert.equal(voiceContext.stats.isolationPasses,1);assert.equal(voiceContext.stats.isolationLoads,voiceContext.stats.isolationWindows);
 }
});
test('final grid correction can drop samples spanning a block boundary',async()=>{
 const samples=await collect(fitIsolationFrames(source(4097,192000),4095,.625,192000));assert.equal(samples.length,4095);
});
test('inference failure discards the analysis checkpoint',async()=>{
 const state=context();state.infer=async()=>{throw new Error('Model failure');};await assert.rejects(async()=>collect(isolate(source(441,44100),'voice',state)),/Model failure/);assert.equal(state.released,true);
});

test('music retains source frequencies above the model band',async()=>{
 const frames=96001,rate=96000,original=await collect(source(frames,rate,1,30000)),music=await collect(isolate(source(frames,rate,1,30000),'music',context()));let originalEnergy=0,musicEnergy=0;
 for(let index=128;index<frames-128;index++){originalEnergy+=original[index]**2;musicEnergy+=music[index]**2;}assert(Math.sqrt(musicEnergy/originalEnergy)>.99);
});

test('weak stereo isolation preserves every sample across long replay block boundaries',async()=>{
 const frames=573437;
 async function collectStereo(stream){const output=[new Float32Array(frames),new Float32Array(frames)];for await(const block of stream)block.planes.forEach((plane,channel)=>output[channel].set(plane,block.offset));return output;}
 function state(){const value=context();value.infer=async planes=>{await new Promise(resolve=>setTimeout(resolve,0));return{kind:'done',backend:'wasm',attempts:1,planes:planes.map(plane=>plane.map(sample=>sample*.004))};};return value;}
 const original=await collectStereo(source(frames,44100,2)),voice=await collectStereo(isolate(source(frames,44100,2),'voice',state())),music=await collectStereo(isolate(source(frames,44100,2),'music',state()));
 for(let channel=0;channel<2;channel++)for(let index=0;index<frames;index++)assert(Math.abs(voice[channel][index]+music[channel][index]-original[channel][index])<1e-7,`channel ${channel}, frame ${index}`);
});
