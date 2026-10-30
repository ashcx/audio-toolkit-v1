import {chromium,webkit} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
const root=process.env.FORMAT_PROBE_DIR??'.artifacts/format-probe';await mkdir(root,{recursive:true});
const appUrl=process.env.APP_URL??'http://127.0.0.1:4174/audio-toolkit-v1/';
const records=[];
for(const [name,type] of [['chromium',chromium],['webkit',webkit]]){
 if(process.env.FORMAT_PROBE_ENGINE&&process.env.FORMAT_PROBE_ENGINE!==name)continue;
 const context=await type.launchPersistentContext(`.artifacts/format-profiles/${randomUUID()}`,{headless:true,acceptDownloads:true});
 try{
  const page=await context.newPage();
  await page.addInitScript(()=>{window.__stats=[];const Original=window.Worker;window.Worker=new Proxy(Original,{construct(target,args){const worker=Reflect.construct(target,args);worker.addEventListener('message',event=>{if(event.data.kind==='done')window.__stats.push(event.data.stats);});return worker;}});});
  for(const format of (process.env.FORMAT_PROBE_FORMATS??'mp3,m4a,wav,flac,opus').split(',')){
   try {
   await page.goto(appUrl);await page.getByLabel('Choose audio or video files').setInputFiles('tests/fixtures/tone.wav');await page.locator('[data-inspection=ready]').waitFor();
   await page.getByRole('combobox',{name:'Format',exact:true}).selectOption(format);await page.getByLabel('Add step',{exact:true}).selectOption('gain');await page.getByLabel('Gain (dB) precise',{exact:true}).fill('-6');if(process.env.FORMAT_PROBE_RATE){await page.getByLabel('Add step',{exact:true}).selectOption('resample');await page.getByRole('combobox',{name:'Sample rate',exact:true}).selectOption(process.env.FORMAT_PROBE_RATE);}await page.getByRole('button',{name:'Export',exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('.file-result a[download]')||!!document.querySelector('.file-result')&&!document.querySelector('.file-result').textContent.includes('Processing…'),null,{timeout:10000});
   const link=page.getByRole('link',{name:'Download',exact:true});
   if(await link.count()){
    const pending=page.waitForEvent('download');await link.click();const download=await pending;const path=`${root}/${name}-${download.suggestedFilename()}`;await download.saveAs(path);
    const reference=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',path],{encoding:'utf8'}));
    const bytes=execFileSync('ffmpeg',['-v','error','-i',path,'-f','f32le','-']);const samples=new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
    records.push({browser:name,format,file:path,reference,frames:samples.length/reference.streams[0].channels,head:Array.from(samples.slice(0,8)),stats:await page.evaluate(()=>window.__stats.at(-1))});
   }else records.push({browser:name,format,error:await page.locator('.file-result').innerText()});
   }catch(error){records.push({browser:name,format,error:String(error)});}
   await writeFile(`${root}/results.json`,JSON.stringify(records,null,2)+'\n');
   console.log(name,format,JSON.stringify(records.at(-1).stats??records.at(-1).error));
   await page.getByRole('button',{name:'Remove tone.wav',exact:true}).click();
  }
 }finally{await context.close();}
}
await writeFile(`${root}/results.json`,JSON.stringify(records,null,2)+'\n');
