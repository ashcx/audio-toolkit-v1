import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {chromium} from 'playwright';

const outputs=`.artifacts/opus-resample/${randomUUID()}`;
const port=Number(process.env.OPUS_CHECK_PORT??4179);
const appUrl=process.env.APP_URL??`http://127.0.0.1:${port}/audio-toolkit-v1/`;
const seconds=2,pitch=440;
await mkdir(outputs,{recursive:true});

function wav(rate){
 const frames=rate*seconds,bytes=Buffer.alloc(44+frames*4);
 bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(2,22);bytes.writeUInt32LE(rate,24);bytes.writeUInt32LE(rate*4,28);bytes.writeUInt16LE(4,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(frames*4,40);
 for(let i=0;i<frames;i++){const value=Math.round(0.4*Math.sin(2*Math.PI*pitch*i/rate)*32767);for(let c=0;c<2;c++)bytes.writeInt16LE(value,44+(i*2+c)*2);}
 return bytes;
}
function probe(path){
 const parsed=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',path],{encoding:'utf8'}));
 return {stream:parsed.streams[0],duration:Number(parsed.format.duration)};
}
function pitchOf(path,rate){
 const bytes=execFileSync('ffmpeg',['-v','error','-i',path,'-ac','1','-f','f32le','-'],{maxBuffer:64*1024*1024});
 const samples=new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 let crossings=0;for(let i=1;i<samples.length;i++)if(samples[i-1]<0&&samples[i]>=0)crossings++;
 return {hz:crossings/(samples.length/rate),frames:samples.length};
}

let server=null;
if(!process.env.APP_URL){
 server=spawn('npx',['vite','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
 for(let attempt=0;;attempt++){
  try{if((await fetch(appUrl)).ok)break;}catch{}
  if(attempt>100)throw Error('The preview server did not start.');
  await new Promise(resolve=>setTimeout(resolve,200));
 }
}
const browser=await chromium.launch({channel:'chrome',headless:true});
const records=[];
try{
 const context=await browser.newContext({acceptDownloads:true,viewport:{width:1440,height:1000}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 for(const rate of [44100,22050,32000,96000]){
  const source=`${outputs}/source-${rate}.wav`;
  await writeFile(source,wav(rate));
  await page.goto(appUrl);
  await page.getByLabel('Choose audio or video files').setInputFiles(source);
  await page.locator('[data-inspection=ready]').waitFor();
  await page.getByRole('combobox',{name:'Format',exact:true}).selectOption('opus');
  assert(await page.getByRole('button',{name:'Export',exact:true}).isEnabled(),`${rate} Hz can be exported without a sample rate step`);
  await page.getByRole('button',{name:'Export',exact:true}).click();
  await page.locator('[data-job-state=done]').waitFor({timeout:60000});
  const link=page.locator('[data-job-state=done] a[download]');
  const pending=page.waitForEvent('download');await link.click();
  const download=await pending;assert(download.suggestedFilename().endsWith('.ogg'));
  const output=`${outputs}/result-${rate}.ogg`;await download.saveAs(output);
  const {stream,duration}=probe(output);
  assert.equal(stream.codec_name,'opus');
  assert.equal(Number(stream.sample_rate),48000,`${rate} Hz source decodes at 48000 Hz`);
  assert(Math.abs(duration-seconds)<=0.05,`${rate} Hz duration ${duration} against ${seconds}`);
  const decoded=pitchOf(output,48000);
  assert(Math.abs(decoded.hz-pitch)<=3,`${rate} Hz pitch ${decoded.hz}`);
  records.push({sourceRate:rate,codec:stream.codec_name,outputRate:Number(stream.sample_rate),duration,decodedFrames:decoded.frames,pitchHz:decoded.hz});
  console.log(rate,'->',stream.sample_rate,'Hz',duration.toFixed(4),'s',decoded.hz.toFixed(1),'Hz tone');
 }
 assert.deepEqual(errors,[]);
}finally{
 await browser.close();
 server?.kill();
}
await writeFile(`${outputs}/results.json`,JSON.stringify(records,null,2)+'\n');
console.log(`Opus resample check passed. Results in ${outputs}/results.json`);
