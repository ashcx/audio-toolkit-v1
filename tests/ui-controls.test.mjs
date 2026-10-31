import test from 'node:test';
import assert from 'node:assert/strict';
import { formatClock,parseClock } from '../src/format.ts';
import { trimHandles,changeTrimHandle } from '../src/trim-control.ts';
import { resolveTrim } from '../src/recipe.ts';
import { measureLevels,combineLevels,levelDb } from '../src/levels.ts';
import { LOUDNESS_MARKS,LOUDNESS_MAX,LOUDNESS_MIN,positionForLufs,lufsForPosition,lufsFromPosition,stepLufs } from '../src/loudness-rail.ts';
test('clock fields keep human-readable times and distinct sample-sized boundaries',()=>{
 for(const [value,text] of [[0,'0:00'],[542.609,'9:02.609'],[619.439,'10:19.439'],[3601.125,'1:00:01.125'],[1.0001,'0:01.0001'],[1.0002,'0:01.0002']]){assert.equal(formatClock(value),text);assert(Math.abs(parseClock(text)-value)<1e-9);}
});
test('clock parsing accepts seconds and rejects malformed clock fields',()=>{
 assert.equal(parseClock('542.609'),542.609);assert.equal(parseClock(''),null);assert.equal(parseClock('1:02:03'),3723);
 for(const text of ['1:60','1:99:00','-1','abc','1:','0:00.0.1'])assert(Number.isNaN(parseClock(text)));
});
test('shared trim handles preserve omitted or longer ends and repair invalid shorter-file ranges',()=>{
 assert.deepEqual(changeTrimHandle({start:null,end:null},10,'start',2),{start:2,end:null});
 assert.deepEqual(changeTrimHandle({start:0,end:100},10,'start',2),{start:2,end:100});
 for(const range of [{start:7,end:null},{start:NaN,end:NaN},{start:2,end:1}]){
  const repaired=changeTrimHandle(range,5,'end',4);assert.equal(resolveTrim(repaired,5).kind,'ready');
 }
 for(const bound of [2,.0005])for(const handle of ['start','end']){
  const next=changeTrimHandle({start:null,end:null},bound,handle,handle==='start'?bound:0);assert.equal(resolveTrim(next,bound).kind,'ready');
 }
 assert.deepEqual(trimHandles({start:0,end:null},2),{start:0,end:2,gap:.001});
});
async function* blocks(planes){yield {origin:0,offset:0,rate:48000,planes:planes.map(p=>Float32Array.from(p))};}
test('on-demand levels measure peak and sample-weighted RMS, including silence and stereo',async()=>{
 const levels=await measureLevels(blocks([[.5,-.5,0,0],[.25,-.25,0,0]]),new AbortController().signal,()=>{});
 assert.equal(levels.peak,.5);assert.equal(levels.samples,8);assert.equal(levels.squareSum,.625);
 assert(Math.abs(levelDb(levels.peak)+6.020599913)<1e-8);
 assert.equal(levelDb(0),null);
 const silent=await measureLevels(blocks([[0,0]]),new AbortController().signal,()=>{});assert.equal(silent.peak,0);
 assert.deepEqual(combineLevels([levels,silent]),{peak:.5,squareSum:.625,samples:10});
});
test('level analysis rejects invalid/empty audio and honors cancellation before processing a block',async()=>{
 await assert.rejects(measureLevels(blocks([[NaN]]),new AbortController().signal,()=>{}),/invalid samples/);
 await assert.rejects(measureLevels(blocks([[]]),new AbortController().signal,()=>{}),/No measurable/);
 const controller=new AbortController();controller.abort();await assert.rejects(measureLevels(blocks([[.1]]),controller.signal,()=>{}),{name:'AbortError'});
});

