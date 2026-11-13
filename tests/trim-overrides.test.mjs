import test from 'node:test';
import assert from 'node:assert/strict';
import {newRecipe,newStep,newExport,recipeSchema,snapshotForFile} from '../src/recipe.ts';
import {createFileId} from '../src/media.ts';
import {compilePlan} from '../src/planner.ts';
import {trim as trimStage} from '../src/pcm/blocks.ts';
import {previewPlans} from '../src/preview-plan.ts';
import {fileMetadata} from '../src/file-summary.ts';
import {automaticExport} from '../src/export-default.ts';
import {setOverride,resetOverride,sharedRangeChanged} from '../src/trim-overrides.ts';
const metadata=duration=>({container:'test',codec:'pcm-s16',duration,startTime:0,sampleRate:48000,channels:2,hasVideo:false,presentation:null});
const file=(duration=10)=>({id:createFileId(),file:new File(['fixture'],'same.wav'),inspection:{kind:'ready',metadata:metadata(duration)}});
const recipe=steps=>recipeSchema.parse({...newRecipe(),steps,export:newExport('wav')});
const trimStep=(start,end)=>({...newStep('trim'),range:{start,end}});
const ready=result=>{assert.equal(result.kind,'ready');return result.snapshot;};
test('a file range replaces the Trim all range for that file only',()=>{
 const shared=recipe([trimStep(1,9)]),a=file(),b=file();
 const own=ready(snapshotForFile(shared,a,{start:2,end:4}));
 const other=ready(snapshotForFile(shared,b));
 assert.deepEqual(own.trim,{start:2,end:4,duration:2});
 assert.deepEqual(own.recipe.steps.map(step=>step.range),[{start:2,end:4}]);
 assert.deepEqual(other.trim,{start:1,end:9,duration:8});
 assert.equal(shared.steps[0].range.start,1);
});
test('with no Trim all step the file range is added first, ahead of every other step',()=>{
 const shared=recipe([newStep('gain'),newStep('normalize')]),a=file(),b=file();
 const own=ready(snapshotForFile(shared,a,{start:2,end:null}));
 assert.deepEqual(own.recipe.steps.map(step=>step.kind),['trim','gain','normalize']);
 assert.deepEqual(own.trim,{start:2,end:10,duration:8});
 assert.deepEqual(ready(snapshotForFile(shared,b)).recipe.steps.map(step=>step.kind),['gain','normalize']);
 assert.equal(ready(snapshotForFile(shared,b)).trim,null);
 assert.equal(shared.steps.length,2);
});
test('the added step is stable between calls and unique within the recipe',()=>{
 const shared=recipe([newStep('gain')]),a=file();
 const first=ready(snapshotForFile(shared,a,{start:1,end:3})),second=ready(snapshotForFile(shared,a,{start:1,end:3}));
 assert.equal(JSON.stringify(first.recipe),JSON.stringify(second.recipe));
 assert.equal(new Set(first.recipe.steps.map(step=>step.id)).size,2);
});
test('a file range past the end of that file fails with trim-past-end and spares other files',()=>{
 const shared=recipe([]),short=file(2),long=file(10);
 const failed=snapshotForFile(shared,short,{start:3,end:null});
 assert.equal(failed.kind,'failed');assert.equal(failed.code,'trim-past-end');
 assert.equal(snapshotForFile(shared,long,{start:3,end:null}).kind,'ready');
 assert.equal(snapshotForFile(shared,short,{start:null,end:null}).kind,'ready');
});
test('an override that covers the whole file adds no trim step, so the recipe and plan match the one with no override',()=>{
 const shared=recipe([newStep('gain')]),entry=file(10);
 const plain=ready(snapshotForFile(shared,entry));
 for(const whole of [{start:0,end:null},{start:null,end:null},{start:0,end:10},{start:null,end:99}]){
  const own=ready(snapshotForFile(shared,entry,whole));
  assert.equal(JSON.stringify(own.recipe),JSON.stringify(plain.recipe),JSON.stringify(whole));
  assert.equal(own.trim,null);
  assert.equal(JSON.stringify(compilePlan(own,entry.inspection.metadata)),JSON.stringify(compilePlan(plain,entry.inspection.metadata)));
 }
 assert.deepEqual(ready(snapshotForFile(shared,entry,{start:0.5,end:null})).recipe.steps.map(step=>step.kind),['trim','gain']);
 assert.deepEqual(ready(snapshotForFile(shared,entry,{start:0,end:9})).recipe.steps.map(step=>step.kind),['trim','gain']);
});
test('a whole-file override still replaces a Trim all range, since that differs from the shared range',()=>{
 const shared=recipe([trimStep(1,9)]),entry=file(10);
 for(const whole of [{start:0,end:null},{start:0,end:10}]){
  const own=ready(snapshotForFile(shared,entry,whole));
  assert.deepEqual(own.trim,{start:0,end:10,duration:10});
  assert.deepEqual(own.recipe.steps.map(step=>step.range),[{start:0,end:10}]);
 }
});
test('an override clamps its end to the file duration like the shared range does',()=>{
 assert.deepEqual(ready(snapshotForFile(recipe([]),file(5),{start:1,end:99})).trim,{start:1,end:5,duration:4});
});
test('the exported audio is cut where the file range says, ahead of later steps',async()=>{
 const rate=48000,frames=rate*4,signal=new Float32Array(frames);signal[Math.round(1.5*rate)]=1;
 const entry=file(4),own=ready(snapshotForFile(recipe([newStep('gain')]),entry,{start:1,end:3}));
 const plan=compilePlan(own,entry.inspection.metadata);
 assert.equal(plan.kind,'pcm');assert.equal(plan.steps[0].kind,'trim');
 async function* source(){for(let offset=0;offset<frames;offset+=4096)yield{planes:[signal.slice(offset,offset+4096)],rate,origin:0,offset};}
 const step=plan.steps[0];let count=0,impulse=-1;
 for await(const block of trimStage(source(),step.range.start??0,step.range.end)){const at=block.planes[0].indexOf(1);if(at>=0)impulse=count+at;count+=block.planes[0].length;}
 assert.equal(count,2*rate);
 assert.equal(impulse,Math.round(0.5*rate));
});
test('the preview and the file summary use the range that file will export',()=>{
 const entry=file(100),own=ready(snapshotForFile(recipe([trimStep(0,50)]),entry,{start:20,end:60}));
 assert.deepEqual(previewPlans(own).range,{start:20,end:35});
 assert.deepEqual(fileMetadata(entry,own.trim),{primary:'00:40',secondary:'00:20 to 01:00'});
});
test('a file range that stops stream copy is seen by the automatic export format',()=>{
 const video={...file(10),inspection:{kind:'ready',metadata:{...metadata(10),codec:'aac',hasVideo:true}}};
 const draft=newRecipe();
 assert.equal(automaticExport(draft,[video]).format,'original');
 assert.equal(automaticExport(draft,[video],new Map([[video.id,{start:1,end:null}]])).format,'mp3');
});
test('setting and resetting keep other files and never mutate the previous map',()=>{
 const [a,b]=[file(),file()],one=setOverride(new Map(),a.id,{start:1,end:2}),two=setOverride(one,b.id,{start:3,end:4});
 assert.equal(one.size,1);assert.equal(two.size,2);
 const reset=resetOverride(two,a.id);
 assert.equal(reset.has(a.id),false);assert.deepEqual(reset.get(b.id),{start:3,end:4});assert.equal(two.has(a.id),true);
 assert.equal(ready(snapshotForFile(recipe([trimStep(1,9)]),a,reset.get(a.id))).trim.start,1);
});
test('only a moved Trim all range asks about custom ranges',()=>{
 const base={...newRecipe(),steps:[trimStep(1,9)]};
 assert.equal(sharedRangeChanged(base,{...base,export:newExport('wav')}),false);
 assert.equal(sharedRangeChanged(base,{...base,steps:[trimStep(2,9)]}),true);
 assert.equal(sharedRangeChanged(base,{...base,steps:[trimStep(1,null)]}),true);
 assert.equal(sharedRangeChanged(newRecipe(),{...newRecipe(),steps:[newStep('trim')]}),false);
 assert.equal(sharedRangeChanged(base,{...base,steps:[]}),true);
 assert.equal(sharedRangeChanged({...base,steps:[trimStep(Number.NaN,9)]},{...base,steps:[trimStep(Number.NaN,9)]}),false);
});
