import test from 'node:test';
import assert from 'node:assert/strict';
import {Batch,batchConcurrency} from '../src/batch.ts';
import {newRecipe,newExport,newStep,recipeSchema,snapshotForFile} from '../src/recipe.ts';
import {createFileId} from '../src/media.ts';
import {compilePlan} from '../src/planner.ts';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function spec(name='tone.wav',steps=[]){
 const metadata={container:'wav',codec:'pcm-s16',duration:2,startTime:0,sampleRate:48000,channels:2,hasVideo:false};
 const entry={id:createFileId(),file:new File(['data'],name),inspection:{kind:'ready',metadata}};
 const snapshot=snapshotForFile(recipeSchema.parse({...newRecipe(),steps,export:newExport('wav')}),entry);
 return {entry,plan:compilePlan(snapshot.snapshot,metadata)};
}
function harness(slots=1){
 const calls=[],released=[];
 const batch=new Batch((job,signal,phase)=>{const deferred=Promise.withResolvers();calls.push({job,signal,phase,...deferred});return deferred.promise;},slots);
 function finish(index){const call=calls[index];call.resolve({report:{kind:'copy'},output:{name:call.job.name,mime:'audio/wav',file:new File(['bytes'],call.job.name),release:async()=>{released.push(index);}}});}
 return {batch,calls,released,finish};
}
test('capability policy never assumes memory and caps parallel work at two',()=>{
 for(const memory of [undefined,0,4,'8'])assert.equal(batchConcurrency({cores:16,memory,workers:true,storage:true}),1);
 assert.equal(batchConcurrency({cores:8,memory:8,workers:true,storage:true}),2);
 assert.equal(batchConcurrency({cores:4,memory:8,workers:true,storage:true}),1);
});
test('cancelled late success is released before dispatch; waiting cancel never starts',async()=>{
 const {batch,calls,released,finish}=harness();const [a,b,c]=[spec(),spec(),spec()];batch.start([a,b,c]);await tick();
 assert.equal(calls.length,1);batch.cancel(a.entry.id);batch.cancel(b.entry.id);
 assert.equal(batch.snapshot.jobs.get(a.entry.id).state.kind,'cancelling');assert.equal(batch.snapshot.busy,true);
 calls[0].phase({kind:'phase',phase:'Saving'});assert.equal(batch.snapshot.jobs.get(a.entry.id).state.kind,'cancelling');
 finish(0);await tick();assert.deepEqual(released,[0]);assert.equal(calls.length,2);assert.equal(calls[1].job.entry.id,c.entry.id);
 assert.equal(batch.snapshot.jobs.get(a.entry.id).state.kind,'cancelled');finish(1);await tick();batch.dispose();
});
test('failure is isolated and retry retains exact snapshot/name and unrelated success',async()=>{
 const {batch,calls,finish}=harness(2);const [a,b]=[spec('same.wav'),spec('same.wav')];batch.start([a,b]);await tick();
 assert.equal(calls.length,2);assert.notEqual(calls[0].job.name,calls[1].job.name);
 calls[0].reject(new Error('Injected encoder error'));finish(1);await tick();const success=batch.snapshot.jobs.get(b.entry.id).state;
 batch.retry();await tick();assert.equal(calls[2].job.plan,a.plan);assert.equal(calls[2].job.name,calls[0].job.name);assert.equal(batch.snapshot.jobs.get(b.entry.id).state,success);
 finish(2);await tick();assert.equal(batch.snapshot.busy,false);batch.dispose();
});
test('cancel all stops dispatch; remove/dispose reject stale attempts and free outputs',async()=>{
 const {batch,calls,released,finish}=harness(2);const inputs=[spec(),spec(),spec()];batch.start(inputs);await tick();batch.cancelAll();
 assert.equal(calls.length,2);assert(calls.every(call=>call.signal.aborted));batch.remove(inputs[0].entry.id);finish(0);finish(1);await tick();
 assert.equal(calls.length,2);assert.equal(batch.snapshot.jobs.has(inputs[0].entry.id),false);assert.deepEqual(released,[0,1]);assert.equal(batch.snapshot.busy,false);
 batch.retry(inputs[1].entry.id);await tick();batch.dispose();finish(2);await tick();assert.deepEqual(released,[0,1,2]);assert.equal(batch.snapshot.jobs.size,0);
});
test('new run names cannot collide with retained output names',async()=>{
 const {batch,calls,finish}=harness();const a=spec('same.wav');batch.start([a]);await tick();finish(0);await tick();
 const b=spec('same.wav');batch.start([b]);await tick();assert.notEqual(calls[0].job.name,calls[1].job.name);finish(1);await tick();batch.dispose();
});

