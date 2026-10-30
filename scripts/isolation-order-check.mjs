import {chromium,webkit} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

const root=process.env.ISOLATION_ORDER_DIR??'.artifacts/isolation-order';
await mkdir(root,{recursive:true});const records=[];
for(const[engine,type]of[['chromium',chromium],['webkit',webkit]]){
 if(process.env.ISOLATION_CHECK_ENGINE&&process.env.ISOLATION_CHECK_ENGINE!==engine)continue;
 const context=await type.launchPersistentContext(`.artifacts/isolation-order-profiles/${crypto.randomUUID()}`,{headless:true,acceptDownloads:true});
 try{
  await context.addInitScript(()=>{window.__stats=[];window.Worker=new Proxy(Worker,{construct(target,args){const worker=Reflect.construct(target,args);worker.addEventListener('message',({data})=>{if(data.stats)window.__stats.push(data.stats);});return worker;}});});
  const page=context.pages()[0]??await context.newPage();await page.reload();page.setDefaultTimeout(120000);const errors=[];page.on('pageerror',error=>errors.push(error.message));
  for(const isolationFirst of [false,true]){
   if(process.env.ISOLATION_ORDER_CASE&&process.env.ISOLATION_ORDER_CASE!==(isolationFirst?'before':'after'))continue;
   await page.goto(process.env.APP_URL??'http://127.0.0.1:4174/audio-toolkit-v1/');
   await page.getByLabel('Choose audio or video files').setInputFiles('tests/fixtures/tone.wav');await page.locator('[data-inspection=ready]').waitFor();await page.getByRole('combobox',{name:'Format',exact:true}).selectOption('wav');
   const steps=isolationFirst?['isolation','channels','resample','trim','normalize']:['channels','resample','trim','isolation','normalize'];
   for(const kind of steps){
    await page.getByLabel('Add step',{exact:true}).selectOption(kind);
    if(kind==='channels')await page.getByRole('radio',{name:'Mono',exact:true}).check();
    if(kind==='resample')await page.getByRole('combobox',{name:'Sample rate',exact:true}).selectOption('16000');
    if(kind==='trim'){await page.getByLabel('Batch trim start (seconds)').fill('.25');await page.getByLabel('Batch trim end (seconds)').fill('.75');}
    if(kind==='isolation')await page.getByRole('combobox',{name:'Keep',exact:true}).selectOption(isolationFirst?'music':'voice');
    if(kind==='normalize')await page.getByLabel('Peak target (dBFS) precise',{exact:true}).fill('-6');
   }
   await page.getByRole('button',{name:'Export',exact:true}).click();const link=page.getByRole('link',{name:'Download',exact:true});await link.waitFor();const pending=page.waitForEvent('download');await link.click();const output=await pending,path=`${root}/${engine}-${isolationFirst?'after':'before'}.wav`;await output.saveAs(path);
   const info=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-of','json',path],{encoding:'utf8'})).streams[0];const bytes=execFileSync('ffmpeg',['-v','error','-i',path,'-f','f32le','-']);const samples=new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
   assert.equal(Number(info.sample_rate),16000);assert.equal(info.channels,1);assert.equal(samples.length,8000);assert(samples.every(Number.isFinite));
   const stats=await page.evaluate(()=>window.__stats.at(-1));assert.equal(stats.decodePasses,1);assert.equal(stats.terminalEncoders,1);assert.equal(stats.isolationPasses,1);assert.equal(stats.normalizationPasses,1);assert.equal(stats.isolationWindows,1);assert.equal(stats.encodedFrames,8000);
   await page.getByRole('button',{name:'Remove tone.wav',exact:true}).click();await page.waitForFunction(async()=>{const directory=await(await navigator.storage.getDirectory()).getDirectoryHandle('audio-toolkit-v1');for await(const file of directory.values())return false;return true;});
   records.push({engine,isolationFirst,rate:16000,channels:1,frames:samples.length,stats,ownedStoresAfterRemoval:0});await writeFile(`${root}/results.json`,JSON.stringify(records,null,2)+'\n');console.log(engine,isolationFirst?'isolation before transforms':'isolation after transforms','passed');
  }
  assert.deepEqual(errors,[]);
 }finally{await context.close();}
}
