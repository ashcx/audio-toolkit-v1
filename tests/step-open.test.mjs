import test from 'node:test';
import assert from 'node:assert/strict';
import {isStepOpen} from '../src/step-open.ts';
const pick=(id,open,problem=false)=>({id,open,by:'user',problem});
const added=id=>({id,open:true,by:'added',problem:false});
test('on a wide screen only the last picked or added step is open',()=>{
 assert.equal(isStepOpen(null,'a',false,false),false);
 assert.equal(isStepOpen(added('a'),'a',false,false),true);
 assert.equal(isStepOpen(added('a'),'b',false,false),false);
 assert.equal(isStepOpen(pick('b',true),'a',false,false),false);
 assert.equal(isStepOpen(pick('a',false),'a',false,false),false);
});
test('on a wide screen a validation error does not open a step by itself',()=>{
 assert.equal(isStepOpen(null,'a',true,false),false);
});
test('on mobile nothing is open by default, a newly added step included',()=>{
 assert.equal(isStepOpen(null,'a',false,true),false);
 assert.equal(isStepOpen(added('a'),'a',false,true),false);
});
test('on mobile a step the user opened is open and the others stay closed',()=>{
 assert.equal(isStepOpen(pick('a',true),'a',false,true),true);
 assert.equal(isStepOpen(pick('a',true),'b',false,true),false);
});
test('on mobile a step with a validation error is open until the user closes it',()=>{
 assert.equal(isStepOpen(null,'a',true,true),true);
 assert.equal(isStepOpen(pick('a',false,true),'a',true,true),false);
});
test('on mobile a step the user closed opens when an error appears and closes again when it clears',()=>{
 assert.equal(isStepOpen(pick('a',false,false),'a',true,true),true);
 assert.equal(isStepOpen(pick('a',false,true),'a',false,true),false);
});
test('on mobile fixing an error in an open step does not close it',()=>{
 assert.equal(isStepOpen(pick('a',true,true),'a',false,true),true);
 assert.equal(isStepOpen(pick('a',true,false),'a',true,true),true);
});
test('moving between mobile and wide keeps what the user picked and drops what was only a default',()=>{
 assert.equal(isStepOpen(pick('a',true),'a',false,false),true);
 assert.equal(isStepOpen(pick('a',true),'a',false,true),true);
 assert.equal(isStepOpen(added('a'),'a',false,false),true);
 assert.equal(isStepOpen(added('a'),'a',false,true),false);
});