test('one failed old-output cleanup cannot fail unrelated new jobs',async()=>{
 const started=[];const a=spec('a.wav'),b=spec('b.wav');
 const batch=new Batch(async job=>{started.push(job.entry.id);return {report:{kind:'copy'},output:{file:new File(['data'],job.name),name:job.name,mime:'audio/wav',release:async()=>{if(job.entry.id===a.entry.id)throw new Error('Cleanup failed');}}};},2);
 batch.start([a]);await tick();batch.start([a,b]);await tick();
 assert.equal(batch.snapshot.jobs.get(a.entry.id).state.kind,'failed');assert.equal(batch.snapshot.jobs.get(b.entry.id).state.kind,'done');assert.equal(started.filter(id=>id===a.entry.id).length,1);batch.dispose();
});

test('failed cancellation cleanup stays owned after removal and blocks exports until recovery',async()=>{
 const {cleanupAll}=await import('../src/cleanup.ts');let fail=true,attempts=0;const first=spec(),other=spec();const deferred=Promise.withResolvers();
 const batch=new Batch(async()=>deferred.promise,1);batch.start([first]);await tick();batch.cancel(first.entry.id);batch.remove(first.entry.id);
 deferred.reject(await cleanupAll([async()=>{attempts++;if(fail)throw new Error('Storage locked');}]).catch(error=>error));await tick();
 assert.equal(batch.snapshot.cleanupCount,1);assert.equal(batch.snapshot.jobs.size,0);batch.start([other]);assert.equal(batch.snapshot.jobs.size,0);
 await batch.retryCleanup();assert.equal(batch.snapshot.cleanupCount,1);fail=false;await batch.retryCleanup();assert.equal(batch.snapshot.cleanupCount,0);assert.equal(attempts,3);batch.dispose();
});
test('cleanup attempts every owner and retries only failed actions',async()=>{
 const {cleanupAll,CleanupFailure}=await import('../src/cleanup.ts');const calls=[];let fail=true;
 const error=await cleanupAll([async()=>{calls.push('a');if(fail)throw new Error('Locked');},async()=>{calls.push('b');}]).catch(error=>error);
 assert(error instanceof CleanupFailure);assert.deepEqual(calls,['a','b']);fail=false;await error.recover();assert.deepEqual(calls,['a','b','a']);
});

test('removing a completed output stays busy until deletion settles',async()=>{
 const deletion=Promise.withResolvers();const item=spec(),other=spec();let runs=0;
 const batch=new Batch(async job=>{runs++;return {report:{kind:'copy'},output:{file:new File(['x'],job.name),name:job.name,mime:'audio/wav',release:()=>deletion.promise}};},1);
 batch.start([item]);await tick();batch.remove(item.entry.id);assert.equal(batch.snapshot.busy,true);assert.equal(batch.snapshot.cleaning,true);batch.start([other]);await tick();assert.equal(runs,1);deletion.resolve();await tick();assert.equal(batch.snapshot.busy,false);batch.dispose();
});
test('recovering old-output deletion clears its prerequisite before retry',async()=>{
 const item=spec();let fails=1,runs=0;
 const batch=new Batch(async job=>{runs++;return {report:{kind:'copy'},output:{file:new File(['x'],job.name),name:job.name,mime:'audio/wav',release:async()=>{if(fails-->0)throw new Error('One-time deletion failure');}}};},1);
 batch.start([item]);await tick();batch.start([item]);await tick();assert.equal(batch.snapshot.cleanupCount,1);assert.equal(runs,1);await batch.retryCleanup();assert.equal(batch.snapshot.cleanupCount,0);batch.retry(item.entry.id);await tick();assert.equal(runs,2);assert.equal(batch.snapshot.jobs.get(item.entry.id).state.kind,'done');batch.dispose();
});

