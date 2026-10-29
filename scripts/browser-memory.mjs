import {readFile,readdir} from 'node:fs/promises';
async function processes(){
 const values=new Map();await Promise.all((await readdir('/proc')).filter(value=>/^\d+$/.test(value)).map(async value=>{
  try{const text=await readFile(`/proc/${value}/status`,'utf8');values.set(Number(value),{parent:Number(text.match(/^PPid:\s+(\d+)/m)?.[1]),rss:Number(text.match(/^VmRSS:\s+(\d+)/m)?.[1]??0)*1024});}catch{}
 }));return values;
}
export async function childProcesses(){const values=await processes();return new Set([...values].filter(([,entry])=>entry.parent===process.pid).map(([id])=>id));}
export function monitorBrowserMemory(roots,onExceeded,budget=2*1024**3){
 const report={peakSampledOwnedBrowserRssBytes:0,samples:0,budgetBytes:budget,budgetExceeded:false};let stopped=false;
 const sampling=(async()=>{while(!stopped){const values=await processes(),owned=new Set(roots);let changed=true;while(changed){changed=false;for(const[id,entry]of values)if(owned.has(entry.parent)&&!owned.has(id)){owned.add(id);changed=true;}}
  const rss=[...owned].reduce((sum,id)=>sum+(values.get(id)?.rss??0),0);report.peakSampledOwnedBrowserRssBytes=Math.max(report.peakSampledOwnedBrowserRssBytes,rss);report.samples++;
  if(rss>budget){report.budgetExceeded=true;await onExceeded();return;}await new Promise(resolve=>setTimeout(resolve,250));
 }} )();
 return{report,stop:async()=>{stopped=true;await sampling;}};
}
