import test from 'node:test';import assert from 'node:assert/strict';
import {Archive} from '../src/archive.ts';import {CleanupFailure} from '../src/cleanup.ts';
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
function fixture(){let resolve;let calls=0,releases=0,fail=false;const archive=new Archive(async()=>{calls++;return await new Promise(r=>resolve=r);});const output={file:new File(['x'],'result.zip'),name:'result.zip',mime:'application/zip',release:async()=>{if(fail)throw Error('busy');releases++;}};return {archive,output,finish:()=>resolve(output),get calls(){return calls;},get releases(){return releases;},fail:value=>fail=value};}
test('archive owns one URL, rejects overlapping builds, releases on clear and can be rebuilt',async()=>{
 const f=fixture();f.archive.start([f.output.file]);f.archive.start([f.output.file]);await tick();assert.equal(f.calls,1);f.finish();await tick();assert.equal(f.archive.state.kind,'ready');const url=f.archive.state.url;assert.equal(await(await fetch(url)).text(),'x');await f.archive.clear();assert.equal(f.releases,1);assert.equal(f.archive.state.kind,'idle');await assert.rejects(fetch(url));f.archive.start([f.output.file]);await tick();f.finish();await tick();assert.equal(f.calls,2);await f.archive.clear();assert.equal(f.releases,2);
});
test('cancel waits for pending builder and releases its late output without success',async()=>{
 const f=fixture();f.archive.start([f.output.file]);await tick();f.archive.cancel();assert.equal(f.archive.busy,true);assert.equal(f.archive.state.kind,'cancelling');f.finish();await tick();assert.equal(f.archive.state.kind,'idle');assert.equal(f.releases,1);assert.equal(f.archive.busy,false);
});
test('failed cleanup retains ownership for retry and blocks new builds',async()=>{
 const f=fixture();f.archive.start([f.output.file]);await tick();f.finish();await tick();f.fail(true);await f.archive.clear();assert.equal(f.archive.state.kind,'cleanup');assert(f.archive.busy);f.archive.start([f.output.file]);assert.equal(f.calls,1);f.fail(false);await f.archive.clear();assert.equal(f.releases,1);assert.equal(f.archive.busy,false);
});
test('builder cleanup failures remain recoverable, disposal cancels and releases late output',async()=>{
 let recovered=0;const archive=new Archive(async()=>{throw new CleanupFailure(async()=>{recovered++;});});archive.start([new File(['x'],'x')]);await tick();assert.equal(archive.state.kind,'cleanup');await archive.clear();assert.equal(recovered,1);
 const f=fixture();f.archive.start([f.output.file]);await tick();f.archive.dispose();f.finish();await tick();assert.equal(f.releases,1);assert.equal(f.archive.state.kind,'idle');
});
test('clearing an archive that holds nothing shows no Finishing state, and a failed zip is still cleared',async()=>{
 const f=fixture(),seen=[];f.archive.subscribe(state=>seen.push(state.kind));
 await f.archive.clear();assert.deepEqual(seen,[]);
 const broken=new Archive(async()=>{throw new Error('boom');});const kinds=[];broken.subscribe(state=>kinds.push(state.kind));
 broken.start([new File(['x'],'x')]);await tick();assert.equal(broken.state.kind,'failed');
 await broken.clear();assert.equal(broken.state.kind,'idle');assert(kinds.includes('releasing'));
});
test('the silent retry after a failed cleanup runs even when it is requested the moment the cleanup state appears',async()=>{
 const f=fixture();f.archive.start([f.output.file]);await tick();f.finish();await tick();assert.equal(f.archive.state.kind,'ready');
 f.archive.subscribe(state=>{if(state.kind==='cleanup'&&state.attempts===1){f.fail(false);Promise.resolve().then(()=>f.archive.clear());}});
 f.fail(true);await f.archive.clear();await tick();
 assert.equal(f.archive.state.kind,'idle');assert.equal(f.archive.busy,false);assert.equal(f.releases,1);
});
