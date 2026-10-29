import {isolate} from '../src/pcm/isolate';
import type {PcmBlock,PcmContext,PcmStream} from '../src/pcm/blocks';
import type {DspStats} from '../src/pcm/protocol';

export async function runReconstructionProbe(){
 const frames=573437;
 async function* source():PcmStream{
  for(let offset=0;offset<frames;offset+=2048){const length=Math.min(2048,frames-offset);yield{origin:0,offset,rate:44100,planes:[440,660].map(frequency=>Float32Array.from({length},(_,index)=>Math.round((.18*Math.sin(2*Math.PI*frequency*(offset+index)/44100)+.03*Math.cos(2*Math.PI*123*(offset+index)/44100))*32767)/32768))};}
 }
 function context(){
  const records:PcmBlock[]=[];let window=0;
  const stats:Pick<DspStats,'isolationPasses'|'isolationWindows'|'maxIsolationFrames'|'isolationLoads'|'isolationBackends'>={isolationPasses:0,isolationWindows:0,maxIsolationFrames:0,isolationLoads:0,isolationBackends:[]};
  const checkpoint:PcmContext['checkpoint']=async()=>({append:async block=>{records.push(block);},seal:async()=>({read:()=> (async function*(){yield* records;})()}),discard:async()=>{}});
  return{signal:new AbortController().signal,event:()=>{},stats,checkpoint,infer:async(planes:readonly Float32Array[])=>{window++;return{kind:'done' as const,backend:'wasm' as const,attempts:1,planes:planes.map((plane,channel)=>Float32Array.from(plane,(value,index)=>.005*Math.sin(index*.016+channel)+Math.tanh(value)*.03*window))};}};
 }
 async function collect(stream:PcmStream){const output=[new Float32Array(frames),new Float32Array(frames)];for await(const block of stream)block.planes.forEach((plane,channel)=>output[channel].set(plane,block.offset));return output;}
 const original=await collect(source()),voice=await collect(isolate(source(),'voice',context())),music=await collect(isolate(source(),'music',context()));let maxError=0,at=0;
 for(let channel=0;channel<2;channel++)for(let index=0;index<frames;index++){const error=Math.abs(voice[channel][index]+music[channel][index]-original[channel][index]);if(error>maxError){maxError=error;at=index;}}
 return{frames,maxError,at};
}
