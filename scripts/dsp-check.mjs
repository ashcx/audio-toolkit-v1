import {setSlider} from './browser-controls.mjs';
import {setAppearance} from './browser-controls.mjs';
import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {chromium, webkit} from 'playwright';

const appUrl = process.env.APP_URL ?? 'http://127.0.0.1:4174/audio-toolkit-v1/';
const root = process.env.DSP_EVIDENCE_DIR ?? '.artifacts/dsp-check';
const outputs = `.artifacts/dsp-outputs/${randomUUID()}`;
await mkdir(`${root}/captures`, {recursive:true});
await mkdir(outputs, {recursive:true});
function fixture(name, seconds, channelCount = 2, silent = false, scale = 1) {
  const frames = seconds * 48000, bytes = Buffer.alloc(44 + frames * channelCount * 2);
  bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(channelCount, 22);
  bytes.writeUInt32LE(48000, 24); bytes.writeUInt32LE(48000 * channelCount * 2, 28);
  bytes.writeUInt16LE(channelCount * 2, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(bytes.length - 44, 40);
  for(let i = 0; i < frames; i++) for(let c = 0; c < channelCount; c++) {
    const amplitude = (i < frames / 2 ? .2 : .8) * scale;
    const value = silent ? 0 : amplitude * (c === 1 ? .5 : 1) * Math.sin(2 * Math.PI * (c === 1 ? 2000 : 1000) * i / 48000);
    bytes.writeInt16LE(Math.round(value * 32767), 44 + (i * channelCount + c) * 2);
  }
  return {name, mimeType:'audio/wav', buffer:bytes};
}
const signal = fixture('signal.wav', 2), silence = fixture('silence.wav', 2, 1, true);
const records = [];
function pcm(path) {
  const info = JSON.parse(execFileSync('ffprobe', ['-v','error','-show_streams','-of','json',path], {encoding:'utf8'})).streams[0];
  const bytes = execFileSync('ffmpeg', ['-v','error','-i',path,'-f','f32le','-'], {maxBuffer:128*1024*1024});
  return {rate:Number(info.sample_rate), channels:info.channels, samples:new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength))};
}
async function storeCount(page) {
  return page.evaluate(async()=>{
    const directory = await (await navigator.storage.getDirectory()).getDirectoryHandle('audio-toolkit-v1', {create:true});
    let count=0; for await(const entry of directory.values()) count++; return count;
  });
}
for(const [engine, browserType] of [['chromium',chromium], ['webkit',webkit]]) {
  const context = await browserType.launchPersistentContext(`.artifacts/dsp-profiles/${randomUUID()}/${engine}`, {headless:true, acceptDownloads:true, hasTouch:true, viewport:{width:1440,height:1000}});
  try {
    const page = await context.newPage(), errors = [], requests = [];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',request=>requests.push(request.url()));
    await page.addInitScript(()=>{
      window.__dsp = [];
      const Original = window.Worker;
      window.Worker = new Proxy(Original, {construct(target,args){
        const worker = Reflect.construct(target,args);
        worker.addEventListener('message',event=>{if(event.data.kind==='done')window.__dsp.push(event.data.stats);});
        return worker;
      }});
      const prototype = window.FileSystemFileHandle?.prototype, original = prototype?.createWritable;
      if(original)prototype.createWritable = async function(...args){
        const writer = await original.apply(this,args), write = writer.write.bind(writer);
        writer.write = async data=>{
          while(window.__pauseWrites)await new Promise(resolve=>setTimeout(resolve,10));
          if(window.__failWrite){window.__failWrite=false;throw new DOMException('Full','QuotaExceededError');}
          return write(data);
        };
        return writer;
      };
    });
    async function setup(file, steps) {
      await page.goto(appUrl);
      await page.getByLabel('Choose audio or video files').setInputFiles(file);
      await page.locator('[data-inspection=ready]').waitFor();
      await page.getByRole('combobox',{name:'Format',exact:true}).selectOption('wav');
      for(const [kind,value] of steps) {
        await page.getByLabel('Add step',{exact:true}).selectOption(kind);
        if(kind==='gain')await setSlider(page,'Gain (dB) slider',Number(value));
        if(kind==='normalize'){if(await page.getByRole('radio',{name:'Peak',exact:true}).count())await page.getByRole('radio',{name:'Peak',exact:true}).check();await setSlider(page,'Peak target (dBFS) slider',Number(value));}
        if(kind==='channels')await page.getByRole('radio',{name:value==='mono'?'Mono':value==='stereo'?'Stereo':'Unchanged',exact:true}).check();
        if(kind==='resample')await page.getByRole('combobox',{name:'Sample rate',exact:true}).selectOption(String(value));
        if(kind==='trim') {
          await page.getByLabel('Trim all start (time)').fill(String(value[0]));
          await page.getByLabel('Trim all end (time)').fill(String(value[1]));
        }
      }
    }
    async function exportFile(label) {
      await page.getByRole('button',{name:'Export',exact:true}).click();
      const link = page.getByRole('link',{name:/Download exported audio/});
      await link.waitFor({timeout:60000});
      assert.equal(await page.getByText('Previous export',{exact:true}).count(),0);
      const pending = page.waitForEvent('download'); await link.click(); const download = await pending;
      const path = `${outputs}/${engine}-${label}.wav`; await download.saveAs(path);
      const result = pcm(path); await page.waitForFunction(()=>window.__dsp.some(entry=>entry&&entry.terminalEncoders===1),null,{timeout:60000}); const stats = await page.evaluate(()=>window.__dsp.findLast(entry=>entry&&entry.terminalEncoders===1));
      assert(stats); assert.equal(stats.decodePasses,1); assert.equal(stats.terminalEncoders,1);
      assert(stats.maxBlockFrames<=4096); assert.equal(stats.encodedFrames,result.samples.length/result.channels);
      assert.equal(await storeCount(page),1,'only final output remains after checkpoints');
      records.push({engine,label,rate:result.rate,channels:result.channels,frames:stats.encodedFrames,stats});
      console.log(engine,label,stats.encodedFrames);
      return result;
    }
    async function remove(name) {
      await page.getByRole('button',{name:`Remove ${name}`,exact:true}).click();
      await assertEventually(async()=>assert.equal(await storeCount(page),0));
    }
    await writeFile(`${outputs}/signal.wav`,signal.buffer);
    const original = pcm(`${outputs}/signal.wav`);
    await setup(signal,[['trim',[.12345,.87654]],['gain',-6],['channels','mono']]);
    let output = await exportFile('trim-gain-mono');
    const start = Math.ceil(.12345*48000), end = Math.ceil(.87654*48000), factor = 10**(-6/20);
    assert.equal(output.samples.length,end-start); assert.equal(output.rate,48000);
    let maxError = 0;
    for(let i=0;i<output.samples.length;i++)maxError=Math.max(maxError,Math.abs(output.samples[i]-(original.samples[(start+i)*2]+original.samples[(start+i)*2+1])/2*factor));
    assert(maxError<1/32768,`trim/gain/channel error ${maxError}`); records.at(-1).maxError=maxError;
    await page.getByRole('button',{name:'Gain settings',exact:true}).click(); await setSlider(page,'Gain (dB) slider',-3);
    await page.getByText('Previous export',{exact:true}).waitFor();
    await page.screenshot({path:`${root}/captures/${engine}-desktop.png`,fullPage:true,animations:'disabled'});
    await page.setViewportSize({width:390,height:844}); await setAppearance(page,'dark');
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('.panel')).backgroundColor==='rgb(29, 31, 36)');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:`${root}/captures/${engine}-mobile-dark.png`,fullPage:true,animations:'disabled'});
    await remove('signal.wav');
    for(const [label,steps,expectedPeak] of [
      ['normalize-before-trim',[['normalize',-6],['trim',[0,1]]],10**(-6/20)/4],
      ['normalize-after-trim',[['trim',[0,1]],['normalize',-6]],10**(-6/20)],
      ['normalize-twice',[['normalize',-12],['normalize',-6]],10**(-6/20)],
      ['clip',[['gain',12]],1],
    ]) {
      await setup(signal,steps); output=await exportFile(label);
      const peak=output.samples.reduce((maximum,value)=>Math.max(maximum,Math.abs(value)),0);
      assert(Math.abs(peak-expectedPeak)<.00004,`${label} peak ${peak}/${expectedPeak}`); records.at(-1).peak=peak;
      if(label==='clip')assert(records.at(-1).stats.clippedSamples>0);
      await remove('signal.wav');
    }
    await setup(silence,[['normalize',-6],['channels','stereo']]); output=await exportFile('silence');
    assert.equal(output.channels,2); assert(output.samples.every(value=>value===0)); await remove('silence.wav');
    const quiet=fixture('quiet.wav',2,1,false,.0001);await setup(quiet,[['normalize',-6]]);output=await exportFile('quiet');
    assert.equal(records.at(-1).stats.limitedNormalizations,1);assert(output.samples.every(value=>Math.abs(value)<=.1));
    await page.getByText(/Normalization limited\.|Limited by the maximum gain\./).waitFor();await remove('quiet.wav');
    for(const rate of [44100,32000,24000,16000]) {
      await setup(signal,[['resample',rate]]); output=await exportFile(`rate-${rate}`);
      assert.equal(output.rate,rate); assert.equal(output.samples.length,rate*2*2);
      let crossings=0;for(let i=rate/10;i<rate*.9;i++)if(output.samples[i*2]<=0&&output.samples[(i+1)*2]>0)crossings++;
      assert(Math.abs(crossings-800)<=1,`pitch at ${rate}: ${crossings}`);
      await remove('signal.wav');
    }
    await setup(signal,[['resample',44100],['resample',48000],['trim',[.25,.75]]]);
    output=await exportFile('resample-before-trim');assert.equal(output.samples.length/output.channels,24000);assert.equal(output.rate,48000);
    await remove('signal.wav');
    await setup(signal,[['trim',[.3,.6]]]);
    output=await exportFile('trim-shared');assert.equal(output.samples.length/output.channels,14400);await remove('signal.wav');
    const surround=fixture('surround.wav',1,3);await setup(surround,[]);
    await page.getByRole('button',{name:'Export',exact:true}).click();
    await page.getByText('Processing supports mono or stereo audio from 8 to 384 kHz.',{exact:true}).waitFor();
    await assertEventually(async()=>assert.equal(await storeCount(page),0));await remove('surround.wav');
    for(const file of ['tone.mp3','tone.m4a','tone.aac','tone.flac','tone.ogg','tone.opus','video.mp4','video.mov','video.mkv','video.webm','offset.mp4','laced-opus.mka']) {
      await setup(`tests/fixtures/${file}`,[['gain',-6]]); output=await exportFile(file);
      if(file!=='tone.aac')assert.equal(output.samples.length/output.channels,file==='offset.mp4'?97024:96000,`${file} presentation frames`);
      const reference=pcm(`tests/fixtures/${file==='laced-opus.mka'?'tone.opus':file}`);
      let error=0;for(let i=0;i<Math.min(output.samples.length,8192);i++)error+=(output.samples[i]-reference.samples[i]*factor)**2;
      const rmse=Math.sqrt(error/Math.min(output.samples.length,8192)); assert(rmse<.0001,`${file} decoded head ${rmse}`); records.at(-1).rmse=rmse;
      await remove(file);
    }
    for(const seconds of [3,180]) {
      const file=fixture(`long-${seconds}.wav`,seconds);
      await setup(file,[['normalize',-6]]);await exportFile(`long-${seconds}`);await remove(file.name);
    }
    await setup(signal,[['normalize',-6]]);await page.evaluate(()=>window.__failWrite=true);
    await page.getByRole('button',{name:'Export',exact:true}).click();
    await page.getByText('Not enough device storage for this output.',{exact:true}).waitFor();
    await assertEventually(async()=>assert.equal(await storeCount(page),0));
    await exportFile('retry');await remove('signal.wav');
    await setup(signal,[['normalize',-6]]);await page.evaluate(()=>window.__pauseWrites=true);
    await page.getByRole('button',{name:'Export',exact:true}).click();await page.locator('[data-job-state=running]').waitFor();
    await page.getByRole('button',{name:'Remove signal.wav',exact:true}).click();await page.evaluate(()=>window.__pauseWrites=false);
    await assertEventually(async()=>assert.equal(await storeCount(page),0));
    assert.equal(await page.getByRole('link',{name:/Download exported audio/}).count(),0);
    assert.deepEqual(errors,[]);assert(!requests.some(url=>!url.startsWith(new URL(appUrl).origin)&&!url.startsWith('blob:')));
    records.push({engine,label:'recovery',pageErrors:errors,externalRequests:0});
  } finally {await context.close();}
}
await writeFile(`${root}/results.json`,JSON.stringify(records,null,2)+'\n');
console.log(`Passed ${records.length} browser DSP observations.`);
async function assertEventually(check) {
  const until=Date.now()+10000;let failure;
  do {try{await check();return;}catch(error){failure=error;}await new Promise(resolve=>setTimeout(resolve,50));}while(Date.now()<until);
  throw failure;
}
