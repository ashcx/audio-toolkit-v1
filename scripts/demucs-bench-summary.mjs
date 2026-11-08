import {readFile,writeFile} from 'node:fs/promises';

const [output,...reports]=process.argv.slice(2);
if(!output||!reports.length)throw Error('Usage: node scripts/demucs-bench-summary.mjs <summary.json> <bench report.json>...');
const median=values=>{const sorted=[...values].sort((a,b)=>a-b),mid=sorted.length>>1;return sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;};
const round=(value,digits=0)=>value==null?null:Math.round(value*10**digits)/10**digits;

function scnetPhases(marks){
 const totals={workerAndModelFetchMs:0,sessionMs:0,separateMs:0};let open=null;
 for(const {at,event} of marks){
  if(event==='Loading isolation tools')open={tools:at};
  else if(open&&event==='Loading model')open.model=at;
  else if(open&&event==='Separating')open.separate=at;
  else if(open&&event==='window-done'){
   const model=open.model??open.tools,separate=open.separate??model;
   totals.workerAndModelFetchMs+=model-open.tools;totals.sessionMs+=separate-model;totals.separateMs+=at-separate;open=null;
  }
 }
 return totals;
}

const groups=new Map(),meta=[];
for(const path of reports){
 const report=JSON.parse(await readFile(path,'utf8'));
 meta.push({path,mode:report.mode,revision:report.revision,chrome:report.chrome,gpu:report.gpu,startedAt:report.startedAt,finishedAt:report.finishedAt,failures:report.failures.length});
 for(const run of report.runs){
  if(!run.label?.startsWith('round'))continue;
  const key=[run.input,run.candidate,run.overlap??''].join('|');
  if(!groups.has(key))groups.set(key,{input:run.input,candidate:run.candidate,overlap:run.overlap??null,runs:[],failures:[]});
  const group=groups.get(key);
  if(run.ok)group.runs.push(run);else group.failures.push(run.error);
 }
}

const rows=[...groups.values()].map(group=>{
 const runs=group.runs,wall=runs.map(run=>run.wallMs);
 const row={input:group.input,candidate:group.candidate,overlap:group.overlap,completed:runs.length,failures:group.failures.length,failureMessages:[...new Set(group.failures)],
  audioSeconds:runs[0]?.audioSeconds??null,
  medianWallS:runs.length?round(median(wall)/1000,2):null,rangeWallS:runs.length?[round(Math.min(...wall)/1000,2),round(Math.max(...wall)/1000,2)]:null,
  medianRealTimeFactor:runs.length?round(median(runs.map(run=>run.realTimeFactor)),2):null,
  windows:[...new Set(runs.map(run=>run.windows))],loads:[...new Set(runs.map(run=>run.loads))],backends:[...new Set(runs.flatMap(run=>run.backends))],
  outputFramesComplete:runs.every(run=>run.vocals.complete&&run.accompaniment.complete),
  distinctVocalsHashes:new Set(runs.map(run=>run.vocals.sha256).filter(Boolean)).size,
  medianPeakIncreaseMiB:runs.length?round(median(runs.map(run=>run.memory.peakIncreaseBytes))/2**20):null,
  maxPeakIncreaseMiB:runs.length?round(Math.max(...runs.map(run=>run.memory.peakIncreaseBytes))/2**20):null,
  maxPeakTotalMiB:runs.length?round(Math.max(...runs.map(run=>run.memory.peakBytes))/2**20):null,
  medianLoadAverage:runs.length?round(median(runs.map(run=>run.loadAverage)),2):null,
 };
 if(runs[0]?.timings){
  const keys=['fetchMs','sessionMs','inferenceMs','adapterMs','normalizeAndTransformsMs','accompanimentMs','transferMs','gpuDispatches'];
  row.medianPhases=Object.fromEntries(keys.map(key=>[key,round(median(runs.map(run=>run.timings[key])),1)]));
  row.medianInferenceMsPerWindow=round(median(runs.map(run=>run.timings.inferenceMs/run.timings.windows)),1);
  row.medianTransformsMsPerWindow=round(median(runs.map(run=>run.timings.normalizeAndTransformsMs/run.timings.windows)),1);
 }else if(runs[0]?.candidate?.startsWith('scnet')&&runs[0].candidate!=='scnet-app'){
  const phases=runs.map(run=>scnetPhases(run.marks));
  row.medianPhases=Object.fromEntries(Object.keys(phases[0]).map(key=>[key,round(median(phases.map(phase=>phase[key])),1)]));
  row.medianSeparateMsPerWindow=round(median(runs.map((run,index)=>phases[index].separateMs/run.windows)),1);
 }else if(runs[0]?.candidate==='scnet-app'){
  const isolation=runs.map(run=>{const first=run.marks.find(mark=>mark.event==='isolation-progress'),done=[...run.marks].reverse().find(mark=>mark.event==='isolation-progress');return done&&first?done.at-first.at:null;});
  const total=runs.map(run=>run.wallMs);
  row.medianOutsideIsolationS=round(median(total.map((value,index)=>value-isolation[index]))/1000,2);
 }
 return row;
});
rows.sort((a,b)=>a.input.localeCompare(b.input)||a.candidate.localeCompare(b.candidate)||(a.overlap??0)-(b.overlap??0));
await writeFile(output,JSON.stringify({generatedAt:new Date().toISOString(),sources:meta,rows},null,2)+'\n');
console.log('| Input | Candidate | Overlap | Runs ok/fail | Median wall s | Range s | Median RTF | Windows | Loads | Backend | Median peak +MiB |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for(const row of rows)console.log(`| ${row.input} | ${row.candidate} | ${row.overlap??''} | ${row.completed}/${row.failures} | ${row.medianWallS} | ${row.rangeWallS?.join(' to ')} | ${row.medianRealTimeFactor} | ${row.windows.join(',')} | ${row.loads.join(',')} | ${row.backends.join(',')} | ${row.medianPeakIncreaseMiB} |`);
