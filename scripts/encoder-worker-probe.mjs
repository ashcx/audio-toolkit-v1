import {chromium,webkit}from'playwright';import{mkdir,writeFile}from'node:fs/promises';
const root=process.env.ENCODER_PROBE_DIR??'.artifacts/encoder-worker-probe';await mkdir(root,{recursive:true});
const base=process.env.ENCODER_PROBE_URL??'http://127.0.0.1:5175/audio-toolkit-v1/';const records=[];
for(const [name,type]of[['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch();try{for(const codec of ['mp3','m4a','flac','opus']){
  const page=await browser.newPage();await page.goto(base);const traces=await page.evaluate(({codec,base})=>new Promise(resolve=>{
   const traces=[],worker=new Worker(new URL('probes/encoder-worker.ts',base),{type:'module'});const timer=setTimeout(()=>{worker.terminate();resolve(traces.concat({phase:'deadline'}));},6000);
   worker.onmessage=event=>{traces.push(event.data);if(['done','error'].includes(event.data.phase)){clearTimeout(timer);worker.terminate();resolve(traces);}};
   worker.onerror=event=>{clearTimeout(timer);worker.terminate();resolve(traces.concat({phase:'worker-error',message:event.message}));};worker.postMessage(codec);
  }),{codec,base});records.push({browser:name,codec,traces});console.log(name,codec,JSON.stringify(traces.filter(x=>x.phase!=='nested-reply')));await page.close();
 }}finally{await browser.close();}
}
await writeFile(`${root}/results.json`,JSON.stringify(records,null,2)+'\n');
