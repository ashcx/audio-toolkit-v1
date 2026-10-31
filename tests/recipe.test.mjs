import test from 'node:test';
import assert from 'node:assert/strict';
import {newRecipe,newStep,newExport,recipeSchema,snapshotForFile,moveStep} from '../src/recipe.ts';
import {createFileId} from '../src/media.ts';
function file(duration=2){return {id:createFileId(),file:new File(['fixture'],'same.wav'),inspection:{kind:'ready',metadata:{duration,startTime:0,codec:'pcm-s16',container:'WAVE',sampleRate:48000,channels:2,hasVideo:false}}};}
function trimmed(start=null,end=null){const recipe=newRecipe();recipe.steps=[{...newStep('trim'),range:{start,end}}];return recipe;}
test('ordered serializable recipes preserve repeatable stages and separate terminal export',()=>{
 const draft=newRecipe();draft.steps=[newStep('normalize'),newStep('gain'),newStep('normalize')];
 const parsed=recipeSchema.parse(JSON.parse(JSON.stringify(draft)));
 assert.deepEqual(parsed.steps.map(s=>s.kind),['normalize','gain','normalize']);
 assert.equal(parsed.export.format,'mp3');
 const moved=moveStep(draft,2,0);assert.deepEqual(moved.steps.map(s=>s.id),[draft.steps[2].id,draft.steps[0].id,draft.steps[1].id]);
 assert.equal(recipeSchema.safeParse({...draft,version:2}).success,false);
 assert.equal(recipeSchema.safeParse({...draft,branches:[]}).success,false);
});
test('invalid ranges, duplicate singleton steps and invalid encoding settings cannot become execution recipes',()=>{
 for(const [start,end] of [[-1,null],[Number.NaN,null],[0,0],[null,0],[2,1],[Infinity,null]])assert.equal(recipeSchema.safeParse(trimmed(start,end)).success,false,`${start}/${end}`);
 for(const kind of ['trim','isolation']){const draft=newRecipe();draft.steps=[newStep(kind),newStep(kind)];assert.equal(recipeSchema.safeParse(draft).success,false);}
 const gain=newRecipe();gain.steps=[{...newStep('gain'),db:13}];assert.equal(recipeSchema.safeParse(gain).success,false);
 const duplicate=newRecipe();const step=newStep('gain');duplicate.steps=[step,step];assert.equal(recipeSchema.safeParse(duplicate).success,false);
 assert.equal(recipeSchema.safeParse({...newRecipe(),export:{format:'m4a',bitrateKbps:320}}).success,false);
 for(const format of ['original','mp3','m4a','wav','flac','opus'])assert(recipeSchema.safeParse({...newRecipe(),export:newExport(format)}).success);
});
test('shared trim clamps per file and does not mutate the shared recipe',()=>{
 const draft=trimmed(0.5,9);const recipe=recipeSchema.parse(draft);const a=file(2),b=file(4);
 const first=snapshotForFile(recipe,a);const second=snapshotForFile(recipe,b);
 assert.equal(first.kind,'ready');assert.equal(second.kind,'ready');
 assert.deepEqual(first.snapshot.trim,{start:0.5,end:2,duration:1.5});
 assert.deepEqual(second.snapshot.trim,{start:0.5,end:4,duration:3.5});
 assert.equal(recipe.steps[0].range.end,9);
 draft.steps[0].range.start=1.5;assert.equal(first.snapshot.trim.start,0.5);
 assert.throws(()=>{first.snapshot.recipe.steps[0].range.start=0;},TypeError);
 assert.throws(()=>{first.snapshot.recipe.export.format='wav';},TypeError);
});
test('one invalid file range stays isolated and unknown duration keeps the open end',()=>{
 const recipe=recipeSchema.parse(trimmed(3,null));const a=file(2),b=file(5);
 assert.equal(snapshotForFile(recipe,a).kind,'failed');
 const valid=snapshotForFile(recipe,b);assert.equal(valid.kind,'ready');assert.equal(valid.snapshot.trim.end,5);
 const unknown=snapshotForFile(recipe,file(null));assert.equal(unknown.kind,'ready');assert.equal(unknown.snapshot.trim.end,null);
});

test('voice isolation has one bounded model selection per recipe', () => {
 const first = newStep('speech'), second = newStep('speech');
 assert.equal(recipeSchema.safeParse({ ...newRecipe(), steps: [first] }).success, true);
 assert.equal(recipeSchema.safeParse({ ...newRecipe(), steps: [first, second] }).success, false);
});
