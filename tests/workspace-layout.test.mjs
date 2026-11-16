import test from 'node:test';
import assert from 'node:assert/strict';
import {fileMetadata,showsPreview,exportStatus} from '../src/file-summary.ts';
import {createFileId} from '../src/media.ts';
function entry(duration=167){return {id:createFileId(),file:new File(['fixture'],'tone.wav'),inspection:{kind:'ready',metadata:{container:'wav',codec:'pcm-s16',duration,startTime:0,sampleRate:48000,channels:2,hasVideo:false,presentation:null}}};}
test('an untrimmed file has no metadata beyond the live position',()=>{
 assert.deepEqual(fileMetadata(entry(),null),{});
 assert.deepEqual(fileMetadata(entry(),{start:0,end:167,duration:167}),{});
 assert.deepEqual(fileMetadata(entry(),{start:0,end:null,duration:null}),{});
});
test('a changed Trim all range reports that the file is trimmed and the kept length, not the range',()=>{
 assert.deepEqual(fileMetadata(entry(),{start:0,end:120,duration:120}),{trimmed:true,kept:'02:00'});
 assert.deepEqual(fileMetadata(entry(),{start:10,end:130,duration:120}),{trimmed:true,kept:'02:00'});
 assert.deepEqual(fileMetadata(entry(),{start:0,end:null,duration:null}),{});
});
test('Preview is shown only for a non-empty recipe without a current export',()=>{
 assert.equal(showsPreview(false,false),false);
 assert.equal(showsPreview(false,true),false);
 assert.equal(showsPreview(true,false),true);
 assert.equal(showsPreview(true,true),false);
});
test('export status names the running file out of the total and is silent otherwise',()=>{
 assert.equal(exportStatus([]),'');
 assert.equal(exportStatus([{state:{kind:'done'}}]),'');
 assert.equal(exportStatus([{state:{kind:'running'}},{state:{kind:'waiting'}}]),'Exporting 1 of 2');
 assert.equal(exportStatus([{state:{kind:'done'}},{state:{kind:'running'}}]),'Exporting 2 of 2');
 assert.equal(exportStatus([{state:{kind:'done'}},{state:{kind:'failed'}}]),'');
 assert.equal(exportStatus([{state:{kind:'cancelled'}},{state:{kind:'cancelling'}}]),'Exporting 2 of 2');
});
