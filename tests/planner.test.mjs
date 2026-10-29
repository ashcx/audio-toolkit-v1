import test from 'node:test';
import assert from 'node:assert/strict';
import {newRecipe,newExport,newStep,recipeSchema,snapshotForFile} from '../src/recipe.ts';
import {createFileId} from '../src/media.ts';
import {compilePlan} from '../src/planner.ts';
function plan(codec='aac',steps=[],format='original',duration=2){
 const metadata={container:'test',codec,duration,startTime:0,sampleRate:48000,channels:2,hasVideo:true};
 const entry={id:createFileId(),file:new File(['data'],'source.mp4'),inspection:{kind:'ready',metadata}};
 const recipe=recipeSchema.parse({...newRecipe(),steps,export:newExport(format)});
 const effective=snapshotForFile(recipe,entry);assert.equal(effective.kind,'ready');return compilePlan(effective.snapshot,metadata);
}
test('original audio resolves valid audio-only containers per codec; unsupported never transcodes',()=>{
 for(const [codec,container] of [['aac','m4a'],['mp3','mp3'],['opus','ogg'],['vorbis','ogg'],['flac','flac'],['pcm-s16','wav']]){const p=plan(codec);assert.equal(p.kind,'copy');assert.equal(p.target.container,container);}
 assert.equal(plan('ac3').kind,'failed');
});
test('only real no-ops disappear and original audio rejects every signal change',()=>{
 const trim={...newStep('trim'),range:{start:0,end:99}};
 const noop=[trim,newStep('gain'),{...newStep('channels'),channels:'stereo'},{...newStep('resample'),rateHz:48000}];
 assert.equal(plan('aac',noop).kind,'copy');
 assert.equal(plan('aac',[{...trim,range:{start:0,end:null}}],'original',null).kind,'copy');
 for(const step of [{...newStep('trim'),range:{start:0.00001,end:null}},{...newStep('gain'),db:0.001},newStep('normalize'),{...newStep('channels'),channels:'mono'},{...newStep('resample'),rateHz:44100},newStep('isolation')]){const p=plan('aac',[step]);assert.equal(p.kind,'failed');assert.match(p.message,/re-encoding/);}
});
test('PCM plan preserves processor order and export intent without freezing mutable drafts',()=>{
 const steps=[newStep('normalize'),{...newStep('trim'),range:{start:.25,end:1}},newStep('normalize'),newStep('gain')];
 const p=plan('aac',steps,'mp3');assert.equal(p.kind,'pcm');assert.deepEqual(p.steps.map(s=>s.kind),['normalize','trim','normalize']);assert.equal(p.snapshot.recipe.export.format,'mp3');assert(Object.isFrozen(p.steps));
 steps[0].targetDbfs=-6;assert.equal(p.steps[0].targetDbfs,-1);
 assert.equal(plan('aac',[],'wav').kind,'pcm');
});
test('a return to the source channel count or rate still runs after an earlier change',()=>{
 const steps=[{...newStep('channels'),channels:'mono'},{...newStep('channels'),channels:'stereo'},{...newStep('resample'),rateHz:44100},{...newStep('resample'),rateHz:48000}];
 const p=plan('aac',steps,'wav');assert.equal(p.kind,'pcm');assert.deepEqual(p.steps.map(s=>s.id),steps.map(s=>s.id));
});
test('copy filenames avoid collisions even when codec extensions converge',async()=>{
 const {outputName}=await import('../src/planner.ts');const p=plan('opus');const used=new Set();
 assert.equal(outputName('tone.opus',p.target.container,used),'tone.audio.ogg');assert.equal(outputName('tone.ogg',p.target.container,used),'tone.audio (2).ogg');assert.equal(outputName('tone.opus',p.target.container,used),'tone.audio (3).ogg');
});
test('known oversized WAVs fail before processing and trim/rate/channel changes can recover',()=>{
 assert.equal(plan('pcm-s16',[],'wav',30000).kind,'failed');
 assert.equal(plan('pcm-s16',[{...newStep('trim'),range:{start:0,end:2}}],'wav',30000).kind,'pcm');
 assert.equal(plan('pcm-s16',[{...newStep('resample'),rateHz:16000}],'wav',30000).kind,'pcm');
 assert.equal(plan('pcm-s16',[{...newStep('channels'),channels:'mono'}],'wav',30000).kind,'pcm');
});
test('WAV byte guard prevents RIFF wrap at the actual PCM16 mono and stereo boundaries',async()=>{
 const {wavSizeError}=await import('../src/export-format.ts');
 assert.equal(wavSizeError(1073740799,2),null);assert.match(wavSizeError(1073740800,2),/4 GB/);
 assert.equal(wavSizeError(2147481599,1),null);assert.match(wavSizeError(2147481600,1),/4 GB/);
});