test('analysis worker is terminated on completion, abort and clone failure; late replies are ignored',async()=>{
 const {analyzeLevels}=await import('../src/levels-client.ts');
 const original=globalThis.Worker;const workers=[];
 globalThis.Worker=class {
  constructor(){this.terminated=0;workers.push(this);}
  postMessage(){if(this.fail)throw Error('clone');}
  terminate(){this.terminated++;}
 };
 try{
  const controller=new AbortController();const cancelled=analyzeLevels(new File(['x'],'a.wav'),{},controller.signal);const first=workers.at(-1);
  controller.abort();await assert.rejects(cancelled,{name:'AbortError'});assert.equal(first.terminated,1);
  first.onmessage({data:{kind:'done',levels:{peak:1,squareSum:1,samples:1}}});assert.equal(first.terminated,1);
  const success=analyzeLevels(new File(['x'],'b.wav'),{},new AbortController().signal);const second=workers.at(-1);
  second.onmessage({data:{kind:'done',levels:{peak:.5,squareSum:.25,samples:1}}});assert.equal((await success).peak,.5);assert.equal(second.terminated,1);
  globalThis.Worker.prototype.postMessage=()=>{throw Error('clone');};
  await assert.rejects(analyzeLevels(new File(['x'],'clone.wav'),{},new AbortController().signal),/Could not start/);assert.equal(workers.at(-1).terminated,1);
  globalThis.Worker.prototype.postMessage=()=>{};
  const failed=analyzeLevels(new File(['x'],'c.wav'),{},new AbortController().signal);const third=workers.at(-1);
  third.onmessage({data:{kind:'error',message:'Unavailable'}});await assert.rejects(failed,/Unavailable/);assert.equal(third.terminated,1);
 }finally{globalThis.Worker=original;}
});

test('the loudness rail is monotonic, preserves every 0.5 LUFS step and exposes the reference marks',()=>{
 let previous=-Infinity;
 for(let value=LOUDNESS_MIN;value<=LOUDNESS_MAX;value+=0.5){
  const position=positionForLufs(value);
  assert(position>previous,`position must increase at ${value}`);
  previous=position;
  assert.equal(lufsForPosition(position),value,`inverse at ${value}`);
 }
 assert.equal(lufsForPosition(0),LOUDNESS_MIN);assert.equal(lufsForPosition(1),LOUDNESS_MAX);
 const values=LOUDNESS_MARKS.map(mark=>mark.value);
 for(const value of [-23,-16,-14,-9.5,-8])assert(values.includes(value),`missing mark ${value}`);
 assert.deepEqual(LOUDNESS_MARKS.filter(mark=>mark.kind==='delivery').map(mark=>mark.value),[-23]);
 assert.equal(LOUDNESS_MARKS.find(mark=>mark.value===-16).label,'Podcast reference');
});
test('the loudness rail magnetises near a mark without trapping the pointer',()=>{
 const fourteen=positionForLufs(-14);
 assert.equal(lufsFromPosition(fourteen),-14);
 assert.equal(lufsFromPosition(fourteen+0.005),-14);
 const escaped=lufsFromPosition(fourteen+0.05);
 assert.notEqual(escaped,-14);assert(escaped>-14);
 assert(lufsFromPosition(fourteen+0.1)>escaped,'moving farther away keeps increasing the target');
 assert.equal(stepLufs(-14,1),-13.5);assert.equal(stepLufs(-14,-1),-14.5);
 assert.equal(stepLufs(LOUDNESS_MAX,1),LOUDNESS_MAX);assert.equal(stepLufs(LOUDNESS_MIN,-1),LOUDNESS_MIN);
});
test('compact time labels round only their display and carry across minute boundaries',async()=>{
 const {formatTime,formatTrimTime}=await import('../src/format.ts');
 for(const [value,summary,trim] of [[0,'00:00','00:00'],[542.609,'09:03','09:02.6'],[59.96,'01:00','01:00'],[3601.125,'60:01','60:01.1'],[1.0001,'00:01','00:01']]){
  assert.equal(formatTime(value),summary);assert.equal(formatTrimTime(value),trim);
  assert(Math.abs(parseClock(formatClock(value))-value)<1e-9);
 }
});
