import test from 'node:test';
import assert from 'node:assert/strict';
import {Batch,batchConcurrency} from '../src/batch.ts';
import {isAppleMobile} from '../src/platform.ts';
import {newRecipe,newExport,newStep,recipeSchema,snapshotForFile} from '../src/recipe.ts';
import {createFileId} from '../src/media.ts';
import {compilePlan} from '../src/planner.ts';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function spec(name='tone.wav',steps=[],duration=2){
 const metadata={container:'wav',codec:'pcm-s16',duration,startTime:0,sampleRate:48000,channels:2,hasVideo:false};
 const entry={id:createFileId(),file:new File(['data'],name),inspection:{kind:'ready',metadata}};
 const snapshot=snapshotForFile(recipeSchema.parse({...newRecipe(),steps,export:newExport('wav')}),entry);
 return {entry,plan:compilePlan(snapshot.snapshot,metadata)};
}
function harness(slots=1){
 const calls=[],released=[];
 const batch=new Batch((job,signal,phase,lease)=>{const deferred=Promise.withResolvers();calls.push({job,signal,phase,lease,...deferred});return deferred.promise;},slots);
 function finish(index){const call=calls[index];call.resolve({report:{kind:'copy'},output:{name:call.job.name,mime:'audio/wav',file:new File(['bytes'],call.job.name),release:async()=>{released.push(index);}}});}
 return {batch,calls,released,finish};
}
test('capability policy never assumes memory, keeps Apple mobile at one and caps parallel work at two',()=>{
 const base={threads:8,memory:8,workers:true,storage:true,appleMobile:false};
 for(const memory of [undefined,0,4,6,'8'])assert.equal(batchConcurrency({...base,memory}),1);
 assert.equal(batchConcurrency(base),2);assert.equal(batchConcurrency({...base,memory:16,threads:32}),2);
 assert.equal(batchConcurrency({...base,threads:4}),2);assert.equal(batchConcurrency({...base,threads:3}),1);
 assert.equal(batchConcurrency({...base,appleMobile:true}),1);assert.equal(batchConcurrency({...base,workers:false}),1);assert.equal(batchConcurrency({...base,storage:false}),1);
});
test('Apple mobile is recognised on iPhone, iPad and iPadOS reporting as a Mac, and not on a desktop Mac',()=>{
 assert.equal(isAppleMobile({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'}),true);
 assert.equal(isAppleMobile({userAgent:'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)'}),true);
 assert.equal(isAppleMobile({userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',platform:'MacIntel',maxTouchPoints:5}),true);
 assert.equal(isAppleMobile({userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',platform:'MacIntel',maxTouchPoints:0}),false);
 assert.equal(isAppleMobile({userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',platform:'Win32',maxTouchPoints:10}),false);
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

test('tracks run in order of appearance, with noise removal after the rest and music splitting last',async()=>{
 const {batch,calls,finish}=harness(1);
 const iso=spec('iso.wav',[newStep('isolation')],10),speech1=spec('s1.wav',[newStep('speech')],10),plain1=spec('p1.wav',[],300),speech2=spec('s2.wav',[newStep('speech')],10),plain2=spec('p2.wav',[],5),iso2=spec('iso2.wav',[newStep('isolation')],10);
 batch.start([iso,speech1,plain1,speech2,plain2,iso2]);await tick();const order=[];
 for(let i=0;i<6;i++){order.push(calls[i].job.entry.id);finish(i);await tick();}
 assert.deepEqual(order,[plain1,plain2,speech1,speech2,iso,iso2].map(item=>item.entry.id));batch.dispose();
});
test('music splitting waits for every other track to finish and then runs alone',async()=>{
 const {batch,calls,finish}=harness(2);const a=spec('a.wav'),b=spec('b.wav'),c=spec('c.wav'),iso=spec('iso.wav',[newStep('isolation')]),iso2=spec('iso2.wav',[newStep('isolation')]);
 batch.start([iso,a,b,c,iso2]);await tick();assert.deepEqual(calls.map(call=>call.job.entry.id),[a.entry.id,b.entry.id]);
 finish(0);await tick();assert.deepEqual(calls.map(call=>call.job.entry.id),[a.entry.id,b.entry.id,c.entry.id]);
 finish(1);await tick();assert.equal(calls.length,3);finish(2);await tick();assert.equal(calls.length,4);assert.equal(calls[3].job.entry.id,iso.entry.id);
 batch.cancel(iso.entry.id);assert.equal(calls.length,4);finish(3);await tick();assert.equal(calls.length,5);assert.equal(calls[4].job.entry.id,iso2.entry.id);finish(4);await tick();batch.dispose();
});
test('noise removal runs two at a time, but other tracks go first and fill the slots',async()=>{
 const {batch,calls,finish}=harness(2);const s1=spec('s1.wav',[newStep('speech')]),s2=spec('s2.wav',[newStep('speech')]),s3=spec('s3.wav',[newStep('speech')]),p=spec('p.wav');
 batch.start([s1,s2,p,s3]);await tick();assert.deepEqual(calls.map(call=>call.job.entry.id),[p.entry.id,s1.entry.id]);
 finish(0);await tick();assert.equal(calls[2].job.entry.id,s2.entry.id);finish(1);await tick();assert.equal(calls[3].job.entry.id,s3.entry.id);finish(2);finish(3);await tick();batch.dispose();
});
test('a running job shows its latest progress and ignores progress after cancel, and a retry starts clean',async()=>{
 const {batch,calls,finish}=harness();const item=spec('progress.wav',[newStep('isolation')]);batch.start([item]);await tick();const id=item.entry.id;
 calls[0].phase({kind:'model-download',loaded:10,total:85});calls[0].phase({kind:'isolation-progress',completed:2,total:5});
 assert.deepEqual(batch.snapshot.jobs.get(id).state.operation,{kind:'isolation-progress',completed:2,total:5});
 finish(0);await tick();assert.equal(batch.snapshot.jobs.get(id).state.kind,'done');
 batch.start([item]);await tick();assert.equal(calls.length,2);assert.deepEqual(batch.snapshot.jobs.get(id).state.operation,{kind:'phase',phase:'Preparing'});
 calls[1].phase({kind:'isolation-progress',completed:1,total:5});batch.cancel(id);calls[1].phase({kind:'isolation-progress',completed:4,total:5});
 assert.equal(batch.snapshot.jobs.get(id).state.kind,'cancelling');finish(1);await tick();assert.equal(batch.snapshot.jobs.get(id).state.kind,'cancelled');
 batch.retry(id);await tick();assert.equal(calls.length,3);assert.deepEqual(batch.snapshot.jobs.get(id).state.operation,{kind:'phase',phase:'Preparing'});finish(2);await tick();batch.dispose();
});
test('Export always processes requested current specs and releases the prior result',async()=>{
 const {batch,calls,released,finish}=harness();const item=spec();batch.start([item]);await tick();finish(0);await tick();batch.start([item]);await tick();assert.equal(calls.length,2);assert.equal(released.length,1);finish(1);await tick();batch.dispose();
});

test('a loaded model is kept only while isolation work is still queued',async()=>{
 const {batch,calls,finish}=harness(1);const a=spec('a.wav',[newStep('isolation')]),b=spec('b.wav',[newStep('isolation')]),c=spec('c.wav');
 batch.start([a,b,c]);await tick();assert.equal(calls[0].job.entry.id,c.entry.id);finish(0);await tick();assert.equal(calls[1].job.entry.id,a.entry.id);assert.equal(calls[1].lease.keepModels(),true);finish(1);await tick();assert.equal(calls[2].job.entry.id,b.entry.id);assert.equal(calls[2].lease.keepModels(),false);
 finish(2);await tick();batch.dispose();
});
test('cancelling the last queued isolation job stops keeping the model',async()=>{
 const {batch,calls,finish}=harness(1);const a=spec('a.wav',[newStep('isolation')]),b=spec('b.wav',[newStep('isolation')]);
 batch.start([a,b]);await tick();assert.equal(calls[0].lease.keepModels(),true);batch.cancel(b.entry.id);assert.equal(calls[0].lease.keepModels(),false);finish(0);await tick();batch.dispose();
});
