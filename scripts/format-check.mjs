import {setSlider} from './browser-controls.mjs';
import {setAppearance} from './browser-controls.mjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {chromium,webkit} from 'playwright';

const root=process.env.FORMAT_EVIDENCE_DIR??'.artifacts/format-check';
const outputs=`.artifacts/format-outputs/${randomUUID()}`;
const appUrl=process.env.APP_URL??'http://127.0.0.1:4174/audio-toolkit-v1/';
await mkdir(`${root}/captures`,{recursive:true});await mkdir(outputs,{recursive:true});
function makeSignal(frames){
 const bytes=Buffer.alloc(44+frames*4);bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(2,22);bytes.writeUInt32LE(48000,24);bytes.writeUInt32LE(192000,28);bytes.writeUInt16LE(4,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(frames*4,40);
 for(let i=0;i<frames;i++)for(let c=0;c<2;c++){
  const t=(i%48000)/48000,phase=2*Math.PI*((c?700:300)*t+700*t*t);
  const value=(i<48?0:.35*Math.sin(phase))+(i>=frames-37?.15:0);
  bytes.writeInt16LE(Math.round(value*32767),44+(i*2+c)*2);
 }
 return bytes;
}
const shortPath=`${outputs}/reference.wav`,longPath=`${outputs}/long.wav`,tinyPath=`${outputs}/tiny.wav`;
const shortFrames=48037,longFrames=48000*30+37,tinyFrames=481;
await writeFile(shortPath,makeSignal(shortFrames));await writeFile(longPath,makeSignal(longFrames));
await writeFile(tinyPath,makeSignal(tinyFrames));
const descriptors={mp3:['mp3','audio/mpeg','mp3'],m4a:['m4a','audio/mp4','aac'],wav:['wav','audio/wav','pcm_s16le'],flac:['flac','audio/flac','flac'],opus:['ogg','audio/ogg','opus']};
function decode(path,filter){
 const bytes=execFileSync('ffmpeg',['-v','error',...(path.endsWith('.wav')?['-f','wav']:[]),'-i',path,...(filter?['-af',filter]:[]),'-f','f32le','-'],{maxBuffer:128*1024*1024});
 return new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
}
const records=[];
for(const [engine,type]of[['chromium',chromium],['webkit',webkit]]){
 if(process.env.FORMAT_CHECK_ENGINE&&process.env.FORMAT_CHECK_ENGINE!==engine)continue;
 const context=await type.launchPersistentContext(`.artifacts/format-check-profiles/${randomUUID()}`,{channel:engine==='chromium'?'chrome':undefined,headless:true,acceptDownloads:true,hasTouch:true,viewport:{width:1440,height:1000}});
 try{
  const page=await context.newPage(),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await page.addInitScript(()=>{
   window.__stats=[];window.__maxWrite=0;const Original=window.Worker;
   window.Worker=new Proxy(Original,{construct(target,args){const worker=Reflect.construct(target,args);worker.addEventListener('message',event=>{if(event.data.kind==='done')window.__stats.push(event.data.stats);});return worker;}});
   const prototype=window.FileSystemFileHandle?.prototype,original=prototype?.createWritable;
   if(original)prototype.createWritable=async function(...args){const writer=await original.apply(this,args),write=writer.write.bind(writer),truncate=writer.truncate.bind(writer);writer.write=async data=>{window.__maxWrite=Math.max(window.__maxWrite,data?.data?.byteLength??data?.byteLength??0);return write(data);};writer.truncate=async length=>{if(window.__failTruncate){window.__failTruncate=false;throw new DOMException('Full','QuotaExceededError');}return truncate(length);};return writer;};
  });
  async function setup({format,bitrate=128,rate=48000,channels=2,path=shortPath,mode='cbr'}){
   await page.goto(appUrl);await page.getByLabel('Choose audio or video files').setInputFiles(path);await page.locator('[data-inspection=ready]').waitFor();
   await page.getByRole('combobox',{name:'Format',exact:true}).selectOption(format);
   if(format==='opus'){
    if(mode==='vbr'){
     await page.getByRole('combobox',{name:'Encoding mode',exact:true}).selectOption('vbr');
     await page.getByRole('combobox',{name:'Target bitrate (kbps)',exact:true}).selectOption(String(bitrate));
    }else await page.getByRole('combobox',{name:'Bitrate (kbps)',exact:true}).selectOption(String(bitrate));
   }else if(format==='mp3')await page.getByRole('combobox',{name:'Bitrate (kbps)',exact:true}).selectOption(String(bitrate));
   else if(format==='m4a')await page.getByRole('combobox',{name:'Target bitrate (kbps)',exact:true}).selectOption(String(bitrate));
   await page.getByLabel('Add step',{exact:true}).selectOption('gain');await setSlider(page,'Gain (dB) slider',-6);
   if(channels===1){await page.getByLabel('Add step',{exact:true}).selectOption('channels');await page.getByRole('radio',{name:'Mono',exact:true}).check();}
   if(rate!==48000){await page.getByLabel('Add step',{exact:true}).selectOption('resample');await page.getByRole('combobox',{name:'Sample rate',exact:true}).selectOption(String(rate));}
  }
  async function countStores(){return page.evaluate(async()=>{const directory=await(await navigator.storage.getDirectory()).getDirectoryHandle('audio-toolkit-v1',{create:true});let n=0;for await(const f of directory.values())n++;return n;});}
  async function run(test){
   const {format,bitrate=128,rate=48000,channels=2,path=shortPath,mode='cbr'}=test;
   if(process.env.FORMAT_CHECK_FORMAT&&process.env.FORMAT_CHECK_FORMAT!==format)return;
   await setup(test);
   const button=page.getByRole('button',{name:'Export',exact:true});await button.focus();await page.keyboard.press('Enter');
   const link=page.getByRole('link',{name:/Download exported audio/});await link.waitFor({timeout:60000});
   assert.equal(await page.getByText('Previous export',{exact:true}).count(),0);
   const descriptor=descriptors[format];assert.equal(await link.evaluate(async e=>(await fetch(e.href)).headers.get('content-type')),descriptor[1]);
   const pending=page.waitForEvent('download');await link.tap();const download=await pending;
   assert(download.suggestedFilename().endsWith(`.${descriptor[0]}`));
   const label=`${engine}-${records.length}-${format}-${bitrate}-${rate}-${channels}-${mode}`;
   const output=`${outputs}/${label}.${descriptor[0]}`;await download.saveAs(output);
   const stream=JSON.parse(execFileSync('ffprobe',['-v','error',...(output.endsWith('.wav')?['-f','wav']:[]),'-show_streams','-of','json',output],{encoding:'utf8'})).streams[0];
   assert.equal(stream.codec_name,descriptor[2]);if(format==='m4a')assert.equal(stream.profile,'LC');if(format==='mp3')assert.equal(Number(stream.bit_rate),bitrate*1000);assert.equal(stream.channels,channels);assert.equal(Number(stream.sample_rate),format==='opus'?48000:rate);
   if(format==='flac')assert.equal(Number(stream.bits_per_raw_sample),24);
   await page.waitForFunction(()=>window.__stats.some(entry=>entry&&entry.terminalEncoders===1),null,{timeout:60000});const stats=await page.evaluate(()=>window.__stats.findLast(entry=>entry&&entry.terminalEncoders===1));assert.equal(stats.decodePasses,1);assert.equal(stats.terminalEncoders,1);assert(stats.maxBlockFrames<=4096);
   if(format==='m4a')assert(['native','wasm'].includes(stats.encoder),`AAC backend ${stats.encoder}`);else assert.equal(stats.encoder,format==='wav'?'pcm':['mp3','flac'].includes(format)?'wasm':format==='opus'?'native':'wasm');
   const samples=decode(output),decodedFrames=samples.length/channels;
   const targetRate=format==='opus'?48000:rate;
   const reference=decode(path,`volume=-6dB,${channels===1?'pan=mono|c0=0.5*c0+0.5*c1,':''}${format==='opus'&&rate!==48000?`aresample=${rate},`:''}aresample=${targetRate}`);
   const sourceFrames=path===longPath?longFrames:path===tinyPath?tinyFrames:path===shortPath?shortFrames:96000;
   const inputFrames=Math.round(sourceFrames*rate/48000);
   const expected=format==='opus'?Math.round(inputFrames*48000/rate):inputFrames;
   if(format==='m4a')assert(decodedFrames>=expected&&decodedFrames<expected+2048,`AAC flush ${decodedFrames}/${expected}`);
   else assert.equal(decodedFrames,expected,`${label} frames`);
   assert(samples.every(Number.isFinite));
   let sum=0,maxError=0;
   const length=Math.min(reference.length,expected*channels);
   for(let i=0;i<length;i++){const error=samples[i]-reference[i];sum+=error*error;maxError=Math.max(maxError,Math.abs(error));}
   const rmse=Math.sqrt(sum/length);
   if(rate===48000&&format==='wav')assert(maxError<1/32768+1e-7,`PCM16 ${maxError}`);
   else if(rate===48000&&format==='flac')assert(maxError<1/8388608+1e-7,`FLAC24 ${maxError}`);
   else assert(rmse<.035,`${label} waveform ${rmse}`);
   const tailStart=Math.max(0,(expected-Math.round(targetRate*.02))*channels);
   let sourceEnergy=0,outputEnergy=0;
   for(let i=tailStart;i<expected*channels;i++){sourceEnergy+=reference[i]**2;outputEnergy+=samples[i]**2;}
   const tailRatio=sourceEnergy===0?1:Math.sqrt(outputEnergy/sourceEnergy);assert(tailRatio>.6&&tailRatio<1.4,`${label} tail ${tailRatio}`);
   if(sourceEnergy===0)assert(outputEnergy<1e-10);
   assert.equal(await countStores(),1);
   const maxWrite=await page.evaluate(()=>window.__maxWrite);assert(maxWrite<=1024*1024);
   records.push({engine,label,...test,sourceFrames,encodedFrames:stats.encodedFrames,decodedFrames,outputRate:Number(stream.sample_rate),channels,mime:descriptor[1],extension:descriptor[0],bits:Number(stream.bits_per_raw_sample)||null,streamBitrate:Number(stream.bit_rate)||null,rmse,maxError,tailRatio,maxWrite,stats});
   await writeFile(`${root}/results.json`,JSON.stringify(records,null,2)+'\n');console.log(engine,format,bitrate,rate,channels,decodedFrames,rmse);
   await page.getByRole('button',{name:`Remove ${path===longPath?'long.wav':path===tinyPath?'tiny.wav':path===shortPath?'reference.wav':'video.mp4'}`,exact:true}).tap();
   await page.waitForFunction(async()=>{const d=await(await navigator.storage.getDirectory()).getDirectoryHandle('audio-toolkit-v1');for await(const f of d.values())return false;return true;});
  }
  const formats=[['mp3',[128,192,256,320]],['m4a',[128,192,256]],['wav',[128]],['flac',[128]],['opus',[64,96,128,160,192]]];
  if(process.env.FORMAT_FULL_GRID){
   for(const [format,bitrates]of formats)for(const rate of [48000,44100,32000,24000,16000])for(const channels of [1,2])for(const bitrate of bitrates){
    if(format==='opus'&&[44100,32000].includes(rate))continue;
    if(format==='mp3'&&rate<32000&&bitrate>160)continue;
    if(format==='m4a'&&bitrate*1000>6*rate*channels)continue;
    await run({format,rate,channels,bitrate});
   }
  }else{
   for(const [format,bitrates]of formats)for(const bitrate of bitrates)await run({format,bitrate});
   for(const format of ['mp3','m4a','wav','flac','opus'])for(const rate of [44100,32000,24000,16000]){
    if(format==='opus'&&[44100,32000].includes(rate))continue;
    await run({format,rate});
   }
   for(const format of ['mp3','m4a','wav','flac','opus'])await run({format,channels:1});
  }
  for(const format of ['mp3','m4a','wav','flac','opus'])await run({format,path:longPath});
  for(const format of ['mp3','m4a','wav','flac','opus'])await run({format,path:tinyPath});
  await run({format:'opus',bitrate:128,mode:'vbr'});
  await run({format:'mp3',path:'tests/fixtures/video.mp4'});
  await setup({format:'opus'});await page.evaluate(()=>window.__failTruncate=true);await page.getByRole('button',{name:'Export',exact:true}).click();
  await page.getByText('Not enough device storage for this output.',{exact:true}).waitFor();assert.equal(await countStores(),0);
  assert.equal(await page.getByRole('link',{name:/Download exported audio/}).count(),0);await page.getByRole('button',{name:'Export',exact:true}).click();await page.getByRole('link',{name:/Download exported audio/}).waitFor();
  await page.getByRole('button',{name:'Remove reference.wav',exact:true}).click();
  await page.waitForFunction(async()=>{const d=await(await navigator.storage.getDirectory()).getDirectoryHandle('audio-toolkit-v1');for await(const f of d.values())return false;return true;});
  await setup({format:'opus',rate:44100});await page.getByText('Opus needs 16, 24 or 48 kHz. Add a sample rate step.',{exact:true}).waitFor();assert(await page.getByRole('button',{name:'Export',exact:true}).isDisabled());
  await page.getByRole('combobox',{name:'Sample rate',exact:true}).selectOption('48000');assert(await page.getByRole('button',{name:'Export',exact:true}).isEnabled());
  await page.getByRole('button',{name:'Remove reference.wav',exact:true}).click();
  await setup({format:'mp3',bitrate:320,rate:16000});await page.getByText('At this sample rate, choose MP3 at 128 kbps or increase the sample rate.',{exact:true}).waitFor();assert(await page.getByRole('button',{name:'Export',exact:true}).isDisabled());
  await page.getByRole('combobox',{name:'Bitrate (kbps)',exact:true}).selectOption('128');assert(await page.getByRole('button',{name:'Export',exact:true}).isEnabled());await page.getByRole('button',{name:'Remove reference.wav',exact:true}).click();
  await setup({format:'m4a',bitrate:256,rate:16000,channels:1});await page.getByText('AAC bitrate is too high for this rate and channel count. Lower the bitrate or increase the sample rate.',{exact:true}).waitFor();
  await page.screenshot({path:`${root}/captures/${engine}-desktop-error.png`,fullPage:true,animations:'disabled'});
  await page.setViewportSize({width:390,height:844});await setAppearance(page,'dark');await page.waitForFunction(()=>getComputedStyle(document.querySelector('.panel')).backgroundColor==='rgb(29, 31, 36)');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`${root}/captures/${engine}-mobile-dark-error.png`,fullPage:true,animations:'disabled'});
  assert.deepEqual(errors,[]);assert(!requests.some(url=>!url.startsWith(new URL(appUrl).origin)&&!url.startsWith('blob:')));assert(!requests.some(url=>url.includes('.onnx')));
 }finally{await context.close();}
}
console.log(`Passed ${records.length} downloaded format checks and invalid-setting recovery in both browsers.`);
