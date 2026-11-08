import {chromium} from 'playwright';
import {createServer} from 'vite';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

const evidence=process.env.ISOLATION_EVIDENCE_DIR??'docs/sprint-evidence/sprint-27';
const outputs=process.env.ISOLATION_OUTPUT_DIR??'.artifacts/sprint-27/app-check';
const music=process.env.ISOLATION_MUSIC_DIR??'../../../.artifacts/music16';
const ffmpeg=process.env.FFMPEG??'/opt/homebrew/bin/ffmpeg',ffprobe=process.env.FFPROBE??'/opt/homebrew/bin/ffprobe';
const MODEL_BYTES=85034606,STRIDE=257985,SEGMENT=343980;
await mkdir(outputs,{recursive:true});await mkdir(evidence,{recursive:true});
const server=process.env.APP_URL?null:await createServer({server:{host:'127.0.0.1',port:4275,strictPort:true},logLevel:'error'});
await server?.listen();
const app=process.env.APP_URL??'http://127.0.0.1:4275/audio-toolkit-v1/';
const duration=path=>Number(execFileSync(ffprobe,['-v','error','-show_entries','format=duration','-of','csv=p=0',path],{encoding:'utf8'}));
const decode=path=>{const pcm=execFileSync(ffmpeg,['-v','error','-i',path,'-f','f32le','-'],{maxBuffer:512*1024*1024});return new Float32Array(pcm.buffer.slice(pcm.byteOffset,pcm.byteOffset+pcm.byteLength));};
const rms=samples=>Math.sqrt(samples.reduce((sum,value)=>sum+value*value,0)/samples.length);
function ownedRss(){
 const rows=execFileSync('ps',['-A','-o','pid=,ppid=,rss='],{encoding:'utf8'}).trim().split('\n').map(line=>line.trim().split(/\s+/).map(Number));
 const owned=new Set([process.pid]);let changed=true;
 while(changed){changed=false;for(const [pid,ppid] of rows)if(owned.has(ppid)&&!owned.has(pid)){owned.add(pid);changed=true;}}
 return rows.reduce((sum,[pid,,rss])=>pid!==process.pid&&owned.has(pid)?sum+rss*1024:sum,0);
}
const record={app,chrome:null,runs:[],checks:[]};
const pass=(name,detail={})=>{record.checks.push({name,...detail});console.log('ok',name,JSON.stringify(detail));};

async function open(args){
 const browser=await chromium.launch({channel:'chrome',headless:true,args});record.chrome??=browser.version();
 const context=await browser.newContext({acceptDownloads:true,viewport:{width:1440,height:1000}});
 await context.addInitScript(()=>{
  window.__stats=[];window.__downloads=[];window.__done=[];window.__devices=[];window.__activeModels=0;window.__maxModels=0;const Original=Worker;
  window.Worker=new Proxy(Original,{construct(target,args){
   const worker=Reflect.construct(target,args),model=args[1]?.name==='audio-isolation';let stopped=false;
   if(model){window.__activeModels++;window.__maxModels=Math.max(window.__maxModels,window.__activeModels);const terminate=worker.terminate.bind(worker);worker.terminate=()=>{if(!stopped){stopped=true;window.__activeModels--;}return terminate();};}
   worker.addEventListener('message',({data})=>{
    if(data.stats)window.__stats.push(data.stats);
    if(model&&data.kind==='model-download')window.__downloads.push(data);
    if(model&&data.kind==='done')window.__done.push({backend:data.backend,gpuDispatches:data.gpuDispatches,stems:data.stems.length,channels:data.stems[0].length});
   });
   return worker;}});
  setInterval(()=>{const label=document.querySelector('.device-badge')?.textContent;if(label&&window.__devices.at(-1)!==label)window.__devices.push(label);},20);
 });
 const page=await context.newPage(),errors=[],requests=[];page.setDefaultTimeout(600000);
 page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>requests.push(request.url()));
 await page.goto(app);
 return {browser,page,errors,requests};
}
async function setup(page,input,keep){
 await page.goto(app);
 await page.getByLabel('Choose audio or video files').setInputFiles(input);await page.locator('[data-inspection=ready]').waitFor();
 await page.getByRole('combobox',{name:'Format',exact:true}).selectOption('wav');
 await page.getByLabel('Add step',{exact:true}).selectOption('isolation');
 await page.getByRole('combobox',{name:'Keep',exact:true}).selectOption(keep);
 await page.locator('[data-isolation-device]:not([data-isolation-device=checking])').waitFor();
}
async function stores(page){return page.evaluate(async()=>{const directory=await(await navigator.storage.getDirectory()).getDirectoryHandle('audio-toolkit-v1',{create:true});let count=0;for await(const entry of directory.values())count++;return count;});}
async function exportAndDownload(page,name,label,capture){
 await page.getByRole('button',{name:'Export',exact:true}).click();
 if(capture){await page.getByText(/Separating \d+ \/ \d+/).first().waitFor();await page.screenshot({path:`${evidence}/${capture}-running.png`,fullPage:true});}
 const link=page.getByRole('link',{name:/Download exported audio/});await link.waitFor();
 const pending=page.waitForEvent('download');await link.click();const download=await pending;const path=`${outputs}/${label}.wav`;await download.saveAs(path);
 if(capture)await page.screenshot({path:`${evidence}/${capture}-done.png`,fullPage:true});
 return path;
}
function verifyOutput(path,input,label){
 const expected=duration(input),actual=duration(path),samples=decode(path),level=rms(samples);
 assert(Math.abs(actual-expected)<1e-3,`${label}: output ${actual}s, input ${expected}s`);
 assert(samples.every(Number.isFinite),`${label}: finite samples`);assert(level>1e-3,`${label}: non-silent output, rms ${level}`);
 return {seconds:actual,inputSeconds:expected,rms:level};
}

