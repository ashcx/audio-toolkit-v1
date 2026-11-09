import {chromium} from 'playwright';
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import assert from 'node:assert/strict';

const providers=(process.env.DEMUCS_PROVIDERS??'wasm,webgpu').split(',');
const fixtures=process.env.DEMUCS_FIXTURES??'tiny,short,segment,long';
const tensors=process.env.DEMUCS_TENSORS??'tiny,short';
const report=process.env.DEMUCS_REPORT??'.artifacts/sprint-27/pipeline-check.json';
const appFloorDb={tiny:-Infinity,short:40,segment:50,long:50};
const pipelineFloorDb=120;
const server=await createServer({server:{host:'127.0.0.1',port:4271,strictPort:true},logLevel:'error'});
await server.listen();
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-webgpu']});
const results={pipelineFloorDb,chrome:browser.version(),runs:{}};
let failed=false;
await mkdir(dirname(report),{recursive:true});
try{
 for(const provider of providers){
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:4271/audio-toolkit-v1/scripts/demucs-pipeline-check.html?provider=${provider}&fixtures=${fixtures}&tensors=${tensors}`);
  await page.waitForFunction(()=>window.__demucs,null,{timeout:3_600_000,polling:1000});
  const run=await page.evaluate(()=>window.__demucs);run.pageErrors=errors;results.runs[provider]=run;
  await page.close();
  await writeFile(report,JSON.stringify(results,null,2)+'\n');
  if(run.error){console.log(provider,'failed:',run.error.split('\n')[0]);failed=true;continue;}
  for(const [name,record] of Object.entries(run.fixtures)){
   for(const output of ['vocals','accompaniment']){
    const stem=record[output],complete=stem.finite&&stem.outputFrames.every(frames=>frames===record.frames),ok=complete&&stem.snrDb>=appFloorDb[name];
    console.log(provider,name,output,ok?'matches reference':'DIFFERS',`snr=${stem.snrDb.toFixed(1)}dB maxAbs=${stem.maxAbs.toExponential(2)} windows=${record.windows}`);
    failed||=!ok;
   }
   for(const [feed,match] of Object.entries(record.firstWindowFeeds??{})){const ok=match.snrDb>=pipelineFloorDb;console.log(provider,name,feed,ok?'pipeline matches':'PIPELINE DIFFERS',`snr=${match.snrDb.toFixed(1)}dB`);failed||=!ok;}
  }
 }
}finally{await browser.close();await server.close();}
assert(!failed,'A provider failed, a stem was incomplete, or the pipeline differed from the numpy reference');
