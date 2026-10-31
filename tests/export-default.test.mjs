import test from 'node:test';
import assert from 'node:assert/strict';
import {automaticExport} from '../src/export-default.ts';
import {newRecipe,newStep,newExport} from '../src/recipe.ts';
import {createFileId} from '../src/media.ts';
function entry({video=true,codec='aac',kind='ready'}={}) {
 return {id:createFileId(),file:new File(['fixture'],'source.mp4'),inspection:kind==='ready'?{kind,metadata:{container:'test',codec,duration:10,startTime:0,sampleRate:48000,channels:2,hasVideo:video,presentation:null}}:{kind}};
}
test('automatic stream copy requires a completely inspected eligible video-only batch',()=>{
 const draft=newRecipe(), video=entry();
 assert.equal(automaticExport(draft,[video]).format,'original');
 assert.equal(automaticExport(draft,[video,entry()]).format,'original');
 for(const files of [[],[entry({video:false})],[video,entry({video:false})],[video,entry({kind:'reading'})],[entry({codec:'ac3'})]])assert.equal(automaticExport(draft,files).format,'mp3');
 assert.deepEqual(draft,newRecipe());
});
test('automatic stream copy respects effects and precise trims',()=>{
 const video=entry(), trim=newStep('trim');
 const draft={...newRecipe(),steps:[trim]};
 assert.equal(automaticExport(draft,[video]).format,'original');
 assert.equal(automaticExport({...draft,steps:[{...trim,range:{start:.00001,end:null}}]},[video]).format,'mp3');
 assert.equal(automaticExport({...draft,steps:[newStep('normalize')]},[video]).format,'mp3');
 assert.equal(automaticExport({...draft,export:newExport('original'),steps:[newStep('normalize')]},[video]).format,'mp3');
});
