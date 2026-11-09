import test from 'node:test';
import assert from 'node:assert/strict';
import {newRecipe,newExport,newStep,recipeSchema,snapshotForFile} from '../src/recipe.ts';
import {createFileId} from '../src/media.ts';
import {compilePlan} from '../src/planner.ts';
function plan(codec='aac',steps=[],format='original',duration=2,sampleRate=48000){
 const metadata={container:'test',codec,duration,startTime:0,sampleRate,channels:2,hasVideo:true};
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
 const noop=[trim,newStep('gain'),newStep('compress'),{...newStep('channels'),channels:'stereo'},{...newStep('resample'),rateHz:48000}];
 assert.equal(plan('aac',noop).kind,'copy');
 assert.equal(plan('aac',[{...trim,range:{start:0,end:null}}],'original',null).kind,'copy');
 for(const step of [{...newStep('trim'),range:{start:0.00001,end:null}},{...newStep('gain'),db:0.001},newStep('normalize'),{...newStep('compress'),enabled:true},{...newStep('channels'),channels:'mono'},{...newStep('resample'),rateHz:44100},newStep('isolation')]){const p=plan('aac',[step]);assert.equal(p.kind,'failed');assert.equal(p.code,'copy-unsupported');assert.match(p.message,/needs a format other than Keep original\. Choose another format\.$/);}
 assert.equal(plan('aac',[{...newStep('gain'),db:3}]).message,'Gain needs a format other than Keep original. Choose another format.');
});
test('PCM plan preserves processor order and export intent without freezing mutable drafts',()=>{
 const steps=[newStep('normalize'),{...newStep('trim'),range:{start:.25,end:1}},newStep('normalize'),newStep('gain')];
 const p=plan('aac',steps,'mp3');assert.equal(p.kind,'pcm');assert.deepEqual(p.steps.map(s=>s.kind),['normalize','trim','normalize']);assert.equal(p.snapshot.recipe.export.format,'mp3');assert(Object.isFrozen(p.steps));
 steps[0].targetLufs=-9;assert.equal(p.steps[0].targetLufs,-14);
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
 assert.equal(wavSizeError(1073740799,2),null);assert.equal(wavSizeError(1073740800,2),'wav-too-large');
 assert.equal(wavSizeError(2147481599,1),null);assert.equal(wavSizeError(2147481600,1),'wav-too-large');
});
test('download names are safe, Unicode bounded and unique against mixed-case retained outputs',async()=>{
 const {outputName}=await import('../src/planner.ts');const used=new Set(['TONE.audio.wav']);
 assert.equal(outputName('TONE.wav','wav',used),'TONE.audio (2).wav');
 for(const source of ['../a\\b?.wav','CON.wav','...','😀'.repeat(200)+'.wav','e\u0301.wav','é.wav']){const name=outputName(source,'wav',used);assert(!/[<>:"/\\|?*\x00-\x1f]/.test(name));assert(!/^\./.test(name));assert(new TextEncoder().encode(name).length<255);assert(!/^CON\./i.test(name));}
 assert.equal(used.size,8);
});

test('Opus export plans for every source rate without asking for a sample rate step',()=>{
 for(const rate of [8000,11025,16000,22050,32000,44100,48000,88200,96000]){
  const p=plan('pcm-s16',[],'opus',2,rate);assert.equal(p.kind,'pcm',`${rate} Hz`);assert.deepEqual(p.steps,[]);
 }
 const unknown=plan('pcm-s16',[],'opus',2,null);assert.equal(unknown.kind,'pcm');
 const own=[{...newStep('resample'),rateHz:44100}];
 const withStep=plan('pcm-s16',own,'opus',2,48000);assert.equal(withStep.kind,'pcm');assert.deepEqual(withStep.steps.map(s=>s.id),own.map(s=>s.id));
});
test('MP3 and AAC keep their bitrate limits as plain messages',()=>{
 const run=(sampleRate,channels,format,bitrateKbps)=>{
  const metadata={container:'test',codec:'pcm-s16',duration:2,startTime:0,sampleRate,channels,hasVideo:false};
  const entry={id:createFileId(),file:new File(['data'],'source.wav'),inspection:{kind:'ready',metadata}};
  const recipe=recipeSchema.parse({...newRecipe(),steps:[],export:{format,mode:format==='mp3'?'cbr':'vbr',bitrateKbps}});
  const effective=snapshotForFile(recipe,entry);assert.equal(effective.kind,'ready');
  return compilePlan(effective.snapshot,metadata);
 };
 const mp3=run(22050,2,'mp3',192);assert.equal(mp3.kind,'failed');assert.equal(mp3.code,'mp3-bitrate');
 assert.equal(mp3.message,'MP3 at this sample rate supports up to 160 kbps. Lower the bitrate.');
 assert.equal(run(22050,2,'mp3',128).kind,'pcm');
 const aac=run(16000,1,'m4a',192);assert.equal(aac.kind,'failed');assert.equal(aac.code,'aac-bitrate');
 assert.equal(aac.message,'This bitrate is too high for this audio. Lower the bitrate.');
 assert.equal(run(16000,1,'m4a',128).kind,'failed');assert.equal(run(48000,2,'m4a',256).kind,'pcm');
});
test('a plan that cannot be exported says so in the catalogue wording',()=>{
 const wav=plan('pcm-s16',[],'wav',30000);assert.equal(wav.code,'wav-too-large');assert.equal(wav.message,"WAV files can't be larger than 4 GB. Choose another format or trim the audio.");
 const unknown=plan('ac3');assert.equal(unknown.code,'copy-unsupported');assert.equal(unknown.message,"This file can't be kept as it is. Choose another format.");
});
