import {chromium,webkit} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const base=process.env.DSP_PROBE_URL??'http://127.0.0.1:5174/audio-toolkit-v1/';
const root=process.env.DSP_PROBE_EVIDENCE_DIR??'.artifacts/decoder-worker-probe';await mkdir(root,{recursive:true});
const records=[];
for(const engine of [chromium,webkit]){
 for(const file of (process.env.DSP_PROBE_FILES?.split(',')??(process.env.DSP_PROBE_RAW?['tone.ogg']:process.env.DSP_PROBE_WASM?['tone.ogg','tone.flac']:['tone.ogg','tone.flac','tone.m4a']))){
  const browser=await engine.launch();
  try{
   const page=await browser.newPage();await page.goto(base);
   const bytes=await readFile(`tests/fixtures/${file}`);
   const result=await page.evaluate(({base,file,bytes,raw,wasm,positive,zeroSkip})=>new Promise(resolve=>{
    const traces=[];const worker=new Worker(new URL(`probes/decoder-worker.ts${raw?`?raw=1${positive?'&positive=1':''}${zeroSkip?'&zero-skip=1':''}`:wasm?'?wasm=1':''}`,base),{type:'module'});
    const finish=result=>{clearTimeout(timer);worker.terminate();resolve({...result,traces});};
    const timer=setTimeout(()=>finish({error:'Probe deadline (5s)'}),5000);
    worker.onmessage=event=>{if(event.data.kind==='trace')traces.push(event.data);else finish(event.data);};
    worker.onerror=event=>finish({error:String(event.message)});
    worker.postMessage(new File([new Uint8Array(bytes)],file));
   }),{base,file,bytes:[...bytes],raw:!!process.env.DSP_PROBE_RAW,wasm:!!process.env.DSP_PROBE_WASM,positive:!!process.env.DSP_PROBE_POSITIVE,zeroSkip:!!process.env.DSP_PROBE_ZERO_SKIP});
   if(result.head){
    const reference=execFileSync('ffmpeg',['-v','error','-i',`tests/fixtures/${file}`,'-map','0:a:0','-f','f32le','-']);const pcm=new Float32Array(reference.buffer.slice(reference.byteOffset,reference.byteOffset+reference.byteLength));
    let best={shift:0,rmse:Infinity};for(let shift=0;shift<1600;shift++){let sum=0;for(let i=0;i<1024;i++){const d=result.head[shift+i]-pcm[i*2];sum+=d*d;}const rmse=Math.sqrt(sum/1024);if(rmse<best.rmse)best={shift,rmse};}result.alignment=best;delete result.head;
   }
   records.push({browser:engine.name(),file,...result});console.log(engine.name(),file,result.frames??result.error);
  }finally{await browser.close();}
 }
}
await writeFile(`${root}/results.json`,JSON.stringify(records,null,2)+'\n');
