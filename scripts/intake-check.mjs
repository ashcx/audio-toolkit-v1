import {setAppearance} from './browser-controls.mjs';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
const appUrl=process.env.APP_URL??'http://127.0.0.1:4173/audio-toolkit-v1/';
const root=process.env.INTAKE_EVIDENCE_DIR??'.artifacts/intake-check';await mkdir(`${root}/captures`,{recursive:true});
const manifest=JSON.parse(await readFile('tests/fixtures/manifest.json','utf8'));
const records=[];
for(const [name,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch();
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
   window.__decodeCalls=0;
   for(const key of ['AudioDecoder','VideoDecoder','AudioContext','OfflineAudioContext']){
    const original=window[key];if(original)window[key]=new Proxy(original,{construct(target,args){window.__decodeCalls++;return Reflect.construct(target,args);}});
   }
  });
  await page.goto(appUrl);
  const names=[...manifest.fixtures.map(x=>x.name),'corrupt.wav'];
  await page.getByLabel('Choose audio or video files').setInputFiles(names.map(file=>`tests/fixtures/${file}`));
  await page.waitForFunction(count=>document.querySelectorAll('.file-list li').length===count&&[...document.querySelectorAll('.file-list li')].every(row=>['ready','failed'].includes(row.dataset.inspection)),names.length);
  const rows=await page.locator('.file-list li').evaluateAll(elements=>elements.map(row=>({id:row.dataset.fileId,status:row.dataset.inspection,name:row.querySelector('.file-name').firstChild.textContent.trim(),text:row.textContent})));
  assert.equal(new Set(rows.map(row=>row.id)).size,names.length,'Each entry has stable unique identity');
  for(const fixture of manifest.fixtures){
   const row=rows.find(row=>row.name===fixture.name);
   const audio=fixture.reference.streams.find(stream=>stream.codec_type==='audio');
   if(!audio){assert.equal(row.status,'failed');assert.match(row.text,/No audio track/);continue;}
   if(audio.codec_name==='wmav2'){assert.equal(row.status,'failed');assert.match(row.text,/Unsupported audio codec/);continue;}
   assert.equal(row.status,'ready',`${name} ${fixture.name}: ${row.text}`);
   assert(!/kHz|Stereo|Mono/.test(row.text),`${fixture.name} compact row hides technical metadata`);
  }
  assert.equal(rows.find(row=>row.name==='corrupt.wav').status,'failed');
  assert.equal(rows.find(row=>row.name==='misnamed.mp3').status,'ready','Content detection still accepts the misleading extension');
  assert.match(rows.find(row=>row.name==='long-video.webm').text,/0:02/,'Video length does not replace primary audio duration');
  assert.match(rows.find(row=>row.name==='offset.mp4').text,/0:02/,'Positive media timestamps are not mistaken for duration');
  assert.match(rows.find(row=>row.name==='tone.m4a').text,/0:02/,'Duration display avoids floating-point truncation');
  assert.match(rows.find(row=>row.name==='tone.aac').text,/Duration unknown/,'Unavailable metadata is distinct from invalid media');
  const originalIds=new Set(rows.map(row=>row.id));
  const base64=(await readFile('tests/fixtures/tone.wav')).toString('base64');
  const transfer=await page.evaluateHandle(base64=>{const data=new DataTransfer();const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));data.items.add(new File([bytes],'duplicate.wav',{type:'audio/wav'}));data.items.add(new File([bytes],'duplicate.wav',{type:'audio/wav'}));return data;},base64);
  await page.locator('.dropzone').dispatchEvent('drop',{dataTransfer:transfer});
  await transfer.dispose();
  await page.waitForFunction(count=>document.querySelectorAll('.file-list li').length===count,names.length+2);
  const withDuplicates=await page.locator('.file-list li').evaluateAll(elements=>elements.map(row=>row.dataset.fileId));
  assert.equal(new Set(withDuplicates).size,names.length+2);
  assert([...originalIds].every(id=>withDuplicates.includes(id)),'Adding files preserves existing identity');
  await page.getByRole('button',{name:'Remove duplicate.wav',exact:true}).last().click();
  await page.waitForFunction(count=>document.querySelectorAll('.file-list li').length===count,names.length+1);
  await page.screenshot({path:`${root}/captures/${name}-desktop.png`,fullPage:true,animations:'disabled'});
  await page.setViewportSize({width:390,height:844});await setAppearance(page,'dark');
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`${root}/captures/${name}-mobile-dark.png`,fullPage:true,animations:'disabled'});
  await page.evaluate(()=>{
    window.__maxReading=0;
    window.__readingObserver=new MutationObserver(()=>{window.__maxReading=Math.max(window.__maxReading,document.querySelectorAll('[data-inspection=reading]').length);});
    window.__readingObserver.observe(document.querySelector('.file-list'),{subtree:true,attributes:true,childList:true});
  });
  const payload=await readFile('tests/fixtures/tone.wav');
  await page.getByLabel('Choose audio or video files').setInputFiles(Array.from({length:40},(_,i)=>({name:`stress-${i}.wav`,mimeType:'audio/wav',buffer:payload})));
  await setAppearance(page,'light');
  for(let i=0;i<5;i++)await page.getByRole('button',{name:`Remove stress-${i}.wav`,exact:true}).click();
  await page.waitForFunction(count=>document.querySelectorAll('.file-list li').length===count&&[...document.querySelectorAll('.file-list li')].every(row=>['ready','failed'].includes(row.dataset.inspection)),names.length+36);
  const peakReading=await page.evaluate(()=>{window.__readingObserver.disconnect();return window.__maxReading;});
  assert(peakReading<=2,'Inspection queue is bounded to two active rows');
  assert.equal(await page.getByRole('button',{name:'Remove stress-0.wav',exact:true}).count(),0,'Removed queued/active input never returns');
  assert.equal(await page.evaluate(()=>window.__decodeCalls),0,'Inspection never constructs a decoder/audio context');
  assert.deepEqual(errors,[]);
  const touchContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const touchPage=await touchContext.newPage();await touchPage.goto(appUrl);
  const chooser=touchPage.waitForEvent('filechooser');await touchPage.locator('.dropzone').tap();await (await chooser).setFiles('tests/fixtures/tone.wav');
  await touchPage.getByRole('button',{name:'Remove tone.wav',exact:true}).waitFor();
  await touchPage.getByRole('button',{name:'Remove tone.wav',exact:true}).tap();
  await touchPage.waitForFunction(()=>document.querySelectorAll('.file-list li').length===0);
  await touchContext.close();
  records.push({browser:name,touchAddAndRemove:true,rows,duplicateIdentityAndRemoval:true,appendAndDrop:true,stressFiles:40,removedDuringInspection:5,peakReading,decoderConstructions:0,mobileOverflow:false,errors});
 }finally{await browser.close();}
}
await writeFile(`${root}/intake-check.json`,JSON.stringify(records,null,2)+'\n');
console.log('PASS: all required audio/video input targets inspected on Chromium/WebKit; corrupt/no-audio isolated; wrong extensions detected by content; append/drop/duplicates stable; no decoder/audio-context construction; mobile layout passed.');
