import test from 'node:test';
import assert from 'node:assert/strict';
import {isolationWindows,isolationWindowCount,ISOLATION_WINDOW} from '../src/pcm/isolation-window.ts';
function signal(frames,chunk){return(async function*(){for(let from=0;from<frames;from+=chunk){const length=Math.min(chunk,frames-from);yield{origin:.37,offset:from,rate:44100,planes:[Float32Array.from({length},(_,i)=>Math.sin((from+i)*.019)*.3+.001),Float32Array.from({length},(_,i)=>Math.cos((from+i)*.017)*.2)]};}})();}
test('weighted windows perfectly reconstruct short/full/overlapping/tail source grids',async()=>{
 for(const frames of [1,481,ISOLATION_WINDOW,ISOLATION_WINDOW+1,ISOLATION_WINDOW*2+137]){
  const stats={windows:0,maxWindowFrames:0};let received=0,error=0;
  for await(const block of isolationWindows(signal(frames,4093),{frames,channels:2,origin:.37},async planes=>planes,stats)){
   assert.equal(block.offset,received);assert.equal(block.origin,.37);assert(block.planes[0].length<=4096);
   for(let i=0;i<block.planes[0].length;i++){error=Math.max(error,Math.abs(block.planes[0][i]-(Math.sin((received+i)*.019)*.3+.001)));error=Math.max(error,Math.abs(block.planes[1][i]-Math.cos((received+i)*.017)*.2));}received+=block.planes[0].length;
  }
  assert.equal(received,frames);assert(error<1e-5);assert(stats.maxWindowFrames<=ISOLATION_WINDOW);assert.equal(stats.windows,isolationWindowCount(frames));
 }
});
test('window boundaries do not depend on decoder chunk boundaries',async()=>{
 const outputs=[];
 for(const chunk of [127,4096]){
  const stats={windows:0,maxWindowFrames:0},values=[];
  for await(const block of isolationWindows(signal(ISOLATION_WINDOW+39,chunk),{frames:ISOLATION_WINDOW+39,channels:2,origin:.37},async planes=>planes.map(plane=>plane.map(value=>value*.4)),stats))values.push(...block.planes[0]);
  outputs.push(Float32Array.from(values));
 }
 assert.deepEqual(outputs[0],outputs[1]);
});
