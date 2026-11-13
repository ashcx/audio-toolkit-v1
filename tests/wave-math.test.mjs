import test from 'node:test';
import assert from 'node:assert/strict';
import {timeToX,xToTime,clampTime,nudgeTime,barExtents,trimGeometry,coalesced,playbackAfter,LINE_WIDTH} from '../src/wave-math.ts';
import {measurePeaks} from '../src/peaks.ts';
import {changeTrimHandle} from '../src/trim-control.ts';
test('time and x map to each other and stay inside the file',()=>{
 for(const [duration,width] of [[94.2,300],[0.5,1200],[3600,320]])for(const time of [0,duration/3,duration/2,duration])
  assert(Math.abs(xToTime(timeToX(time,duration,width),duration,width)-time)<1e-9,`${duration}/${width}/${time}`);
 assert.equal(xToTime(-40,10,200),0);assert.equal(xToTime(900,10,200),10);
 assert.equal(timeToX(99,10,200),200);assert.equal(timeToX(-1,10,200),0);
 assert.equal(timeToX(5,0,200),0);assert.equal(xToTime(5,10,0),0);
 assert.equal(clampTime(11,10),10);assert.equal(clampTime(-1,10),0);
});
test('handles keep a gap of 0.001 s and cannot cross, using the shared trim control',()=>{
 const range={start:2,end:8};
 assert.deepEqual(changeTrimHandle(range,10,'start',9),{start:7.999,end:8});
 assert.deepEqual(changeTrimHandle(range,10,'end',1),{start:2,end:2.001});
 assert.deepEqual(changeTrimHandle(range,10,'end',99),{start:2,end:10});
 assert.deepEqual(changeTrimHandle(range,10,'start',-5),{start:0,end:8});
});
test('keys move a slider by the small or large step and jump to the ends',()=>{
 assert.equal(nudgeTime('ArrowRight',5,60,1,5,false),6);
 assert.equal(nudgeTime('ArrowRight',5,60,1,5,true),10);
 assert.equal(nudgeTime('ArrowLeft',5,60,0.1,1,false),4.9);
 assert.equal(nudgeTime('ArrowLeft',0.5,60,0.1,1,true),0);
 assert.equal(nudgeTime('ArrowUp',59.95,60,0.1,1,false),60);
 assert.equal(nudgeTime('Home',5,60,1,5,false),0);assert.equal(nudgeTime('End',5,60,1,5,false),60);
 assert.equal(nudgeTime('a',5,60,1,5,false),null);
});
test('trim lines sit at the range and are dimmed outside it',()=>{
 const g=trimGeometry({start:2,end:8},10,200);
 assert.deepEqual([g.startX,g.endX],[40,160]);
 assert.deepEqual(g.dimmed,[[0,40],[160,200]]);
 const whole=trimGeometry({start:0,end:10},10,200);
 assert.deepEqual([whole.startX,whole.endX],[LINE_WIDTH/2,200-LINE_WIDTH/2]);
 assert.deepEqual(whole.dimmed,[]);
 assert.deepEqual(trimGeometry({start:0,end:5},10,200).dimmed,[[100,200]]);
});
test('bars keep the extremes of the bins they cover',async()=>{
 const plane=new Float32Array(1200);plane[601]=-0.9;plane[10]=0.4;
 async function* blocks(){yield{planes:[plane],rate:1200,origin:0,offset:0};}
 const peaks=await measurePeaks(blocks(),1,new AbortController().signal);
 const {min,max}=barExtents(peaks,60);
 assert(Math.abs(min[30]+0.9)<1e-6);assert(Math.abs(max[0]-0.4)<1e-6);
 assert.equal(min.length,60);
 assert.equal(Math.min(...min.filter((_,i)=>i!==30)),0);
 assert.equal(barExtents(peaks,2000).max.length,2000);
});
function frames(){const waiting=[];return{schedule:run=>{waiting.push(run);return()=>{const at=waiting.indexOf(run);if(at>=0)waiting.splice(at,1);};},tick(){const runs=waiting.splice(0);runs.forEach(run=>run());},get waiting(){return waiting.length;}};}
test('a scrub applies one seek per frame with the latest position',()=>{
 const clock=frames(),seeks=[],scrub=coalesced(time=>seeks.push(time),clock.schedule);
 for(const time of [1,2,3,4])scrub.push(time);
 assert.deepEqual(seeks,[]);assert.equal(clock.waiting,1);
 clock.tick();assert.deepEqual(seeks,[4]);
 scrub.push(5);scrub.push(6);clock.tick();assert.deepEqual(seeks,[4,6]);
 clock.tick();assert.deepEqual(seeks,[4,6]);
});
test('releasing a scrub applies the exact final position at once and drops the pending frame',()=>{
 const clock=frames(),seeks=[],scrub=coalesced(time=>seeks.push(time),clock.schedule);
 scrub.push(3);scrub.push(3.5);
 scrub.finish(3.75);
 assert.deepEqual(seeks,[3.75]);assert.equal(clock.waiting,0);
 clock.tick();assert.deepEqual(seeks,[3.75]);
 scrub.push(8);scrub.cancel();clock.tick();assert.deepEqual(seeks,[3.75]);
});
test('playback state follows the element events',()=>{
 assert.equal(playbackAfter('idle','play'),'pending');
 assert.equal(playbackAfter('pending','playing'),'playing');
 assert.equal(playbackAfter('playing','waiting'),'pending');
 assert.equal(playbackAfter('pending','playing'),'playing');
 assert.equal(playbackAfter('playing','pause'),'idle');
 assert.equal(playbackAfter('playing','ended'),'idle');
 assert.equal(playbackAfter('pending','error'),'idle');
 assert.equal(playbackAfter('idle','waiting'),'idle');
});
