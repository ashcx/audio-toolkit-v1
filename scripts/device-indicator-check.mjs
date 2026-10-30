import {saveAction} from './browser-controls.mjs';
import {setAppearance} from './browser-controls.mjs';
import {chromium,webkit} from 'playwright';import {mkdir,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const root=process.env.DEVICE_EVIDENCE_DIR??'.artifacts/device-indicator/browser';await mkdir(root,{recursive:true});const records=[];
for(const[engine,type]of[['chromium',chromium],['webkit',webkit]]){
 const context=await type.launchPersistentContext(`${root}/${engine}-profile`,{headless:true});
 try{
  await context.addInitScript(()=>{
   window.__mode='native';window.__calls=0;const Original=Worker;
   window.Worker=new Proxy(Original,{construct(target,args){
    const worker=Reflect.construct(target,args);if(args[1]?.name!=='audio-isolation')return worker;
    const call=++window.__calls,mode=window.__mode;
    return new Proxy(worker,{
     get(target,key){if(key==='postMessage')return(data,...rest)=>target.postMessage({...data,backend:'wasm'},...rest);const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;},
     set(target,key,handler){if(key!=='onmessage')return Reflect.set(target,key,handler,target);target.onmessage=event=>{
      let data=event.data;
      if(mode==='gpu'&&['backend','done'].includes(data.kind))data={...data,backend:'webgpu+wasm'};
      if(mode==='fallback'&&call===1){
       if(data.kind==='backend')data={...data,backend:'webgpu+wasm'};
       if(data.kind==='phase'&&data.phase==='Loading model')data={kind:'error',stage:'session',backend:'webgpu+wasm',message:'Injected GPU session failure'};
      }
      handler({data});
     };return true;},
    });
   }});
  });
  const page=context.pages()[0];page.setDefaultTimeout(180000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const mode of ['native','gpu','fallback']){
   await page.goto(process.env.APP_URL??'http://127.0.0.1:4182/audio-toolkit-v1/');await page.evaluate(mode=>{window.__mode=mode;window.__calls=0;},mode);
   await page.getByLabel('Choose audio or video files').setInputFiles('tests/fixtures/tone.wav');await page.locator('[data-inspection=ready]').waitFor();await page.getByLabel('Add step',{exact:true}).selectOption('isolation');await page.getByRole('combobox',{name:'Format',exact:true}).selectOption('wav');await page.getByRole('button',{name:'Export',exact:true}).click();
   const badge=page.getByLabel('Separation processor',{exact:true});
   if(mode==='gpu')await badge.filter({hasText:'Trying GPU'}).waitFor();
   if(mode==='fallback')await badge.filter({hasText:'CPU · switched from GPU'}).waitFor();
   if(mode==='native')await badge.filter({hasText:/^CPU$/}).waitFor();
   await page.getByText(/Separating \d+ \/ \d+/).waitFor();assert.equal(await page.locator('[data-job-state=running] progress[value]').count(),1);
   await page.getByRole('link',{name:'Download',exact:true}).waitFor();const expected=mode==='gpu'?'GPU + CPU':mode==='fallback'?'CPU · switched from GPU':'CPU';assert.equal(await badge.innerText(),expected);
   for(const theme of ['light','dark']){
    await setAppearance(page,theme);await page.waitForFunction(theme=>document.documentElement.dataset.theme===theme,theme);await page.setViewportSize({width:theme==='dark'?390:1280,height:844});await page.waitForTimeout(200);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`${root}/${engine}-${mode}-${theme}.png`,fullPage:true});
   }
   await (await saveAction(page,'Clear results','button')).click();await badge.waitFor({state:'detached'});await page.waitForFunction(async()=>{const d=await(await navigator.storage.getDirectory()).getDirectoryHandle('audio-toolkit-v1');for await(const e of d.values())return false;return true;});
   records.push({engine,mode,expected,actualCpuInference:true,gpuEventsSimulated:mode!=='native',progressRetained:true,completedBadge:true,themes:['light','dark'],viewports:[1280,390],remainingStores:0});console.log(engine,mode,'passed');
  }
  assert.deepEqual(errors,[]);await writeFile(`${root}/results.json`,JSON.stringify(records,null,2)+'\n');
 }finally{await context.close();}
}
