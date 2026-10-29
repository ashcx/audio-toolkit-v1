import {chromium,webkit} from 'playwright';import{readFile,writeFile,mkdir}from'node:fs/promises';import{execFileSync}from'node:child_process';
const base=process.env.PCM_DECODE_PROBE_URL??'http://127.0.0.1:5175/audio-toolkit-v1/';
const root=process.env.PCM_DECODE_EVIDENCE_DIR??'.artifacts/pcm-decode-probe';await mkdir(root,{recursive:true});const records=[];
for(const engine of [chromium,webkit]){
 const browser=await engine.launch();
 try{for(const name of ['tone.wav','tone.mp3','tone.m4a','tone.flac','tone.ogg','tone.opus']){
  const page=await browser.newPage();await page.goto(base);await page.waitForLoadState('networkidle');const bytes=await readFile(`tests/fixtures/${name}`);
  const decoded=await page.evaluate(({name,bytes,base})=>new Promise(resolve=>{
   const worker=new Worker(new URL('probes/pcm-decode-worker.ts',base),{type:'module'});const timer=setTimeout(()=>{worker.terminate();resolve({error:'Probe deadline'});},10000);
   worker.onmessage=e=>{clearTimeout(timer);worker.terminate();resolve(e.data);};worker.onerror=e=>{clearTimeout(timer);worker.terminate();resolve({error:String(e.message)});};worker.postMessage(new File([new Uint8Array(bytes)],name));
  }),{name,bytes:[...bytes],base});
  const reference=execFileSync('ffmpeg',['-v','error','-i',`tests/fixtures/${name}`,'-map','0:a:0','-f','f32le','-']);const samples=new Float32Array(reference.buffer.slice(reference.byteOffset,reference.byteOffset+reference.byteLength));
  let rmse=null,maxError=null;
  if(decoded.head){let sum=0;maxError=0;for(let i=0;i<decoded.head.length;i++){const delta=decoded.head[i]-samples[i*2];sum+=delta*delta;maxError=Math.max(maxError,Math.abs(delta));}rmse=Math.sqrt(sum/decoded.head.length);}
  const {head,...summary}=decoded;records.push({browser:engine.name(),file:name,...summary,referenceFrames:samples.length/2,rmse,maxError});console.log(engine.name(),name,decoded.frames??decoded.error,rmse);await page.close();
 }}finally{await browser.close();}
}
await writeFile(`${root}/results.json`,JSON.stringify(records,null,2)+'\n');
