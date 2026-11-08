import {chromium} from 'playwright';
import {createServer} from 'vite';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const providers=(process.env.DEMUCS_PROVIDERS??'wasm,webgpu').split(',');
const fixtures=process.env.DEMUCS_FIXTURES??'tiny,short,segment,long';
const tensors=process.env.DEMUCS_TENSORS??'tiny,short';
const optimization=process.env.DEMUCS_OPTIMIZATION??'all';
const nodes=process.env.DEMUCS_NODES;
const report=process.env.DEMUCS_REPORT??'docs/sprint-evidence/sprint-27/browser-check.json';
const pipelineFloorDb=120;
const server=await createServer({server:{host:'127.0.0.1',port:4271,strictPort:true},logLevel:'error'});
await server.listen();
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-webgpu']});
const results={pipelineFloorDb,optimization,chrome:browser.version(),runs:{}};
let failed=false;
try{
 for(const provider of providers){
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(nodes?`http://127.0.0.1:4271/audio-toolkit-v1/scripts/demucs-node-check.html?provider=${provider}&fixture=${nodes}`:`http://127.0.0.1:4271/audio-toolkit-v1/scripts/demucs-check.html?provider=${provider}&fixtures=${fixtures}&tensors=${tensors}&optimization=${optimization}`);
  await page.waitForFunction(()=>window.__demucs,null,{timeout:3_600_000,polling:1000});
  const run=await page.evaluate(()=>window.__demucs);run.pageErrors=errors;results.runs[provider]=run;
  await page.close();
  await writeFile(report,JSON.stringify(results,null,2)+'\n');
  if(run.error){console.log(provider,'failed:',run.error.split('\n')[0]);failed=true;continue;}
  if(nodes){const first=run.nodes.find(node=>node.rms>1e-6&&node.snrDb<60);console.log(provider,nodes,run.nodes.length,'nodes; first non-silent node below 60 dB:',first?`${first.op} ${first.name} ${first.snrDb.toFixed(1)}dB`:'none');continue;}
  for(const [name,record] of Object.entries(run.fixtures)){
   for(const [source,stem] of Object.entries(record.stems)){
    const complete=stem.finite&&stem.outputFrames.every(frames=>frames===record.frames);
    console.log(provider,name,source,complete?'complete':'INCOMPLETE',`runtime agreement snr=${stem.snrDb.toFixed(1)}dB maxAbs=${stem.maxAbs.toExponential(2)}`);
    failed||=!complete;
   }
   for(const [feed,match] of Object.entries(record.firstWindow?.pipelineFeeds??{})){
    const ok=match.snrDb>=pipelineFloorDb;
    console.log(provider,name,feed,ok?'pipeline matches':'PIPELINE DIFFERS',`snr=${match.snrDb.toFixed(1)}dB`);
    failed||=!ok;
   }
  }
 }
}finally{await browser.close();await server.close();}
assert(!failed,'A provider failed, a stem was incomplete, or the adapter feeds differed from the reference tensors');
