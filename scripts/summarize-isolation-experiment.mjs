import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const profiles=['baseline','overlap55','reuse2','overlap55-reuse2'];
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
function summarize(result){
 assert.deepEqual(result.failures,[],'The experiment must preserve and reject failed cases.');
 assert.equal(result.active,0,'No inference workers may remain active.');
 assert.equal(result.maxActive,1,'At most one model worker may run.');
 const warm=result.records.filter(r=>r.round>0&&r.keep==='music');
 const groups=profiles.map(profile=>({profile,runs:warm.filter(r=>r.profile===profile)}));
 for(const group of groups){
  assert.deepEqual(group.runs.map(r=>r.round).sort(),[1,2,3,4,5],group.profile+' needs five distinct completed warm rounds.');
  for(const record of group.runs){
   assert.equal(record.frames,839808,'Output frame grid changed.');assert.equal(record.channels,2);assert.equal(record.rate,44100);
   assert(Number.isFinite(record.processingMs)&&record.processingMs>0);assert(record.rms>0);assert(record.peak>0);
   const windows=group.profile.startsWith('overlap55')?6:5,loads=group.profile.includes('reuse2')?3:windows;
   assert.equal(record.stats.isolationWindows,windows);assert.equal(record.stats.isolationLoads,loads);
   assert.equal(record.trace.filter(e=>e.kind==='done').length,windows);assert.equal(record.trace.filter(e=>e.kind==='created').length,loads);
   assert.deepEqual(record.stats.isolationBackends,['webgpu+wasm'],'Matched backend required.');
  }
 }
 const hash=groups[0].runs[0].sha256,overlapHash=groups[1].runs[0].sha256;
 for(const group of groups)for(const record of group.runs)assert.equal(record.sha256,group.profile.startsWith('overlap55')?overlapHash:hash,'Session reuse changed PCM16 WAV output.');
 const summaries=groups.map(({profile,runs})=>{const times=runs.map(r=>r.processingMs);return{profile,runs:times.length,medianMs:median(times),rangeMs:[Math.min(...times),Math.max(...times)],medianSecondsPerAudioMinute:median(times)/1000/(839808/44100/60),windows:runs[0].stats.isolationWindows,loads:runs[0].stats.isolationLoads,sha256:runs[0].sha256};});
 return{scope:'Five interleaved warm runs per profile on the full live fixture lasting 19.043265 seconds in actual Mac Chrome. Processing includes decode, checkpoints, inference, overlap and WAV encode. Excludes initial fixture fetch/source inspection and output validation.',promotion:'Not accepted. Owned peak memory, other supported engines, affected-passage listening and broader workload verification remain open.',baselineMs:summaries[0].medianMs,summaries:summaries.map(row=>({...row,changePercent:100*(row.medianMs/summaries[0].medianMs-1)})),sessionReuseOutput:'Byte-identical PCM16 WAV within each overlap group.'};
}
if(process.argv.includes('--self-test')){
 const sample={failures:[],active:0,maxActive:1,records:profiles.flatMap(profile=>Array.from({length:5},(_,index)=>{const windows=profile.startsWith('overlap55')?6:5,loads=profile.includes('reuse2')?3:windows;return{profile,round:index+1,keep:'music',frames:839808,channels:2,rate:44100,rms:.1,peak:.2,sha256:profile.startsWith('overlap55')?'overlap':'baseline',processingMs:30000,stats:{isolationWindows:windows,isolationLoads:loads,isolationBackends:['webgpu+wasm']},trace:[...Array.from({length:windows},()=>({kind:'done'})),...Array.from({length:loads},()=>({kind:'created'}))]};}))};
 summarize(sample);
 for(const mutate of [x=>x.records[0].frames++,x=>x.records[10].sha256='changed',x=>x.records.pop(),x=>x.failures.push('failure'),x=>x.records[0].trace.pop()]){const bad=structuredClone(sample);mutate(bad);assert.throws(()=>summarize(bad));}
 console.log('Comparator positive control and five negative controls passed.');
}else{const path=process.argv[2]??'docs/sprint-evidence/sprint-21/chrome-comparison.json';console.log(JSON.stringify(summarize(JSON.parse(await readFile(path,'utf8'))),null,2));}
