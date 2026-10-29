import { separate, load } from '../vendor/neural/neural.js';
self.onmessage=async()=>{
  try {
    const bytes=await fetch(new URL('../vendor/neural/scnet.int8.onnx',import.meta.url)).then(r=>{if(!r.ok)throw Error(`model HTTP ${r.status}`);return r.arrayBuffer();});
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
    if(hash!=='3f049a0e4ce3c08264a6212a50445ba77f02a517cd4c6dc86cbe1ca130176d67')throw Error('Model hash mismatch');
    const channels=[Float32Array.from({length:44100},(_,i)=>0.1*Math.sin(i*2*Math.PI*440/44100))];
    const {stems,residual}=await separate(channels,{sampleRate:44100,model:'scnet',targets:['vocals'],step:0.5,session:()=>load(bytes,{backend:'wasm',wasmPaths:new URL('../vendor/neural/',import.meta.url).href,threads:1,sessionOptions:{enableCpuMemArena:false,enableMemPattern:false}})});
    self.postMessage({type:'done',hash,voiceFrames:stems.vocals[0].length,musicFrames:residual[0].length,finite:[...stems.vocals,...residual].every(c=>c.every(Number.isFinite))});
  }catch(e){self.postMessage({type:'error',message:String(e)});}
};
