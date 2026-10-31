import test from 'node:test';
import assert from 'node:assert/strict';
import {previewPlans,previewExcerpt} from '../src/preview-plan.ts';
import {Preview,previewBusy} from '../src/preview.ts';
import {newRecipe,newStep,recipeSchema,snapshotForFile} from '../src/recipe.ts';
import {createFileId} from '../src/media.ts';
import {gain,trim} from '../src/pcm/blocks.ts';
const entry={id:createFileId(),file:new File(['audio'],'source.wav'),inspection:{kind:'ready',metadata:{container:'wav',codec:'pcm-s16',duration:50,startTime:2,sampleRate:10000,channels:1,hasVideo:false,presentation:null}}};
function snapshot(steps=[]){const result=snapshotForFile(recipeSchema.parse({...newRecipe(),steps}),entry);assert.equal(result.kind,'ready');return result.snapshot;}
async function collect(source){const values=[];for await(const block of source)values.push(block);return values;}
const settle=()=>new Promise(resolve=>setTimeout(resolve,0));
test('preview resolves per-file trim without reordering the recipe or changing its export',()=>{
 const snap=snapshot([newStep('normalize'),{...newStep('trim'),range:{start:2,end:40}},newStep('gain')]);
 const plans=previewPlans(snap);
 assert.deepEqual(plans.range,{start:2,end:17});assert.equal(plans.estimate,true);
 assert.deepEqual(plans.processed.steps.map(s=>s.kind),['normalize','trim','gain']);
 assert.equal(plans.processed.steps[1].range.start,2);assert.equal(plans.processed.snapshot.source.startTime,2);
 assert.deepEqual(plans.original.steps,[]);assert.equal(plans.processed.snapshot.recipe.export.format,'wav');assert.equal(snap.recipe.export.format,'mp3');
 assert.deepEqual(previewPlans(snapshot()).range,{start:0,end:15});
});
test('both excerpts retain the same source clock and stop decoding at the preview end',async()=>{
 let read=0,closed=false;
 async function* source(){try{for(let i=0;i<50;i++){read++;yield{origin:0,offset:i*100,rate:100,planes:[new Float32Array(100).fill(i/100)]};}}finally{closed=true;}}
 const original=await collect(previewExcerpt(source(),{start:20.25,end:35.25}));
 assert.equal(read,36);assert.equal(closed,true);assert.equal(original[0].offset,2025);
 assert.equal(original.reduce((sum,b)=>sum+b.planes[0].length,0),1500);
 const processed=await collect(gain(trim(previewExcerpt(source(),{start:20.25,end:35.25}),20.25,40),2));
 assert.equal(processed[0].offset,original[0].offset);assert.equal(processed[0].planes[0][0],original[0].planes[0][0]*2);
});
function fixture(run){const released=[],revoked=[];let count=0;const output=()=>{const id=++count;return{file:new File(['wav'],`${id}.wav`),name:`${id}.wav`,mime:'audio/wav',release:async()=>{released.push(id);}};};const preview=new Preview(run??(async()=>({output:output(),stats:{}})),{create:()=>`blob:${count}`,revoke:url=>revoked.push(url)});return{preview,released,revoked,output};}
test('completed preview runs original then processed and releases both URLs and files on invalidation',async()=>{
 const f=fixture();f.preview.start(entry,snapshot());assert.equal(previewBusy(f.preview.state),true);await settle();
 assert.equal(f.preview.state.kind,'ready');assert.equal(previewBusy(f.preview.state),false);
 f.preview.clear();await settle();assert.equal(f.preview.state.kind,'idle');assert.deepEqual(f.released,[1,2]);assert.deepEqual(f.revoked,['blob:1','blob:2']);
});
test('cancellation blocks a second worker and discards a late stale result',async()=>{
 let finish,calls=0;const f=fixture(async()=>{calls++;return await new Promise(resolve=>{finish=resolve;});});
 f.preview.start(entry,snapshot());await settle();f.preview.start(entry,snapshot());assert.equal(calls,1);
 f.preview.clear();assert.equal(f.preview.state.kind,'cancelling');finish({output:f.output(),stats:{}});await settle();
 assert.equal(f.preview.state.kind,'idle');assert.deepEqual(f.released,[1]);assert.equal(calls,1);assert.deepEqual(f.revoked,[]);
});
test('processed failure releases the original; cleanup failure remains retryable and blocks more work',async()=>{
 let calls=0,failCleanup=true;const f=fixture(async()=>{calls++;if(calls===2)throw new Error('Processing broke');const output=f.output();return{output:{...output,release:async()=>{if(failCleanup)throw new Error('busy');await output.release();}},stats:{}};});
 f.preview.start(entry,snapshot());await settle();assert.equal(f.preview.state.kind,'cleanup');assert.equal(previewBusy(f.preview.state),true);assert.deepEqual(f.revoked,['blob:1']);
 f.preview.start(entry,snapshot());assert.equal(calls,2);failCleanup=false;f.preview.clear();await settle();assert.equal(f.preview.state.kind,'idle');assert.deepEqual(f.released,[1]);
});
test('processed sine excerpt applies the actual gain transform to identical original samples',async()=>{
 const rate=10000;const samples=Float32Array.from({length:rate*2},(_,i)=>.2*Math.sin(2*Math.PI*440*i/rate));
 async function* source(){for(let offset=0;offset<samples.length;offset+=3072)yield{origin:0,offset,rate,planes:[samples.slice(offset,offset+3072)]};}
 const range={start:.253,end:1.517};const original=await collect(previewExcerpt(source(),range));const processed=await collect(gain(previewExcerpt(source(),range),10**(6/20)));
 assert.equal(original[0].offset,2530);assert.equal(processed[0].offset,2530);
 assert.equal(original.reduce((sum,b)=>sum+b.planes[0].length,0),12640);
 for(let b=0;b<original.length;b++)for(let i=0;i<original[b].planes[0].length;i++)assert(Math.abs(processed[b].planes[0][i]-original[b].planes[0][i]*10**(6/20))<2e-8);
});
