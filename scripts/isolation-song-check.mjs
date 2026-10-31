import {chromium,webkit} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {basename} from 'node:path';
import assert from 'node:assert/strict';
import {childProcesses,monitorBrowserMemory} from './browser-memory.mjs';

const engine=process.env.ISOLATION_ENGINE??'chromium';
const inputs=process.env.ISOLATION_SONG?.split(',');
assert(inputs?.length,'Set ISOLATION_SONG to private, ignored anonymous audio aliases.');
const root=process.env.ISOLATION_EVIDENCE_DIR??`.artifacts/isolation-song/${crypto.randomUUID()}`;
assert(root.startsWith('.artifacts/'),'Private results must stay under .artifacts/.');
await mkdir(root,{recursive:true});
const type={chromium,webkit}[engine];assert(type,'Unsupported test browser');
const before=await childProcesses();
const context=await type.launchPersistentContext(`${root}/profile`,{headless:true,acceptDownloads:true});
const roots=[...await childProcesses()].filter(id=>!before.has(id));assert(roots.length);
const memory=monitorBrowserMemory(roots,()=>context.close());
const records=[];
let passed=false;
try{
 await context.addInitScript(()=>{
  window.__song={stats:[],progress:[],labels:[],models:0,active:0,maxActive:0};
  document.addEventListener('DOMContentLoaded',()=>new MutationObserver(()=>{const label=document.querySelector('.file-result > span')?.textContent;if(label&&window.__song.labels.at(-1)!==label)window.__song.labels.push(label);}).observe(document.body,{subtree:true,childList:true,characterData:true}));
  window.Worker=new Proxy(Worker,{construct(target,args){
   const worker=Reflect.construct(target,args),model=args[1]?.name==='audio-isolation';
   if(model){window.__song.models++;window.__song.active++;window.__song.maxActive=Math.max(window.__song.maxActive,window.__song.active);let stopped=false;const terminate=worker.terminate.bind(worker);worker.terminate=()=>{if(!stopped){stopped=true;window.__song.active--;}return terminate();};}
   worker.addEventListener('message',({data})=>{if(data.stats)window.__song.stats.push(data.stats);if(data.kind==='isolation-progress')window.__song.progress.push({completed:data.completed,total:data.total});});return worker;
  }});
 });
 const page=context.pages()[0],errors=[],methods=new Set();
 page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>methods.add(request.method()));
 page.setDefaultTimeout(1_200_000);
 for(const [inputIndex,input] of inputs.entries())for(const mode of (process.env.ISOLATION_MODES??'voice,music').split(',')){
  await page.goto(process.env.APP_URL??'http://127.0.0.1:4178/audio-toolkit-v1/');
  await page.getByLabel('Choose audio or video files').setInputFiles(input);
  await page.locator('[data-inspection=ready]').waitFor();
  const format=process.env.ISOLATION_FORMAT??'wav';
  await page.getByRole('combobox',{name:'Format',exact:true}).selectOption(format);
  await page.getByLabel('Add step',{exact:true}).selectOption('isolation');
  await page.getByRole('combobox',{name:'Keep',exact:true}).selectOption(mode);
  const started=Date.now();await page.getByRole('button',{name:'Export',exact:true}).click();
  const link=page.getByRole('link',{name:/Download exported audio/});
  let finished=false;
  const status=(async()=>{while(!finished){await new Promise(resolve=>setTimeout(resolve,10_000));if(finished)break;const observation=await page.evaluate(()=>({models:window.__song.models,progress:window.__song.progress.at(-1),state:document.querySelector('[data-job-state]')?.dataset.jobState}));await writeFile(`${root}/status.json`,JSON.stringify({engine,mode,seconds:(Date.now()-started)/1000,...observation})+'\n');if(observation.state==='failed')throw new Error('Export failed; inspect private browser capture');}})();
  try{await Promise.race([link.waitFor(),status]);}finally{finished=true;await status.catch(()=>{});}
  const pending=page.waitForEvent('download');await link.click();const download=await pending;const output=`${root}/${inputIndex+1}-${mode}.${format}`;await download.saveAs(output);
  const trace=await page.evaluate(()=>window.__song),stats=trace.stats.at(-1);
  assert.equal(trace.active,0);assert.equal(trace.maxActive,1);assert.equal(stats.isolationPasses,1);assert.equal(stats.decodePasses,1);
  assert(trace.progress.length>1,'Actual completed-window progress required');
  assert.equal(trace.progress[0].completed,0);
  for(let i=1;i<trace.progress.length;i++){assert.equal(trace.progress[i].completed,trace.progress[i-1].completed+1);assert.equal(trace.progress[i].total,trace.progress[0].total);}
  assert.equal(trace.progress.at(-1).completed,stats.isolationWindows);assert.equal(trace.progress.at(-1).total,stats.isolationWindows);
  const firstLabel=trace.labels.findIndex(label=>label.startsWith('Separating ')),lastLabel=trace.labels.findLastIndex(label=>label.startsWith('Separating '));
  assert(firstLabel>=0,'The real UI must display isolation progress');assert(trace.labels.slice(firstLabel,lastLabel+1).every(label=>label.startsWith('Separating ')),'Initialization phases must not replace completed-window progress');
  const decode=path=>execFileSync('ffmpeg',['-v','error','-i',path,'-f','f32le','-'],{maxBuffer:256*1024*1024});
  const original=decode(input),decoded=decode(output),samples=new Float32Array(decoded.buffer,decoded.byteOffset,decoded.byteLength/4);
  assert(samples.every(Number.isFinite));if(format==='wav')assert.equal(decoded.length,original.length);
  let energy=0,peak=0;for(const sample of samples){energy+=sample*sample;peak=Math.max(peak,Math.abs(sample));}
  assert(energy>0,'Real song output must contain audio');
  records.push({inputIndex,engine,mode,format,sourceSamples:original.length/4,outputSamples:samples.length,rms:Math.sqrt(energy/samples.length),peak,seconds:(Date.now()-started)/1000,stats,models:trace.models,progress:trace.progress,labels:trace.labels});
  assert.deepEqual(errors,[]);assert.deepEqual([...methods],['GET']);
  await page.screenshot({path:`${root}/${inputIndex+1}-${mode}-completed.png`,fullPage:true});
  await page.getByRole('button',{name:`Remove ${basename(input)}`,exact:true}).click();
  await page.waitForFunction(async()=>{const directory=await(await navigator.storage.getDirectory()).getDirectoryHandle('audio-toolkit-v1');for await(const value of directory.values())return false;return true;});
  await writeFile(`${root}/results.json`,JSON.stringify({records,memory:memory.report},null,2)+'\n');console.log(engine,mode,'completed and decoded',stats.isolationWindows,'windows');
 }
 passed=true;
}finally{
 await memory.stop();await context.close();
 await writeFile(`${root}/results.json`,JSON.stringify({passed,records,memory:memory.report},null,2)+'\n');
 assert.equal(memory.report.budgetExceeded,false,'Owned browser RSS exceeded 2 GiB');
}