let failed=false;
try{
 const live=`${music}/live.ogg`,instrumental=`${music}/instrumental.ogg`,tone='tests/fixtures/tone.wav';
 {
  const {browser,page,errors,requests}=await open(['--enable-unsafe-webgpu']);
  try{
   const adapter=await page.evaluate(async()=>{const value=await navigator.gpu?.requestAdapter();return value?{vendor:value.info.vendor,architecture:value.info.architecture,isFallbackAdapter:value.info.isFallbackAdapter??null}:null;});
   assert(adapter&&!adapter.isFallbackAdapter,'GPU run needs a hardware WebGPU adapter');record.gpuAdapter=adapter;
   for(const keep of ['music','voice']){
    await setup(page,live,keep);
    if(keep==='music'){
     await page.getByRole('button',{name:'Preview live.ogg',exact:true}).click();await page.getByRole('button',{name:'Close preview',exact:true}).waitFor();
     assert.equal(await page.evaluate(()=>window.__stats.at(-1).isolationBackends.join()),'webgpu+wasm');assert.equal(await page.evaluate(()=>window.__stats.at(-1).isolationPasses),1);
     await page.screenshot({path:`${evidence}/app-gpu-preview.png`,fullPage:true});await page.getByRole('button',{name:'Close preview',exact:true}).click();
     pass('preview isolates the excerpt with Demucs on the GPU');await page.evaluate(()=>{window.__done.length=0;window.__downloads.length=0;});
     const note=await page.locator('[data-isolation-device]').innerText();assert.match(note,/85 MB/);assert.doesNotMatch(note,/on the CPU/);pass('editor names the 85 MB first-use download and no CPU warning with a GPU',{note});}
    const started=Date.now(),path=await exportAndDownload(page,'live.ogg',`gpu-${keep}`,keep==='music'?'app-gpu':null),elapsedMs=Date.now()-started;
    const output=verifyOutput(path,live,keep),stats=await page.evaluate(()=>window.__stats.at(-1)),done=await page.evaluate(()=>window.__done),downloads=await page.evaluate(()=>window.__downloads);
    const windows=Math.ceil(Math.round(output.inputSeconds*44100)/STRIDE);
    assert.equal(stats.isolationPasses,1);assert.equal(stats.isolationWindows,windows);assert.equal(stats.isolationLoads,1,'one model session per job');assert.equal(stats.maxIsolationFrames,SEGMENT);assert.deepEqual(stats.isolationBackends,['webgpu+wasm']);
    assert(done.length>=windows&&done.every(value=>value.stems===4&&value.gpuDispatches>0),'every window returns four stems and issued GPU work');
    assert(downloads.length>0&&downloads.at(-1).loaded===MODEL_BYTES&&downloads.every(event=>event.total===MODEL_BYTES),'model download progress reaches the verified size');
    await page.getByText('Separated with Demucs on the GPU.',{exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>window.__devices.at(-1)),'GPU + CPU','badge shows GPU only after GPU work was observed');
    assert.equal(await page.evaluate(()=>window.__activeModels),0,'model worker released after export');assert.equal(await page.evaluate(()=>window.__maxModels),1);
    record.runs.push({device:'gpu',keep,input:'live.ogg',elapsedMs,windows,output,stats,gpuDispatchesPerWindow:done.slice(-windows).map(value=>value.gpuDispatches)});
    pass(`GPU ${keep} export`,{elapsedMs,windows,seconds:output.seconds,rms:output.rms});
    await page.evaluate(()=>{window.__done.length=0;window.__downloads.length=0;});
   }
   const truncated=Buffer.from((await readFile('public/vendor/neural/htdemucs_fp16.onnx')).subarray(0,1<<20));let served=false;
   await page.route('**/htdemucs_fp16.onnx',route=>{if(served)return route.continue();served=true;return route.fulfill({status:200,body:truncated});});
   await setup(page,tone,'voice');let kept=await stores(page);await page.getByRole('button',{name:'Export',exact:true}).click();
   await page.getByText('The isolation model download is incomplete. Retry.',{exact:true}).waitFor();assert.equal(await stores(page),kept,'a failed export leaves no temporary files');
   await page.getByRole('button',{name:'Retry tone.wav',exact:true}).click();await page.getByRole('link',{name:/Download exported audio/}).waitFor();await page.unroute('**/htdemucs_fp16.onnx');
   pass('a short model download is refused before use and retry recovers');
   await setup(page,instrumental,'voice');kept=await stores(page);await page.getByRole('button',{name:'Export',exact:true}).click();
   await page.getByText(/Separating 2 \/ \d+/).first().waitFor();await page.screenshot({path:`${evidence}/app-cancel-before.png`,fullPage:true});
   const cancelAt=Date.now();await page.getByRole('button',{name:'Cancel instrumental.ogg',exact:true}).click();
   await page.getByText('Cancelled',{exact:true}).waitFor();const cancelMs=Date.now()-cancelAt;
   assert.equal(await page.evaluate(()=>window.__activeModels),0,'cancel terminates the model worker');
   await page.waitForFunction(async kept=>{const directory=await(await navigator.storage.getDirectory()).getDirectoryHandle('audio-toolkit-v1',{create:true});let count=0;for await(const entry of directory.values())count++;return count===kept;},kept);
   assert.equal(await page.getByRole('link',{name:/Download exported audio/}).count(),0);
   await page.screenshot({path:`${evidence}/app-cancel-after.png`,fullPage:true});
   pass('cancel mid-separation stops the model worker and leaves no temporary files',{cancelMs});
   const longSeconds=Number(process.env.ISOLATION_LONG_SECONDS??0);
   if(longSeconds){
    const long=`${outputs}/long-${longSeconds}s.wav`;
    execFileSync(ffmpeg,['-v','error','-y','-stream_loop','-1','-i',instrumental,'-t',String(longSeconds),'-ar','44100','-ac','2','-c:a','pcm_s16le',long]);
    await setup(page,long,'music');const baseline=ownedRss();let peak=baseline;const sampler=setInterval(()=>{peak=Math.max(peak,ownedRss());},500);
    const started=Date.now();let path;try{path=await exportAndDownload(page,'long',`gpu-long-${longSeconds}s`,null);}finally{clearInterval(sampler);}
    const elapsedMs=Date.now()-started,output=verifyOutput(path,long,'long'),stats=await page.evaluate(()=>window.__stats.at(-1));
    record.long={seconds:longSeconds,elapsedMs,windows:stats.isolationWindows,maxIsolationFrames:stats.maxIsolationFrames,backends:stats.isolationBackends,baselineOwnedRssMiB:Math.round(baseline/2**20),peakOwnedRssMiB:Math.round(peak/2**20),peakIncreaseMiB:Math.round((peak-baseline)/2**20),output};
    pass(`GPU ${longSeconds} s export with sampled browser memory`,record.long);
   }
   const foreign=requests.filter(url=>!url.startsWith('http://127.0.0.1')&&!url.startsWith('blob:')&&!url.startsWith('data:'));
   assert.deepEqual(foreign,[],'no third-party requests');assert.deepEqual(errors,[]);pass('no third-party requests and no page errors');
  }finally{await browser.close();}
 }
 {
  const {browser,page,errors}=await open(['--disable-gpu','--disable-software-rasterizer']);
  try{
   assert.equal(await page.evaluate(async()=>!!(await navigator.gpu?.requestAdapter().catch(()=>null))),false,'this launch has no WebGPU adapter');
   await setup(page,tone,'music');
   const note=await page.locator('[data-isolation-device]').innerText();assert.match(note,/on the CPU, slower than real time/);assert.match(note,/85 MB/);
   await page.screenshot({path:`${evidence}/app-cpu-editor.png`,fullPage:true});
   const started=Date.now(),path=await exportAndDownload(page,'tone.wav','cpu-music',null),elapsedMs=Date.now()-started,output=verifyOutput(path,tone,'cpu music');
   const stats=await page.evaluate(()=>window.__stats.at(-1));assert.deepEqual(stats.isolationBackends,['wasm']);
   assert.deepEqual(await page.evaluate(()=>window.__devices),['CPU'],'device label is CPU throughout');
   await page.getByText('Separated with Demucs on the CPU.',{exact:true}).waitFor();await page.screenshot({path:`${evidence}/app-cpu-done.png`,fullPage:true});
   assert.deepEqual(errors,[]);record.runs.push({device:'cpu',keep:'music',input:'tone.wav',elapsedMs,output,stats});
   pass('without WebGPU the editor warns, isolation runs on CPU and is labelled CPU',{elapsedMs,note});
  }finally{await browser.close();}
 }
}catch(error){failed=true;record.error=String(error?.stack??error);console.error(error);}
finally{await server?.close();await writeFile(`${evidence}/app-check.json`,JSON.stringify(record,null,2)+'\n');}
assert(!failed,'Demucs app check failed');
