import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat,writeFile,mkdir,readFile,mkdtemp,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {join,extname,normalize} from 'node:path';
import {tmpdir,loadavg} from 'node:os';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const site=join(root,'.artifacts/s27-root');
const env=process.env;
const mode=env.BENCH_MODE??'warm';
const inputs=(env.BENCH_INPUTS??'excerpt10').split(',');
const candidates=(env.BENCH_CANDIDATES??'scnet-main,scnet-reuse2,demucs-webgpu,demucs-wasm').split(',');
const rounds=Number(env.BENCH_ROUNDS??5);
const overlaps=(env.BENCH_OVERLAPS??'0.1,0.25,0.4,0.5').split(',').map(Number);
const runLimitMs=Number(env.BENCH_RUN_LIMIT_MS??900_000);
const report=env.BENCH_REPORT??join(root,'.artifacts/sprint-27/bench-'+mode+'.json');
const isolated=env.BENCH_CROSS_ORIGIN_ISOLATED==='1';
const saveOutputs=env.BENCH_SAVE_OUTPUTS;
const port=Number(env.BENCH_PORT??4277);

const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.json':'application/json','.onnx':'application/octet-stream','.f32':'application/octet-stream','.css':'text/css'};
const server=createServer(async(request,response)=>{
 const path=normalize(decodeURIComponent(new URL(request.url,'http://x').pathname));
 const file=join(site,path);
 try{
  const info=await stat(file);if(!info.isFile())throw Error('not a file');
  const headers={'content-type':types[extname(file)]??'application/octet-stream','content-length':info.size,'cache-control':'max-age=600','last-modified':info.mtime.toUTCString()};
  if(isolated)Object.assign(headers,{'cross-origin-opener-policy':'same-origin','cross-origin-embedder-policy':'require-corp'});
  response.writeHead(200,headers);createReadStream(file).pipe(response);
 }catch{response.writeHead(404);response.end();}
});
await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${port}/audio-toolkit-v1/scripts/demucs-bench.html`;

function tree(marker){
 const rows=execFileSync('ps',['-axo','pid=,ppid=,rss=,command='],{encoding:'utf8',maxBuffer:1<<26}).trim().split('\n').map(line=>{const m=line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/);return m&&{pid:+m[1],ppid:+m[2],rss:+m[3]*1024,command:m[4]};}).filter(Boolean);
 const main=rows.find(row=>row.command.includes(marker)&&!row.command.includes('--type='));
 if(!main)return [];
 const owned=new Set([main.pid]);let grew=true;
 while(grew){grew=false;for(const row of rows)if(!owned.has(row.pid)&&owned.has(row.ppid)){owned.add(row.pid);grew=true;}}
 return rows.filter(row=>owned.has(row.pid)).map(row=>({pid:row.pid,rss:row.rss,type:row.command.match(/--type=(\S+)/)?.[1]??'browser',utility:row.command.match(/--utility-sub-type=(\S+)/)?.[1]}));
}
function sampler(marker){
 let peak=null,timer;
 const take=()=>{const processes=tree(marker),byType={};let total=0;for(const p of processes){const key=p.utility?`utility:${p.utility}`:p.type;byType[key]=(byType[key]??0)+p.rss;total+=p.rss;}if(!peak||total>peak.total)peak={total,byType};return {total,byType};};
 return {take,start(){peak=null;take();timer=setInterval(take,250);},stop(){clearInterval(timer);take();return peak;}};
}

const results={mode,startedAt:new Date().toISOString(),revision:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),build:JSON.parse(await readFile(join(root,'.artifacts/sprint-27/bench-build.json'),'utf8')),host:{cpus:execFileSync('sysctl',['-n','machdep.cpu.brand_string'],{encoding:'utf8'}).trim(),logicalCores:+execFileSync('sysctl',['-n','hw.ncpu'],{encoding:'utf8'}),memoryBytes:+execFileSync('sysctl',['-n','hw.memsize'],{encoding:'utf8'})},crossOriginIsolated:isolated,runs:[],failures:[]};
const save=()=>writeFile(report,JSON.stringify(results,null,2)+'\n');
await mkdir(join(root,'.artifacts/sprint-27'),{recursive:true});

async function browserSession(extraArgs=[]){
 const profile=await mkdtemp(join(tmpdir(),'s27-bench-'));
 const context=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true,args:['--enable-unsafe-webgpu','--enable-features=WebGPUDeveloperFeatures',...extraArgs]});
 results.chrome??=context.browser()?.version()??null;
 return {context,memory:sampler(profile),close:async()=>{await context.close();await rm(profile,{recursive:true,force:true});}};
}

async function once(session,inputName,spec,label){
 const page=await session.context.newPage(),errors=[],consoleLines=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(consoleLines.length<200)consoleLines.push(message.type()+': '+message.text().slice(0,300));});
 const record={label,input:inputName,...spec,loadAverage:loadavg()[0]};
 try{
  await page.goto(url);
  await page.waitForFunction(()=>window.bench,null,{timeout:60_000});
  results.chrome??=await page.evaluate(()=>navigator.userAgent);
  results.gpu??=await page.evaluate(()=>window.bench.gpu());
  await page.evaluate(name=>window.bench.load(name),inputName);
  const before=session.memory.take();session.memory.start();
  let timer;
  const outcome=await Promise.race([page.evaluate(s=>window.bench.run(s),spec).then(value=>({value}),error=>({error:String(error.message??error).split('\n')[0]})),new Promise(resolve=>{timer=setTimeout(()=>resolve({error:`Run exceeded ${runLimitMs} ms`}),runLimitMs);})]);
  clearTimeout(timer);
  const peak=session.memory.stop();
  record.memory={beforeBytes:before.total,peakBytes:peak.total,peakIncreaseBytes:peak.total-before.total,peakByType:peak.byType,beforeByType:before.byType};
  if(outcome.error)throw Error(outcome.error);
  Object.assign(record,outcome.value);
  const ok=record.vocals.complete&&record.vocals.finite&&record.accompaniment.complete&&record.accompaniment.finite&&record.vocals.rms>0&&record.accompaniment.rms>0;
  if(!ok)throw Error('Output incomplete, nonfinite or silent');
  if(saveOutputs&&label==='round 1'&&spec.candidate!=='scnet-app'){await mkdir(saveOutputs,{recursive:true});for(const which of ['vocals','accompaniment'])await writeFile(join(saveOutputs,`${inputName}.${spec.candidate}${spec.overlap?'.o'+spec.overlap:''}.${which}.wav`),Buffer.from(await page.evaluate(w=>window.bench.wav(w),which),'base64'));}
  record.ok=true;
  console.log(label,inputName,spec.candidate,spec.overlap??'',`${(record.wallMs/1000).toFixed(2)} s`,`RTF ${record.realTimeFactor.toFixed(2)}`,`windows ${record.windows}`,`loads ${record.loads}`,record.backends.join('+'),`peak +${(record.memory.peakIncreaseBytes/2**20).toFixed(0)} MiB`);
 }catch(error){
  record.ok=false;record.error=String(error.message??error);results.failures.push({label,input:inputName,...spec,error:record.error});
  console.log(label,inputName,spec.candidate,'FAILED',record.error);
 }finally{
  record.pageErrors=errors;record.console=consoleLines.filter(line=>!line.startsWith('log:')||/warn|error|placed|assigned/i.test(line));
  await page.close().catch(()=>{});
  results.runs.push(record);await save();
 }
 return record;
}

const specFor=candidate=>({candidate});
try{
 if(mode==='warm'){
  const session=await browserSession();
  try{
   for(const input of inputs){
    if(env.BENCH_WARMUP!=='0')for(const candidate of candidates)await once(session,input,specFor(candidate),'warmup');
    for(let round=1;round<=rounds;round++){
     const order=round%2?candidates:[...candidates].reverse();
     for(const candidate of order)await once(session,input,specFor(candidate),`round ${round}`);
    }
   }
  }finally{await session.close();}
 }else if(mode==='cold'){
  for(const candidate of candidates){
   const session=await browserSession();
   try{await once(session,inputs[0],specFor(candidate),'cold');await once(session,inputs[0],specFor(candidate),'warm after cold');}
   finally{await session.close();}
  }
 }else if(mode==='overlap'){
  const session=await browserSession(),candidate=candidates[0];
  try{
   for(const input of inputs){
    for(const overlap of overlaps)await once(session,input,{candidate,overlap},'warmup');
    for(let round=1;round<=rounds;round++){
     const order=round%2?overlaps:[...overlaps].reverse();
     for(const overlap of order)await once(session,input,{candidate,overlap},`round ${round}`);
    }
   }
  }finally{await session.close();}
 }else if(mode==='identity'){
  const session=await browserSession();
  try{for(const candidate of candidates)for(const vendored of [true,false])await once(session,inputs[0],{candidate,vendored},vendored?'vendored neural.js':'stride-patched neural.js');}
  finally{await session.close();}
 }else if(mode==='cancel'){
  const settle=()=>new Promise(resolve=>setTimeout(resolve,3000));
  const cases=[{name:'cancel during model fetch',spec:{candidate:'demucs-webgpu',cancel:'fetch'}},{name:'cancel during session creation',spec:{candidate:'demucs-webgpu',cancel:'session'}},{name:'cancel after first window',spec:{candidate:'demucs-webgpu',cancel:'first-window'}},{name:'cancel during WASM inference',spec:{candidate:'demucs-wasm',cancel:'first-window'}},{name:'injected WebGPU session failure',spec:{candidate:'demucs-webgpu',failGpu:'session'}},{name:'injected WebGPU run failure',spec:{candidate:'demucs-webgpu',failGpu:'run'}},{name:'GPU disabled browser',spec:{candidate:'demucs-webgpu'},args:['--disable-gpu','--disable-software-rasterizer']}];
  for(const item of cases){
   const session=await browserSession(item.args??[]),page=await session.context.newPage(),lines=[];
   page.on('console',message=>lines.push(message.text().slice(0,300)));
   const record={label:item.name,input:inputs[0],...item.spec,args:item.args??[]};
   try{
    await page.goto(url);await page.waitForFunction(()=>window.bench,null,{timeout:60_000});
    record.gpuAdapter=await page.evaluate(()=>window.bench.gpu());
    await page.evaluate(name=>window.bench.load(name),inputs[0]);
    record.memoryBeforeBytes=session.memory.take().total;session.memory.start();
    const outcome=await page.evaluate(spec=>window.bench.attempt(spec),item.spec);
    record.peakBytes=session.memory.stop().total;
    await settle();
    record.memoryAfterSettleBytes=session.memory.take().total;
    record.ok=outcome.ok;
    if(outcome.ok){const r=outcome.record;Object.assign(record,{wallMs:r.wallMs,backends:r.backends,attempts:r.attempts,windows:r.windows,complete:r.vocals.complete&&r.accompaniment.complete,finite:r.vocals.finite&&r.accompaniment.finite,marks:r.marks.filter(m=>!m.event.startsWith('window '))});}
    else{const stop=outcome.marks.find(m=>m.event==='stop');Object.assign(record,{error:outcome.error,stopAt:stop?.at??null,rejectedAt:outcome.rejectedAt,stopToRejectMs:stop?outcome.rejectedAt-stop.at:null,marks:outcome.marks.filter(m=>!m.event.startsWith('window '))});}
    const retry=await page.evaluate(spec=>window.bench.attempt(spec),{candidate:item.spec.candidate});
    record.retry={ok:retry.ok,error:retry.error,wallMs:retry.record?.wallMs,backends:retry.record?.backends,complete:retry.ok&&retry.record.vocals.complete&&retry.record.accompaniment.complete};
    await settle();record.memoryAfterRetryBytes=session.memory.take().total;
   }catch(error){record.harnessError=String(error.message??error);results.failures.push({label:item.name,error:record.harnessError});}
   finally{record.console=lines.filter(line=>/fallback|error|fail|adapter/i.test(line)).slice(0,20);await page.close().catch(()=>{});await session.close();results.runs.push(record);await save();}
   console.log(item.name,record.ok?'completed':'rejected',record.error??'',record.stopToRejectMs!=null?`stop->reject ${record.stopToRejectMs.toFixed(1)} ms`:'',record.backends??'',`retry ${record.retry?.ok}`,`mem before ${(record.memoryBeforeBytes/2**20).toFixed(0)} peak ${(record.peakBytes/2**20).toFixed(0)} settled ${(record.memoryAfterSettleBytes/2**20).toFixed(0)} MiB`);
  }
 }else if(mode==='profile'){
  const provider=candidates[0].endsWith('wasm')?'wasm':'webgpu',model=candidates[0].startsWith('scnet')?'scnet':'demucs';
  const session=await browserSession(),page=await session.context.newPage(),kernels=[];
  const placement=[];page.on('console',message=>{const text=message.text();if(text.includes('[profiling]'))kernels.push(text);else if(/ExecutionProvider|placed|assigned|Node\(s\)/i.test(text))placement.push(text);});
  try{
   await page.goto(url);await page.waitForFunction(()=>window.bench,null,{timeout:60_000});
   await page.evaluate(name=>window.bench.load(name),inputs[0]);
   const cdp=await session.context.newCDPSession(page);
   await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:500});await cdp.send('Profiler.start');
   const outcome=model==='scnet'?{timings:await page.evaluate(p=>window.bench.profileScnetWindow(p),provider)}:await page.evaluate(p=>window.bench.profile(p),provider);
   const {profile}=await cdp.send('Profiler.stop');
   const dir=join(root,'.artifacts/sprint-27/profile');await mkdir(dir,{recursive:true});
   await writeFile(join(dir,`${model}-${provider}-${inputs[0]}.cpuprofile`),JSON.stringify(profile));
   const byId=new Map(profile.nodes.map(node=>[node.id,node])),self=new Map();
   profile.samples.forEach((id,index)=>{const node=byId.get(id),frame=node.callFrame,key=`${frame.functionName||'(anonymous)'} ${frame.url.split('/').pop()}:${frame.lineNumber}:${frame.columnNumber}`;self.set(key,(self.get(key)??0)+(profile.timeDeltas[index]??0)/1000);});
   const categories={};
   profile.samples.forEach((id,index)=>{const frame=byId.get(id).callFrame,name=frame.functionName,category=['(idle)','(program)','(garbage collector)'].includes(name)?name:frame.url.endsWith('.wasm')?'ort wasm':/ort\./.test(frame.url)?'ort js':frame.url?'separation js':'other';categories[category]=(categories[category]??0)+(profile.timeDeltas[index]??0)/1000;});
   const top=[...self.entries()].sort((a,b)=>b[1]-a[1]).slice(0,40).map(([frame,ms])=>({frame,ms:Math.round(ms)}));
   const ops=new Map();let kernelNs=0;
   for(const line of kernels){const m=line.match(/kernel "([^"]*)".*?execution time: (\d+) ns/);if(!m)continue;const op=m[1].split('|')[1]??m[1];const ns=+m[2];kernelNs+=ns;const entry=ops.get(op)??{count:0,ms:0};entry.count++;entry.ms+=ns/1e6;ops.set(op,entry);}
   results.runs.push({label:'profile',model,provider,input:inputs[0],...outcome,cpuCategoriesMs:Object.fromEntries(Object.entries(categories).map(([k,v])=>[k,Math.round(v)])),cpuSelfTimeTop:top,gpuKernelLines:kernels.length,gpuKernelMs:kernelNs/1e6,gpuOps:Object.fromEntries([...ops.entries()].sort((a,b)=>b[1].ms-a[1].ms).map(([op,v])=>[op,{count:v.count,ms:Math.round(v.ms*10)/10}])),kernelSample:kernels.slice(0,3)});
   await writeFile(join(dir,`${model}-${provider}-${inputs[0]}.kernels.txt`),kernels.join('\n'));await writeFile(join(dir,`${model}-${provider}-${inputs[0]}.placement.txt`),placement.join('\n'));
   console.log('profile',model,provider,inputs[0],JSON.stringify(outcome.timings),'kernel lines',kernels.length,'kernel ms',(kernelNs/1e6).toFixed(0));
  }finally{await page.close().catch(()=>{});await session.close();}
 }else throw Error('Unknown BENCH_MODE '+mode);
}finally{
 results.finishedAt=new Date().toISOString();await save();server.close();
}
console.log('Wrote',report,'failures',results.failures.length);
process.exitCode=results.failures.length?1:0;
