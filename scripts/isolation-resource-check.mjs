import {chromium,webkit} from 'playwright';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=process.env.ISOLATION_RESOURCE_DIR??'.artifacts/isolation-resource';await mkdir(root,{recursive:true});
const budget=2*1024**3,records=[];
const mode=process.env.ISOLATION_SESSION_MODE??'reuse';
const arena=process.env.ISOLATION_ARENA==='1';
const frames=Number(process.env.ISOLATION_FRAMES??485100),repeats=Number(process.env.ISOLATION_REPEATS??5);
async function ownedRss(rootPid){
 const processes=new Map();
 await Promise.all((await readdir('/proc')).filter(id=>/^\d+$/.test(id)).map(async id=>{
  try{const status=await readFile(`/proc/${id}/status`,'utf8');processes.set(Number(id),{parent:Number(status.match(/^PPid:\s+(\d+)/m)?.[1]),rss:Number(status.match(/^VmRSS:\s+(\d+)/m)?.[1]??0)*1024});}catch{}
 }));
 const owned=new Set([rootPid]);let changed=true;
 while(changed){changed=false;for(const [id,process] of processes)if(owned.has(process.parent)&&!owned.has(id)){owned.add(id);changed=true;}}
 return [...owned].reduce((sum,id)=>sum+(processes.get(id)?.rss??0),0);
}
for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
 if(process.env.ISOLATION_ENGINE&&process.env.ISOLATION_ENGINE!==engine)continue;
 const server=await type.launchServer({headless:true,host:'127.0.0.1'}),browser=await type.connect(server.wsEndpoint());
 let peak=0,samples=0,stopping=false,exceeded=false,completed=0;const errors=[],requests=[];
 const sampling=(async()=>{while(!stopping){const rss=await ownedRss(server.process().pid);peak=Math.max(peak,rss);samples++;if(rss>budget){exceeded=true;await browser.close();break;}await new Promise(resolve=>setTimeout(resolve,250));}})();
 try{
  const page=await browser.newPage();page.on('console',message=>{if(message.text().startsWith('isolation-part ')){completed++;console.log(engine,'completed',completed);}});page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>requests.push(request.url()));
  const url=process.env.PROBE_URL??'http://127.0.0.1:4174/audio-toolkit-v1/probes/';await page.goto(url);await page.waitForFunction(()=>window.runIsolationProbe);
  const result=await page.evaluate(async({repeats,frames,mode,arena})=>{if(mode==='runner')return window.runInferenceProbe({repeats,frames});if(mode==='reuse')return window.runIsolationProbe({repeats,frames,arena});const summaries=[];let result;for(let index=0;index<repeats;index++){result=await window.runIsolationProbe({repeats:1,frames,arena});if(result.type!=='done')return result;summaries.push(...result.summaries);}return {...result,summaries};},{repeats,frames,mode,arena});assert.equal(result.type,'done',JSON.stringify(result));assert.equal(result.summaries.length,repeats);assert(result.summaries.every(item=>item.finite&&item.voiceFrames===frames&&(mode==='runner'||item.musicFrames===frames)));if(mode!=='runner')assert.equal(result.hash,'3f049a0e4ce3c08264a6212a50445ba77f02a517cd4c6dc86cbe1ca130176d67');assert.equal(exceeded,false);assert.deepEqual(errors,[]);
  assert(!requests.some(value=>!value.startsWith(new URL(url).origin)&&!value.startsWith('blob:')));
  records.push({engine,claim:`${repeats} full fixed-window calls in ${mode} mode; single-run resource-bound observation, not a speed comparison or phone limit`,inputFramesPerCall:frames,calls:repeats,sessionLoads:mode==='reuse'?1:repeats,mode,retainedResultFrames:0,peakOwnedBrowserProcessRssBytes:peak,samples,rssBudgetBytes:budget,failures:0,errors,result});console.log(engine,repeats,mode,'full-window calls passed',peak);
 }catch(error){records.push({engine,peakOwnedBrowserProcessRssBytes:peak,samples,rssBudgetBytes:budget,callsCompleted:completed,inputFramesPerCall:frames,failures:1,budgetExceeded:exceeded,message:String(error),errors});throw error;}
 finally{stopping=true;await sampling;await browser.close();await server.close();await writeFile(`${root}/results.json`,JSON.stringify(records,null,2)+'\n');}
}
