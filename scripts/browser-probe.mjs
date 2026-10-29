import { chromium, webkit } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const root='docs/sprint-evidence/sprint-1';
await mkdir(root,{recursive:true});
for(const [name,type] of [['chromium',chromium],['webkit',webkit]]){
  let browser;
  try {
    browser=await type.launch({headless:true});
    const page=await browser.newPage();
    page.on('pageerror',e=>process.stderr.write(`${name}: ${e.message}\n`));
    await page.goto((process.env.PROBE_URL ?? 'http://127.0.0.1:5173/audio-toolkit-v1/probes/'));
    await page.waitForFunction(()=>window.runProbe);
    const result=await page.evaluate(()=>window.runProbe());
    await writeFile(`${root}/${name}-probe.json`,JSON.stringify(result,null,2)+'\n');
    process.stdout.write(`${name}: ${JSON.stringify(result)}\n`);
    if(Object.values(result.formats).some(v=>v.error||!v.decodedFrames)||!result.copy.valid)process.exitCode=1;
    {
      const isolation=await page.evaluate(()=>window.runIsolationProbe());
      await writeFile(`${root}/${name}-isolation-probe.json`,JSON.stringify(isolation,null,2)+'\n');
      process.stdout.write(`isolation: ${JSON.stringify(isolation)}\n`);
      if(isolation.type!=='done'||!isolation.finite||isolation.voiceFrames!==44100||isolation.musicFrames!==44100)process.exitCode=1;
    }
  }catch(e){process.stderr.write(`${name}: ${e.message}\n`);process.exitCode=1;}
  finally{await browser?.close();}
}
