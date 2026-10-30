import test from 'node:test';import assert from 'node:assert/strict';import {createOutputStore} from '../src/output-store.ts';import {CleanupFailure} from '../src/cleanup.ts';
test('failed writer creation retains a failed removal for explicit cleanup retry',async()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'navigator');let fail=true,removed=0;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{storage:{getDirectory:async()=>({getDirectoryHandle:async()=>({getFileHandle:async()=>({createWritable:async()=>{throw Error('open failed');}}),removeEntry:async()=>{if(fail)throw Error('busy');removed++;}})})}}});
 try{let failure;try{await createOutputStore('x.zip','application/zip');}catch(error){failure=error;}assert(failure instanceof CleanupFailure);assert.equal(removed,0);fail=false;await failure.recover();assert.equal(removed,1);}finally{if(original)Object.defineProperty(globalThis,'navigator',original);else delete globalThis.navigator;}
});
