import {setSlider,recipeAction} from './browser-controls.mjs';
import {setAppearance} from './browser-controls.mjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {chromium,webkit} from 'playwright';
import {Input,FilePathSource,ALL_FORMATS,EncodedPacketSink} from 'mediabunny';
const appUrl=process.env.APP_URL??'http://127.0.0.1:4173/audio-toolkit-v1/';
const root=process.env.COPY_EVIDENCE_DIR??'.artifacts/copy-check';await mkdir(`${root}/captures`,{recursive:true});
const files=['tone.m4a','tone.mp3','tone.opus','tone.ogg','tone.flac','tone.wav','tone.aac','video.mp4','video.mov','video.mkv','video.webm','offset.mp4','long-video.webm','laced-opus.mka'];
async function packets(path){
 const input=new Input({source:new FilePathSource(path),formats:ALL_FORMATS});
 try{
  const audio=await input.getPrimaryAudioTrack();assert(audio);const config=await audio.getDecoderConfig();assert(config);
  const hash=createHash('sha256');let count=0,bytes=0,first=null,last=0;const sizes=[];
  for await(const packet of new EncodedPacketSink(audio).packets()){
   let data=packet.data;
   if(config.codec.startsWith('mp4a.')&&data.length>=7&&data[0]===255&&(data[1]&246)===240){
    const length=((data[3]&3)<<11)|(data[4]<<3)|(data[5]>>5);
    if(length===data.length)data=data.subarray((data[1]&1)?7:9);
   }
   hash.update(data);count++;bytes+=data.length;sizes.push(data.length);first??=packet.timestamp;last=Math.max(last,packet.timestamp+packet.duration);
  }
  const description=config.description?Buffer.from(config.description instanceof ArrayBuffer?config.description:config.description.buffer,config.description.byteOffset??0,config.description.byteLength).toString('hex'):null;
  return {count,bytes,digest:hash.digest('hex'),sizes,first,last,config:{codec:config.codec,sampleRate:config.sampleRate,channels:config.numberOfChannels,description},video:!!await input.getPrimaryVideoTrack()};
 }finally{input.dispose();}
}
function decodingConfig(config){
 const description=config.description===null?null:Buffer.from(config.description,'hex');
 if(config.codec.startsWith('mp4a.40.')){
  const objectType=Number(config.codec.split('.').at(-1));
  if(description){
   assert.equal(description[0]>>3,objectType);
   const rates=[96000,88200,64000,48000,44100,32000,24000,22050,16000,12000,11025,8000,7350];
   assert.equal(rates[((description[0]&7)<<1)|(description[1]>>7)],config.sampleRate);
   assert.equal((description[1]>>3)&15,config.channels);
  }
  return {...config,description:`AAC object type ${objectType}, ${config.sampleRate} Hz, ${config.channels} channels`};
 }
 if(config.codec==='flac'&&description){
  return {...config,description:createHash('sha256').update(description.subarray(0,26)).digest('hex')};
 }
 if(config.codec==='vorbis'&&description){
  assert.equal(description[0],2);let offset=1;const sizes=[];
  for(let header=0;header<2;header++){let size=0,byte;do{byte=description[offset++];size+=byte;}while(byte===255);sizes.push(size);}
  const identification=description.subarray(offset,offset+sizes[0]);
  const setup=description.subarray(offset+sizes[0]+sizes[1]);
  return {...config,description:createHash('sha256').update(identification).update(setup).digest('hex')};
 }
 return {...config,description:description&&createHash('sha256').update(description).digest('hex')};
}
const records=[];
const runId=randomUUID();
for(const [name,type] of [['chromium',chromium],['webkit',webkit]]){
 const context=await type.launchPersistentContext(`.artifacts/copy-profiles/${runId}/${name}`,{headless:true,acceptDownloads:true,hasTouch:true,viewport:{width:1440,height:1000}});
 try{
  const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const requests=[];page.on('request',request=>requests.push(request.url()));
  await page.addInitScript(()=>{
   window.__codecCalls=0;window.__maxWrite=0;
   for(const key of ['AudioDecoder','VideoDecoder','AudioEncoder','VideoEncoder','AudioContext','OfflineAudioContext']){
    const original=window[key];if(original)window[key]=new Proxy(original,{construct(target,args){window.__codecCalls++;return Reflect.construct(target,args);}});
   }
   const getDirectory=navigator.storage?.getDirectory?.bind(navigator.storage);
   if(getDirectory)navigator.storage.getDirectory=async()=>{
    if(window.__storageFails)throw new DOMException('Unavailable','UnknownError');
    return getDirectory();
   };
   const prototype=window.FileSystemFileHandle?.prototype;const original=prototype?.createWritable;
   if(original)prototype.createWritable=async function(...args){
    const writer=await original.apply(this,args),write=writer.write.bind(writer);
    writer.write=async data=>{while(window.__pauseWrites)await new Promise(resolve=>setTimeout(resolve,10));if(window.__failWrite){window.__failWrite=false;throw new DOMException('Full','QuotaExceededError');}window.__maxWrite=Math.max(window.__maxWrite,data?.data?.byteLength??data?.byteLength??0);return write(data);};return writer;
   };
  });
  await page.goto(appUrl);
  await page.getByLabel('Choose audio or video files').setInputFiles(files.map(file=>`tests/fixtures/${file}`));
  await page.waitForFunction(count=>document.querySelectorAll('li[data-inspection=ready]').length===count,files.length);
  await page.getByRole('combobox',{name:'Format',exact:true}).selectOption('original');
  assert.equal(await page.locator('[data-inspection=ready]').count(),files.length);
  await page.getByRole('button',{name:'Export',exact:true}).click();
  await page.waitForFunction(count=>document.querySelectorAll('.file-result a[download]').length===count,files.length);
  const downloads=[];
  for(let i=0;i<files.length;i++){
   const row=page.locator('.file-list>li').nth(i),link=row.getByRole('link',{name:/Download exported audio/});
   const downloadPromise=page.waitForEvent('download');await link.click();const download=await downloadPromise;
   const output=`${root}/outputs/${name}/${download.suggestedFilename()}`;await mkdir(`${root}/outputs/${name}`,{recursive:true});await download.saveAs(output);
   const before=await packets(`tests/fixtures/${files[i]}`),after=await packets(output);
   assert.equal(after.video,false,`${files[i]} output must contain no video`);
   assert.equal(after.digest,before.digest,`${files[i]} encoded payload digest`);assert.deepEqual(after.sizes,before.sizes,`${files[i]} packet boundaries`);
   assert.deepEqual(decodingConfig(after.config),decodingConfig(before.config),`${files[i]} decoding config (Vorbis identification/setup; comment vendor excluded)`);
   assert(Math.abs(after.first-(before.first-Math.max(0,before.first)))<0.0011,`${files[i]} zero-based timestamp within 1ms source container resolution`);
   const reference=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',output],{encoding:'utf8'}));
   assert.equal(reference.streams.length,1);assert.equal(reference.streams[0].codec_type,'audio');
   const expectedLength=before.last-Math.max(0,before.first);
   const duration=Number(reference.format.duration??reference.streams[0].duration);assert(Math.abs(duration-expectedLength)<.06,`${files[i]} independent duration ${duration}/${expectedLength}`);
   const decoded=execFileSync('ffmpeg',['-v','error','-i',output,'-f','null','-'],{encoding:'utf8'});assert.equal(decoded,'');
   const pcmReference=files[i]==='laced-opus.mka'?'tone.opus':files[i];
   const referencePcm=execFileSync('ffmpeg',['-v','error','-i',`tests/fixtures/${pcmReference}`,'-map','0:a:0','-f','f32le','-']);
   const resultPcm=execFileSync('ffmpeg',['-v','error','-i',output,'-map','0:a:0','-f','f32le','-']);
   const pcm={reference:pcmReference,sourceFrames:referencePcm.length/8,outputFrames:resultPcm.length/8,sourceDigest:createHash('sha256').update(referencePcm).digest('hex'),outputDigest:createHash('sha256').update(resultPcm).digest('hex')};
   assert.equal(pcm.sourceDigest,pcm.outputDigest,`${files[i]} independently decoded audio content ${pcm.sourceFrames}/${pcm.outputFrames}`);
   downloads.push({input:files[i],name:download.suggestedFilename(),size:after.bytes,packets:after.count,digest:after.digest,codec:reference.streams[0].codec_name,duration,pcm,decodingConfigEqual:true,commentMetadataRewritten:after.config.description!==before.config.description,payloadsEqual:true,video:false});
  }
  assert.equal(new Set(downloads.map(d=>d.name)).size,files.length,'Collisions get deterministic distinct names');
  const codecCalls=await page.evaluate(()=>window.__codecCalls);assert.equal(codecCalls,0);
  const maxWrite=await page.evaluate(()=>window.__maxWrite);assert(maxWrite>0&&maxWrite<=1024*1024);
  assert(!requests.some(url=>/encoders|neural|\.onnx|\.wasm/.test(url)),'Copy must not load encoders or isolation');
  await page.screenshot({path:`${root}/captures/${name}-desktop.png`,fullPage:true,animations:'disabled'});
  await page.setViewportSize({width:390,height:844});await setAppearance(page,'dark');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`${root}/captures/${name}-mobile-dark.png`,fullPage:true,animations:'disabled'});
  await page.getByLabel('Add step',{exact:true}).selectOption('gain');await setSlider(page,'Gain (dB) slider',1);
  assert.equal(await page.locator('.file-name').getByText('Gain requires re-encoding. Choose another format.',{exact:true}).count(),files.length);
  assert.equal(await page.getByText('Previous export',{exact:true}).count(),files.length,'Old outputs must be explicitly identified after edits');assert(await page.getByRole('button',{name:'Export',exact:true}).isDisabled());
  await setSlider(page,'Gain (dB) slider',0);assert(await page.getByRole('button',{name:'Export',exact:true}).isEnabled());
  const touchDownload=page.waitForEvent('download');await page.getByRole('link',{name:/Download exported audio/}).first().tap();await touchDownload;
  for(const input of files)await page.getByRole('button',{name:`Remove ${input}`,exact:true}).click();
  await (await recipeAction(page,'Remove Gain')).click();
  await page.getByLabel('Choose audio or video files').setInputFiles(['tests/fixtures/tone.wav','tests/fixtures/tone.wav']);
  await page.waitForFunction(()=>document.querySelectorAll('li[data-inspection=ready]').length===2);
  await page.evaluate(()=>{window.__storageFails=true;});
  await page.getByRole('button',{name:'Export',exact:true}).tap();
  await page.waitForFunction(()=>document.querySelectorAll('.file-result').length===2&&[...document.querySelectorAll('.file-result')].every(e=>e.textContent.includes('Temporary storage is unavailable.')));
  await page.evaluate(()=>{window.__storageFails=false;window.__failWrite=true;});
  await page.getByRole('button',{name:'Export',exact:true}).focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelectorAll('.file-result a[download]').length===1&&[...document.querySelectorAll('.file-result')].some(e=>e.textContent.includes('Not enough device storage')));
  await page.getByRole('button',{name:'Export',exact:true}).tap();
  await page.waitForFunction(()=>document.querySelectorAll('.file-result a[download]').length===2);
  const retryEntries=await page.evaluate(async()=>{const root=await navigator.storage.getDirectory();const dir=await root.getDirectoryHandle('audio-toolkit-v1');const entries=[];for await(const name of dir.keys())entries.push(name);return entries.length;});assert.equal(retryEntries,2,'Retries replace retained output and discard failed partials');
  await page.evaluate(()=>{window.__pauseWrites=true;});
  await page.getByRole('button',{name:'Export',exact:true}).tap();
  await page.waitForFunction(()=>[...document.querySelectorAll('.file-result')].some(e=>e.textContent.includes('Extracting…')));
  assert.equal(await page.getByLabel('Add step',{exact:true}).isDisabled(),true,'Recipe edits are locked during the run');
  await page.evaluate(()=>{window.__pauseWrites=false;});
  await page.waitForFunction(()=>document.querySelectorAll('.file-result a[download]').length===2);
  await page.getByLabel('Add step',{exact:true}).selectOption('gain');await setSlider(page,'Gain (dB) slider',1);
  assert.equal(await page.getByText('Previous export',{exact:true}).count(),2,'Later edits do not relabel old snapshots as current');
  await (await recipeAction(page,'Remove Gain')).click();assert.equal(await page.getByText('Previous export',{exact:true}).count(),0);
  await page.getByRole('button',{name:'Remove tone.wav',exact:true}).first().tap();await page.getByRole('button',{name:'Remove tone.wav',exact:true}).tap();
  const remaining=await page.evaluate(async()=>{const root=await navigator.storage.getDirectory();const dir=await root.getDirectoryHandle('audio-toolkit-v1');for(let i=0;i<50;i++){const entries=[];for await(const name of dir.keys())entries.push(name);if(!entries.length)return entries;await new Promise(resolve=>setTimeout(resolve,20));}return [...await Array.fromAsync(dir.keys())];});
  assert.deepEqual(remaining,[],'Removed outputs leave no owned OPFS entries');assert.deepEqual(errors,[]);
  records.push({browser:name,persistentContext:true,files:downloads,codecCalls,maxWrite,cleanup:true,originalRejectsSignalChanges:true,touchDownloadAndExport:true,storageFailureRecovery:true,quotaFailureIsolation:true,retryReplacesOutputs:true,lockedRunAndSnapshotLabel:true,errors});
 }finally{await context.close();}
}
await writeFile(`${root}/copy-check.json`,JSON.stringify(records,null,2)+'\n');console.log('PASS: all copy paths preserve encoded packets/config; FFmpeg reads audio-only outputs; zero codec constructions, bounded writes, distinct names and OPFS cleanup in Chromium/WebKit.');
