import test from 'node:test';
import assert from 'node:assert/strict';
import {fileMetadata,showsPreview,exportStatus} from '../src/file-summary.ts';
import {createFileId} from '../src/media.ts';
function entry(duration=167){return {id:createFileId(),file:new File(['fixture'],'tone.wav'),inspection:{kind:'ready',metadata:{container:'wav',codec:'pcm-s16',duration,startTime:0,sampleRate:48000,channels:2,hasVideo:false,presentation:null}}};}
test('ordinary file metadata shows only the filename duration',()=>{
 assert.deepEqual(fileMetadata(entry(),null),{primary:'02:47'});
 assert.deepEqual(fileMetadata(entry(),{start:0,end:167,duration:167}),{primary:'02:47'});
 assert.deepEqual(fileMetadata(entry(),{start:0,end:null,duration:null}),{primary:'02:47'});
});
test('a changed Trim all range shows kept duration and source range in one line',()=>{
 assert.deepEqual(fileMetadata(entry(),{start:0,end:120,duration:120}),{primary:'02:00',secondary:'00:00 to 02:00'});
 assert.deepEqual(fileMetadata(entry(),{start:10,end:130,duration:120}),{primary:'02:00',secondary:'00:10 to 02:10'});
 assert.deepEqual(fileMetadata(entry(),{start:0,end:null,duration:null}),{primary:'02:47'});
});
test('Preview is shown only for a non-empty recipe without a current export',()=>{
 assert.equal(showsPreview(false,false),false);
 assert.equal(showsPreview(false,true),false);
 assert.equal(showsPreview(true,false),true);
 assert.equal(showsPreview(true,true),false);
});
test('export status reports processing and done as completed over total',()=>{
 assert.equal(exportStatus([]),'');
 assert.equal(exportStatus([{state:{kind:'done'}}]),'1/1 done');
 assert.equal(exportStatus([{state:{kind:'running'}},{state:{kind:'waiting'}}]),'2/2 processing');
 assert.equal(exportStatus([{state:{kind:'done'}},{state:{kind:'running'}}]),'1/2 processing · 1/2 done');
 assert.equal(exportStatus([{state:{kind:'done'}},{state:{kind:'failed'}}]),'1/2 done · 1/2 failed');
 assert.equal(exportStatus([{state:{kind:'cancelled'}}]),'1/1 cancelled');
});
