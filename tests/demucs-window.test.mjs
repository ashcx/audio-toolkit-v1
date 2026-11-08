import test from 'node:test';
import assert from 'node:assert/strict';
import {demucsWindows,demucsWindowCount,DEMUCS_SEGMENT,DEMUCS_STRIDE,DEMUCS_SOURCES} from '../src/pcm/demucs-window.ts';
import {demucsSpectrogram,demucsWaveforms,separateSegment} from '../src/inference/demucs-segment.ts';

const sample=(channel,position)=>channel?Math.cos(position*.017)*.2:Math.sin(position*.019)*.3+.001;
function signal(frames,channels,chunk=4093){return(async function*(){for(let from=0;from<frames;from+=chunk){const length=Math.min(chunk,frames-from);yield{origin:.37,offset:from,rate:44100,planes:Array.from({length:channels},(_,c)=>Float32Array.from({length},(_,i)=>sample(c,from+i)))};}})();}
function model(){let calls=0;return async planes=>{const window=calls++;return DEMUCS_SOURCES.map((_,source)=>planes.map(plane=>Float32Array.from(plane,value=>value*(source+1)/10+window/100+source/1000)));};}
function upstream(frames,channels,sources){
 const half=DEMUCS_SEGMENT>>1,weight=index=>(index<half?index+1:DEMUCS_SEGMENT-index)/half,out=Array.from({length:channels},()=>new Float64Array(frames)),total=new Float64Array(frames);
 let window=0;
 for(let offset=0;offset<frames;offset+=DEMUCS_STRIDE,window++){
  const length=Math.min(DEMUCS_SEGMENT,frames-offset);
  for(let index=0;index<length;index++){
   const position=offset+index;total[position]+=weight(index);
   for(let c=0;c<channels;c++){let sum=0;for(const name of sources){const source=DEMUCS_SOURCES.indexOf(name);sum+=Math.fround(Math.fround(sample(c,position))*(source+1)/10+window/100+source/1000);}out[c][position]+=weight(index)*sum;}
  }
 }
 return out.map(plane=>plane.map((value,index)=>value/total[index]));
}
async function streamed(frames,channels,sources,infer=model()){
 const stats={windows:0,maxWindowFrames:0},planes=Array.from({length:channels},()=>new Float32Array(frames));let received=0;
 for await(const block of demucsWindows(signal(frames,channels),{frames,channels,origin:.37},sources,infer,stats)){
  assert.equal(block.offset,received);assert.equal(block.origin,.37);assert(block.planes[0].length<=4096);
  block.planes.forEach((plane,c)=>planes[c].set(plane,received));received+=block.planes[0].length;
 }
 assert.equal(received,frames,'every input frame is emitted once');
 return {planes,stats};
}

test('streamed Demucs windows equal whole-track apply_model overlap-add, including short and final windows',async()=>{
 for(const frames of [1,4000,DEMUCS_SEGMENT-1,DEMUCS_SEGMENT,DEMUCS_SEGMENT+1,2*DEMUCS_STRIDE,2*DEMUCS_STRIDE+5,1323001]){
  for(const sources of [['vocals'],['drums','bass','other']]){
   const {planes,stats}=await streamed(frames,2,sources),expected=upstream(frames,2,sources);
   let error=0;for(let c=0;c<2;c++)for(let i=0;i<frames;i++)error=Math.max(error,Math.abs(planes[c][i]-expected[c][i]));
   assert(error<1e-6,`${frames} ${sources} max error ${error}`);
   assert.equal(stats.windows,demucsWindowCount(frames));assert.equal(stats.maxWindowFrames,DEMUCS_SEGMENT);
  }
 }
 assert.deepEqual([1,DEMUCS_STRIDE,DEMUCS_STRIDE+1,DEMUCS_SEGMENT,1323001].map(demucsWindowCount),[1,1,2,2,6]);
});

test('a short track is centered in one zero-padded window and the final short window reuses earlier audio',async()=>{
 const windows=[],record=async planes=>{windows.push(planes.map(plane=>new Float32Array(plane)));return model()(planes);};
 await streamed(100000,1,['vocals'],record);
 const lead=(DEMUCS_SEGMENT-100000)>>1;
 assert.equal(windows[0][0][lead-1],0);assert.equal(windows[0][0][lead],Math.fround(sample(0,0)));assert.equal(windows[0][0][lead+99999],Math.fround(sample(0,99999)));assert.equal(windows[0][0][lead+100000],0);
 windows.length=0;const frames=DEMUCS_STRIDE+1000;await streamed(frames,1,['vocals'],record);
 const start=DEMUCS_STRIDE-((DEMUCS_SEGMENT-1000)>>1);
 assert.equal(windows.length,2);assert.equal(windows[1][0][0],Math.fround(sample(0,start)));assert.equal(windows[1][0][frames-1-start],Math.fround(sample(0,frames-1)));assert.equal(windows[1][0][frames-start],0);
});

test('the model must return four complete stems',async()=>{
 await assert.rejects(streamed(5000,2,['vocals'],async planes=>[planes]),/incomplete audio/);
});

test('the segment transform inverts in the interior and feeds the model its declared shapes',async()=>{
 const planes=[0,1].map(c=>Float32Array.from({length:DEMUCS_SEGMENT},(_,i)=>.4*Math.sin(2*Math.PI*(c?1000:440)*i/44100+c)));
 const shapes={};
 const stems=await separateSegment(planes,async feeds=>{
  for(const [name,feed] of Object.entries(feeds))shapes[name]=feed.dims;
  const copies=data=>{const out=new Float32Array(4*data.length);for(let s=0;s<4;s++)out.set(data,s*data.length);return out;};
  return {out_spec_real:{data:copies(feeds.spec_real.data),dims:[1,4,2,2048,336]},out_spec_imag:{data:copies(feeds.spec_imag.data),dims:[1,4,2,2048,336]},out_wave:{data:new Float32Array(4*2*DEMUCS_SEGMENT),dims:[1,4,2,DEMUCS_SEGMENT]}};
 });
 assert.deepEqual(shapes,{spec_real:[1,2,2048,336],spec_imag:[1,2,2048,336],audio:[1,2,DEMUCS_SEGMENT]});
 assert.equal(stems.length,4);
 let error=0;for(const stem of stems)for(let c=0;c<2;c++)for(let i=4096;i<DEMUCS_SEGMENT-4096;i++)error=Math.max(error,Math.abs(stem[c][i]-planes[c][i]));
 assert(error<1e-5,`interior round trip error ${error}`);
 await assert.rejects(separateSegment(planes,async()=>({})),/unsupported shape/);
 const {real}=demucsSpectrogram(planes),peak=real.slice(0,2048*336).reduce((best,value,index)=>Math.abs(value)>Math.abs(real[best])?index:best,0);
 assert.equal(Math.floor(peak/336),Math.round(440*4096/44100),'a 440 Hz tone peaks in its bin');
 assert.equal(demucsWaveforms(new Float32Array(4*2*2048*336),new Float32Array(4*2*2048*336),new Float32Array(4*2*DEMUCS_SEGMENT)).length,4);
});
