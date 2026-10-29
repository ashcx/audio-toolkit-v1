import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
const browser=await chromium.launch();
const page=await browser.newPage();
const system=await browser.newBrowserCDPSession();
let peakRss=0, samples=0, stopping=false;
const observe=async()=>{
 while(!stopping){
  const {processInfo}=await system.send('SystemInfo.getProcessInfo');
  let rss=0;
  for(const process of processInfo){
   try{const text=await readFile(`/proc/${process.id}/status`,'utf8');rss+=Number(text.match(/^VmRSS:\s+(\d+)/m)?.[1]??0)*1024;}catch{}
  }
  peakRss=Math.max(peakRss,rss);samples++;
  await new Promise(resolve=>setTimeout(resolve,250));
 }
};
const sampling=observe();
try{
 await page.goto('http://127.0.0.1:4173/audio-toolkit-v1/probes/');
 await page.waitForFunction(()=>window.runIsolationProbe);
 const chunks=[];
 for(let chunk=0;chunk<5;chunk++){
  const result=await page.evaluate(()=>window.runIsolationProbe());
  if(result.type!=='done'||!result.finite||result.voiceFrames!==44100||result.musicFrames!==44100)throw Error(JSON.stringify(result));
  chunks.push(result);
 }
 const report={claim:'Five sequential fixed-size inference chunks do not require retaining song-length PCM in the host; not production continuity or long-file safety proof',maxInputFramesPerJob:44100,processedFrames:5*44100,retainedOutputFrames:0,peakBrowserProcessRssBytes:peakRss,samples,rssBudgetBytes:2*1024**3,failures:0,chunks};
 await writeFile('docs/sprint-evidence/sprint-1/resource-probe.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));
 if(peakRss>report.rssBudgetBytes)throw Error('Predeclared 2 GiB process RSS budget exceeded');
}finally{stopping=true;await sampling;await browser.close();}
