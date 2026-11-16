import test from 'node:test';
import assert from 'node:assert/strict';
import {carryPosition,retarget,shownView,viewsOf} from '../src/view-position.ts';
const carry=(from,to,time,trimStart=0,resultDuration=20)=>carryPosition({from,to,time,trimStart,resultDuration});
test('with no trim both views share one timeline',()=>{
 assert.equal(carry('original','result',10),10);
 assert.equal(carry('result','original',10),10);
 assert.equal(carry('original','original',4),4);
 assert.equal(carry('result','result',4),4);
});
test('original to result subtracts the trim start and result to original adds it back',()=>{
 assert.equal(carry('original','result',12,5),7);
 assert.equal(carry('result','original',7,5),12);
 assert.equal(carry('original','result',carry('result','original',3.25,5),5),3.25);
});
test('a moment before the kept range lands at the start of the result',()=>{
 assert.equal(carry('original','result',2,5),0);
 assert.equal(carry('original','result',5,5),0);
});
test('a moment past the end of the result stops at its end',()=>{
 assert.equal(carry('original','result',40,5,16),16);
 assert.equal(carry('original','result',21,5,16),16);
 assert.equal(carry('original','result',40,5,Infinity),35);
});
test('a zero-length result always maps to zero',()=>{
 assert.equal(carry('original','result',7,0,0),0);
 assert.equal(carry('original','result',7,5,0),0);
});
test('the views a file can play are listed in switch order',()=>{
 assert.deepEqual(viewsOf({original:true,result:true}),['original','result']);
 assert.deepEqual(viewsOf({original:true,result:false}),['original']);
 assert.deepEqual(viewsOf({original:false,result:true}),['result']);
 assert.deepEqual(viewsOf({original:false,result:false}),[]);
});
test('a finished file opens on the result and editing needs the original',()=>{
 const both=['original','result'];
 assert.equal(shownView(both,null,false),'result');
 assert.equal(shownView(both,'original',false),'original');
 assert.equal(shownView(both,'result',true),'original');
 assert.equal(shownView(['original'],'result',false),'original');
 assert.equal(shownView(['result'],'original',true),'result');
 assert.equal(shownView([],'result',false),null);
});
const at=(view,time,play=true)=>({view,time,play});
test('retargeting to the view already shown keeps the same moment',()=>{
 const moment=at('original',12);
 assert.equal(retarget(moment,'original',5,10),moment);
});
test('retargeting maps the pending moment through the trim and keeps the play state',()=>{
 assert.deepEqual(retarget(at('original',12,true),'result',5,10),at('result',7,true));
 assert.deepEqual(retarget(at('result',7,false),'original',5,10),at('original',12,false));
});
test('a chain of retargets before anything loads ends where a single switch would',()=>{
 const chain=(count,start)=>{let moment=start,view=start.view;for(let index=0;index<count;index++){view=view==='original'?'result':'original';moment=retarget(moment,view,5,10);}return moment;};
 assert.deepEqual(chain(2,at('original',12)),at('original',12));
 assert.deepEqual(chain(3,at('original',12)),at('result',7));
 assert.deepEqual(chain(11,at('original',12,false)),at('result',7,false));
 assert.deepEqual(chain(4,at('original',12)),at('original',12));
});
test('retargeting clamps at the ends of the result like a single switch',()=>{
 assert.deepEqual(retarget(at('original',40),'result',5,10),at('result',10,true));
 assert.deepEqual(retarget(at('original',2),'result',5,10),at('result',0,true));
});
