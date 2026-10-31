import {setSlider} from './browser-controls.mjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {chromium,webkit} from 'playwright';
const root=process.env.BATCH_EVIDENCE_DIR??'.artifacts/batch-check';
const url=process.env.APP_URL??'http://127.0.0.1:4174/audio-toolkit-v1/';
await mkdir(`${root}/captures`,{recursive:true});await mkdir('.artifacts/batch-inputs',{recursive:true});
const input='.artifacts/batch-inputs/long.wav';
execFileSync('ffmpeg',['-v','error','-y','-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=20','-ac','2',input]);
const fixture=await readFile(input);
const inputPcm=execFileSync('ffmpeg',['-v','error','-i',input,'-f','f32le','-'],{maxBuffer:16*1024*1024});
const inputFloats=new Float32Array(inputPcm.buffer.slice(inputPcm.byteOffset,inputPcm.byteOffset+inputPcm.byteLength));let inputPeak=0;for(const value of inputFloats)inputPeak=Math.max(inputPeak,Math.abs(value));
const records=[];
for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
 const context=await type.launchPersistentContext(`.artifacts/batch-profiles/${randomUUID()}`,{headless:true,acceptDownloads:true,hasTouch:true,viewport:{width:1440,height:1000}});
 try{
  await context.addInitScript(()=>{
   Object.defineProperty(navigator,'hardwareConcurrency',{value:8,configurable:true});Object.defineProperty(navigator,'deviceMemory',{value:8,configurable:true});
   window.__heldCount=0;window.__releases=[];window.__release=()=>{window.__hold=null;for(const release of window.__releases.splice(0))release();};window.__events=[];window.__live=0;window.__maxLive=0;window.__held=false;window.__fault=null;window.__hold=null;
   const Original=window.Worker;
   window.Worker=new Proxy(Original,{construct(target,args){
    const worker=Reflect.construct(target,args);if(!String(args[0]).includes('pcm-worker'))return worker;
    window.__live++;window.__maxLive=Math.max(window.__maxLive,window.__live);let stopped=false;
    const terminate=worker.terminate.bind(worker);worker.terminate=()=>{if(!stopped){stopped=true;window.__live--;}return terminate();};
    worker.addEventListener('message',({data})=>{if(data.kind==='phase')window.__events.push(data.phase);});
    const post=worker.postMessage.bind(worker);worker.postMessage=(data,...rest)=>{
     if(data.kind==='start'){
      const fault=window.__fault;
      if(['read','process','encode'].includes(fault)){
       window.__fault=null;data=structuredClone(data);
       if(fault==='read')data.file=new File(['invalid'],data.file.name);
       if(fault==='process')data.plan.steps=[{id:'injected',kind:'gain',db:1e9}];
       if(fault==='encode')data.plan.snapshot.recipe.export={format:'mp3',bitrateKbps:-1};
      }
     }
     return post(data,...rest);
    };return worker;
   }});
   const proto=window.FileSystemFileHandle.prototype,original=proto.createWritable;
   proto.createWritable=async function(...args){
    const writer=await original.apply(this,args);
    for(const method of ['write','close']){
     const operation=writer[method].bind(writer);let held=false;
     writer[method]=async(...values)=>{
      if(window.__hold===method&&!held){held=true;window.__held=true;window.__heldCount++;await new Promise(resolve=>window.__releases.push(resolve));window.__held=false;}
      if(window.__fault===method){window.__fault=null;throw new Error(`Injected ${method} failure`);}
      return operation(...values);
     };
    }
    return writer;
   };
  });
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
  async function setup(count=3,copy=false){
   await page.goto(url);await page.getByLabel('Choose audio or video files').setInputFiles(Array.from({length:count},(_,i)=>({name:`clip-${i}.wav`,mimeType:'audio/wav',buffer:fixture})));
   await page.waitForFunction(n=>document.querySelectorAll('[data-inspection=ready]').length===n,count);
   await page.getByRole('combobox',{name:'Format',exact:true}).selectOption(copy?'original':'wav');
   if(!copy){await page.getByLabel('Add step',{exact:true}).selectOption('gain');await setSlider(page,'Gain (dB) slider',-6);}
  }
  const row=i=>page.locator('.file-list>li').nth(i);
  const state=async(i,kind)=>{await page.waitForFunction(({i,kind})=>document.querySelectorAll('.file-list>li')[i]?.getAttribute('data-job-state')===kind,{i,kind});};
  async function stores(){return page.evaluate(async()=>{const d=await(await navigator.storage.getDirectory()).getDirectoryHandle('audio-toolkit-v1',{create:true});let n=0;for await(const f of d.values())n++;return n;});}
  async function idle(){await page.getByRole('button',{name:'Export',exact:true}).waitFor();await page.waitForFunction(()=>!document.querySelector('.run-actions .primary').disabled);assert.equal(await page.evaluate(()=>window.__live),0);}
  async function clearAll(){while(await page.locator('[data-remove-file]').count())await page.locator('[data-remove-file]').first().click();await page.waitForFunction(async()=>{const d=await(await navigator.storage.getDirectory()).getDirectoryHandle('audio-toolkit-v1',{create:true});for await(const f of d.values())return false;return true;});}
  async function download(i,label){const pending=page.waitForEvent('download');await row(i).getByRole('link',{name:/Download exported audio/}).click();const result=await pending;const path=`.artifacts/batch-inputs/${engine}-${label}.wav`;await result.saveAs(path);const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','stream=codec_name,duration','-of','json',path]));assert.equal(probe.streams[0].codec_name,'pcm_s16le');assert.equal(Number(probe.streams[0].duration),20);return path;}
  await page.goto(url);await page.getByLabel('Choose audio or video files').setInputFiles(['tests/fixtures/tone.wav','tests/fixtures/tone.flac','tests/fixtures/video.mp4']);await page.waitForFunction(()=>document.querySelectorAll('[data-inspection=ready]').length===3);await page.getByRole('combobox',{name:'Format',exact:true}).selectOption('mp3');await page.getByRole('button',{name:'Export',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('[data-job-state=done]').length===3);await idle();const mixed=[];
  for(let i=0;i<3;i++){
   const pending=page.waitForEvent('download');await row(i).getByRole('link',{name:/Download exported audio/}).click();const downloaded=await pending;const path=`.artifacts/batch-inputs/${engine}-mixed-${i}.mp3`;await downloaded.saveAs(path);const pcm=execFileSync('ffmpeg',['-v','error','-i',path,'-f','f32le','-'],{maxBuffer:8*1024*1024});assert.equal(pcm.byteLength,96000*2*4);mixed.push(downloaded.suggestedFilename());
  }
  assert.equal(new Set(mixed).size,3);assert.equal(await stores(),3);assert.equal(await page.evaluate(()=>window.__maxLive),2);await clearAll();console.log(engine,'mixed WAV/FLAC/video to MP3 passed');
  if(process.env.BATCH_CHECK_CASE==='mixed'){records.push({engine,mixed});await writeFile(`${root}/results.json`,JSON.stringify(records,null,2)+'\n');continue;}
  console.log(engine,'cancel write');await setup();await page.evaluate(()=>window.__hold='write');await page.getByRole('button',{name:'Export',exact:true}).click();await page.waitForFunction(()=>window.__heldCount===2);
  console.log(engine,'held write');await state(2,'waiting');assert.equal(await page.getByRole('combobox',{name:'Format',exact:true}).isDisabled(),true);
  await row(2).getByRole('button',{name:'Cancel clip-2.wav',exact:true}).tap();await state(2,'cancelled');
  await row(0).getByRole('button',{name:'Cancel clip-0.wav',exact:true}).click();await state(0,'cancelling');
  console.log(engine,'cancel requested');assert.equal(await page.locator('.run-actions .primary').isDisabled(),true);assert.equal(await row(0).getByRole('link',{name:/Download exported audio/}).count(),0);
  await page.screenshot({fullPage:true,path:`${root}/captures/${engine}-desktop-cancelling.png`});
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({colorScheme:'dark'});await page.waitForFunction(()=>getComputedStyle(document.body).backgroundColor==='rgb(18, 19, 22)');await page.screenshot({fullPage:true,path:`${root}/captures/${engine}-mobile-cancelling.png`});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.evaluate(()=>window.__release());await state(0,'cancelled');await state(1,'done');await idle();assert.equal(await stores(),1);await download(1,'preserved');
  const maxLive=await page.evaluate(()=>window.__maxLive);assert.equal(maxLive,2);
  if(process.env.BATCH_CHECK_CASE==='capture'){await clearAll();records.push({engine,settledTheme:true});await writeFile(`${root}/capture-check.json`,JSON.stringify(records,null,2)+'\n');continue;}
  await setSlider(page,'Gain (dB) slider',-12);await row(0).getByRole('button',{name:'Retry clip-0.wav',exact:true}).tap();await state(0,'done');await idle();
  assert.equal(await row(0).getByText('Previous export',{exact:true}).count(),1);const retried=await download(0,'frozen-retry');
  const pcm=execFileSync('ffmpeg',['-v','error','-i',retried,'-f','f32le','-'],{maxBuffer:16*1024*1024});const floats=new Float32Array(pcm.buffer.slice(pcm.byteOffset,pcm.byteOffset+pcm.byteLength));let peak=0;for(const v of floats)peak=Math.max(peak,Math.abs(v));assert(Math.abs(peak/inputPeak-10**(-6/20))<.001,`frozen -6dB ratio ${peak/inputPeak}`);
  await clearAll();
  const failures=[];
  for(const fault of ['read','process','encode','write','close']){
   console.log(engine,'failure',fault);
   await setup();await page.evaluate(fault=>window.__fault=fault,fault);await page.getByRole('button',{name:'Export',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('[data-job-state=failed]').length===1&&document.querySelectorAll('[data-job-state=done]').length===2);await idle();assert.equal(await stores(),2);
   const message=await page.locator('[data-job-state=failed] .file-result').innerText();await page.getByRole('button',{name:'Retry failed',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('[data-job-state=done]').length===3);await idle();assert.equal(await stores(),3);assert.equal(await page.getByRole('link',{name:/Download exported audio/}).count(),3);failures.push({fault,message});await clearAll();
  }
  await setup();await page.evaluate(()=>window.__hold='close');await page.getByRole('button',{name:'Export',exact:true}).click();await page.waitForFunction(()=>window.__heldCount===2);await page.getByRole('button',{name:'Cancel all',exact:true}).click();await page.evaluate(()=>window.__release());await state(0,'cancelled');await state(2,'cancelled');await idle();assert.equal(await page.getByRole('link',{name:/Download exported audio/}).count(),await stores());await clearAll();
  await setup(2,true);await page.evaluate(()=>window.__hold='write');await page.getByRole('button',{name:'Export',exact:true}).click();await page.waitForFunction(()=>window.__heldCount===2);await row(0).getByRole('button',{name:'Cancel clip-0.wav',exact:true}).click();await state(0,'cancelling');await page.evaluate(()=>window.__release());await state(0,'cancelled');await state(1,'done');await idle();assert.equal(await stores(),1);await download(1,'copy');await clearAll();
  await setup(2);await page.evaluate(()=>window.__hold='write');await page.getByRole('button',{name:'Export',exact:true}).click();await page.waitForFunction(()=>window.__heldCount===2);await page.getByRole('button',{name:'Remove clip-0.wav',exact:true}).click();await page.evaluate(()=>window.__release());await state(0,'done');await idle();assert.equal(await stores(),1);await clearAll();
  await setup(1);await page.getByLabel('Add step',{exact:true}).selectOption('normalize');await page.getByRole('button',{name:'Export',exact:true}).focus();await page.keyboard.press('Enter');await state(0,'done');await idle();const phases=await page.evaluate(()=>window.__events);for(const value of ['Decoding','Normalizing','Processing','Processing / encoding','Encoding','Saving'])assert(phases.includes(value));await clearAll();
  await page.addInitScript(()=>{Object.defineProperty(navigator,'hardwareConcurrency',{value:2,configurable:true});Object.defineProperty(navigator,'deviceMemory',{value:undefined,configurable:true});});
  await setup();await page.evaluate(()=>window.__hold='write');await page.getByRole('button',{name:'Export',exact:true}).click();await page.waitForFunction(()=>window.__heldCount===1);assert.equal(await page.locator('[data-job-state=waiting]').count(),2);assert.equal(await page.evaluate(()=>window.__maxLive),1);await page.getByRole('button',{name:'Cancel all',exact:true}).click();await page.evaluate(()=>window.__release());await idle();assert.equal(await stores(),0);await clearAll();assert.deepEqual(errors,[]);
  records.push({engine,mixed,maxLive,failures,frozenRetryPeak:peak,waitingCancel:true,activeWriteCancel:true,closeCancelAll:true,copyChunkCancel:true,removeActive:true,cleanup:true,conservativeSingleSlot:true,phases:[...new Set(phases)],errors});await writeFile(`${root}/results.json`,JSON.stringify(records,null,2)+'\n');console.log(engine,'batch acceptance passed');
 }finally{await context.close();}
}
