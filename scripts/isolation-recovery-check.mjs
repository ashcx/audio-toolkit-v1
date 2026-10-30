import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=process.env.ISOLATION_EVIDENCE_DIR??'.artifacts/isolation-recovery';await mkdir(root,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage();
const records=[];
try{
 await page.addInitScript(()=>{window.__attempts=[];window.__activeModels=0;window.Worker=new Proxy(Worker,{construct(target,args){const worker=Reflect.construct(target,args);if(args[1]?.name==='audio-isolation'){window.__activeModels++;let stopped=false;const terminate=worker.terminate.bind(worker);worker.terminate=()=>{if(!stopped){stopped=true;window.__activeModels--;}return terminate();};const send=worker.postMessage.bind(worker);worker.postMessage=(data,...rest)=>{window.__attempts.push(data.backend);return send(data,...rest);};worker.addEventListener('message',({data})=>{window.__lastModelEvent=data.kind==='phase'?data.phase:data.kind;});}return worker;}});});
 page.setDefaultTimeout(180000);const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const stores=()=>page.evaluate(async()=>{const directory=await(await navigator.storage.getDirectory()).getDirectoryHandle('audio-toolkit-v1',{create:true});let count=0;for await(const value of directory.values())count++;return count;});
 for(const backend of ['webgpu+wasm','wasm']){
  await page.goto(process.env.APP_URL??'http://127.0.0.1:4181/audio-toolkit-v1/');await page.clock.install();
  await page.getByLabel('Choose audio or video files').setInputFiles('tests/fixtures/tone.wav');await page.locator('[data-inspection=ready]').waitFor();await page.getByRole('combobox',{name:'Format',exact:true}).selectOption('wav');await page.getByLabel('Add step',{exact:true}).selectOption('isolation');
  let intercepted=0;
  await page.route(/\/assets\/worker-[^-\/]+\.js$/,route=>{if(intercepted++===0)return route.fulfill({contentType:'text/javascript',body:`self.onmessage=()=>{self.postMessage({kind:'backend',backend:${JSON.stringify(backend)}});self.postMessage({kind:'phase',phase:'Separating'});};`});return route.continue();});
  await page.getByRole('button',{name:'Export',exact:true}).click();await page.waitForFunction(()=>window.__lastModelEvent==='Separating');
  await page.clock.fastForward(300001);
  if(backend==='wasm'){
   await page.locator('[data-job-state=failed]').waitFor();assert.equal(await stores(),0);assert.equal(await page.evaluate(()=>window.__activeModels),0);assert.deepEqual(await page.evaluate(()=>window.__attempts),['auto']);await page.getByRole('button',{name:'Retry tone.wav',exact:true}).click();
  }
  await page.getByRole('link',{name:'Download',exact:true}).waitFor();
  assert.deepEqual(await page.evaluate(()=>window.__attempts),backend==='wasm'?['auto','auto']:['auto','wasm']);assert.equal(await page.evaluate(()=>window.__activeModels),0);
  await page.getByRole('button',{name:'Remove tone.wav',exact:true}).click();await page.waitForFunction(async()=>{const dir=await(await navigator.storage.getDirectory()).getDirectoryHandle('audio-toolkit-v1');for await(const value of dir.values())return false;return true;});
  await page.unrouteAll();records.push({injectedStallBackend:backend,actualModelRetryCompleted:true,ownedStoresAfterRemoval:await stores()});await writeFile(`${root}/results.json`,JSON.stringify(records,null,2)+'\n');console.log(backend,'stall recovery passed');
 }
 for(const fault of ['model','wasm']){
  await page.goto(process.env.APP_URL??'http://127.0.0.1:4181/audio-toolkit-v1/');
  await page.getByLabel('Choose audio or video files').setInputFiles('tests/fixtures/tone.wav');await page.locator('[data-inspection=ready]').waitFor();await page.getByRole('combobox',{name:'Format',exact:true}).selectOption('wav');await page.getByLabel('Add step',{exact:true}).selectOption('isolation');
  const pattern=fault==='model'?'**/scnet.int8.onnx':'**/ort-wasm*.wasm';let intercepted=0;
  await page.route(pattern,route=>{intercepted++;return route.fulfill({status:404,body:'Not found'});});
  await page.getByRole('button',{name:'Export',exact:true}).click();await page.locator('[data-job-state=failed]').waitFor();assert(intercepted>0);assert.equal(await stores(),0);assert.equal(await page.evaluate(()=>window.__activeModels),0);assert.equal(await page.getByRole('link',{name:'Download',exact:true}).count(),0);
  await page.unrouteAll();await page.getByRole('button',{name:'Retry tone.wav',exact:true}).click();await page.getByRole('link',{name:'Download',exact:true}).waitFor();
  await page.getByRole('button',{name:'Remove tone.wav',exact:true}).click();await page.waitForFunction(async()=>{const dir=await(await navigator.storage.getDirectory()).getDirectoryHandle('audio-toolkit-v1');for await(const value of dir.values())return false;return true;});
  records.push({missingAsset:fault,actualModelRetryCompleted:true,ownedStoresAfterRemoval:await stores()});await writeFile(`${root}/results.json`,JSON.stringify(records,null,2)+'\n');console.log(fault,'missing asset recovery passed');
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