test('isolation has an exclusive slot and queued inference never overlaps cleanup',async()=>{
 const {batch,calls,finish}=harness(2);const a=spec('a.wav',[newStep('isolation')]),b=spec('b.wav',[newStep('isolation')]),c=spec('c.wav');
 batch.start([a,b,c]);await tick();assert.equal(calls.length,1);assert.equal(calls[0].job.entry.id,a.entry.id);batch.cancel(a.entry.id);assert.equal(calls.length,1);finish(0);await tick();assert.equal(calls.length,2);assert.equal(calls[1].job.entry.id,b.entry.id);finish(1);await tick();assert.equal(calls.length,3);assert.equal(calls[2].job.entry.id,c.entry.id);finish(2);await tick();batch.dispose();
});
test('batch consumes a matching test once and reserves its name before other inputs',async()=>{
 const {batch,calls,released,finish}=harness();const a=spec('same.wav'),b=spec('same.wav');batch.start([b],'test');await tick();finish(0);await tick();const tested=batch.snapshot.jobs.get(b.entry.id).state;batch.start([a,b]);await tick();assert.equal(calls.length,2);assert.equal(batch.snapshot.jobs.get(b.entry.id).state,tested);assert.notEqual(calls[1].job.name,calls[0].job.name);assert.deepEqual(released,[]);finish(1);await tick();batch.start([a,b]);await tick();assert.equal(calls.length,3);finish(2);await tick();finish(3);await tick();assert.equal(calls.length,4);batch.dispose();
});
test('settings edits, explicit invalidation and changed File identity prevent test reuse',async()=>{
 for(const variant of ['plan','invalidate','file']){const {batch,calls,finish}=harness();const a=spec();batch.start([a],'test');await tick();finish(0);await tick();let next=a;if(variant==='plan')next={...a,plan:{...a.plan,snapshot:{...a.plan.snapshot,recipe:{...a.plan.snapshot.recipe,export:{format:'mp3',bitrateKbps:128}}}}};if(variant==='invalidate')batch.invalidateTest(a.entry.id);if(variant==='file')next={...a,entry:{...a.entry,file:new File(['changed'],a.entry.file.name)}};batch.start([next]);await tick();assert.equal(calls.length,2,variant);finish(1);await tick();batch.dispose();}
});
test('retry of a cancelled test retains eligibility and unrelated file edits preserve it',async()=>{
 const {batch,calls,finish}=harness();const a=spec(),b=spec();batch.start([a],'test');await tick();batch.cancel(a.entry.id);calls[0].reject(new DOMException('Cancelled','AbortError'));await tick();batch.retry(a.entry.id);await tick();finish(1);await tick();batch.invalidateTest(b.entry.id);batch.start([a,b]);await tick();assert.equal(calls.length,3);assert.equal(calls[2].job.entry.id,b.entry.id);finish(2);await tick();batch.dispose();
});
test('device metadata preserves numeric progress, survives completion/reuse and resets on retry',async()=>{
 const {batch,calls,finish}=harness();const item=spec('device.wav',[newStep('isolation')]);batch.start([item],'test');await tick();const id=item.entry.id;
 calls[0].phase({kind:'isolation-progress',completed:2,total:5});calls[0].phase({kind:'isolation-device',device:'gpu'});assert.deepEqual(batch.snapshot.jobs.get(id).state.operation,{kind:'isolation-progress',completed:2,total:5});assert.equal(batch.snapshot.jobs.get(id).device,'gpu');
 calls[0].phase({kind:'isolation-device',device:'cpu-fallback'});finish(0);await tick();assert.equal(batch.snapshot.jobs.get(id).device,'cpu-fallback');batch.start([item]);assert.equal(calls.length,1);assert.equal(batch.snapshot.jobs.get(id).device,'cpu-fallback');
 batch.start([item]);await tick();assert.equal(batch.snapshot.jobs.get(id).device,null);calls[1].phase({kind:'isolation-device',device:'cpu'});batch.cancel(id);calls[1].phase({kind:'isolation-device',device:'gpu'});assert.equal(batch.snapshot.jobs.get(id).device,'cpu');finish(1);await tick();batch.retry(id);await tick();assert.equal(batch.snapshot.jobs.get(id).device,null);finish(2);await tick();batch.dispose();
});
