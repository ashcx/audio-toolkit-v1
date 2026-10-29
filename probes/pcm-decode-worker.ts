import {inspectMedia} from "../src/media";
import {decodePcm} from "../src/pcm/decode.ts";
self.onmessage=async({data:file}:MessageEvent<File>)=>{
 const signal=new AbortController().signal;const inspected=await inspectMedia(file,signal);
 if(inspected.kind==='failed'){self.postMessage({error:inspected.message});return;}
 const stats={passes:0,maxDecodedFrames:0};let frames=0;const head:number[]=[];
 try{for await(const block of decodePcm(file,inspected.metadata,signal,stats)){
  frames+=block.planes[0].length;
  for(const value of block.planes[0])if(head.length<4096)head.push(value);
 }self.postMessage({frames,head,stats,metadata:inspected.metadata});}catch(error){self.postMessage({error:String(error),stats});}
};
