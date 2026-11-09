import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fetchModelBytes} from '../src/inference/demucs-model.ts';
import {userMessage} from '../src/errors.ts';

const MiB=1024*1024,model=Uint8Array.from({length:2.5*MiB},(_,index)=>(index*31+7)&255);
const pin={bytes:model.length,sha256:createHash('sha256').update(model).digest('hex')};
function serve(t,chunks,init={}){
 t.mock.method(globalThis,'fetch',async()=>new Response(new ReadableStream({start(controller){for(const chunk of chunks)controller.enqueue(chunk);controller.close();}}),{status:200,...init}));
}
const split=(bytes,size)=>Array.from({length:Math.ceil(bytes.length/size)},(_,index)=>bytes.slice(index*size,(index+1)*size));
const load=(progress=()=>{})=>fetchModelBytes('https://example.test/model.onnx',progress,pin);

test('a complete download returns the verified bytes and reports progress up to the full size',async t=>{
 serve(t,split(model,512*1024));const events=[];
 const bytes=await load((loaded,total)=>events.push([loaded,total]));
 assert.deepEqual(bytes,model);
 assert(events.length>=2,'progress is reported while downloading');
 assert(events.every(([loaded,total],index)=>total===pin.bytes&&(index===0||loaded>events[index-1][0])),'progress only grows against the pinned total');
 assert.equal(events.at(-1)[0],pin.bytes);
});
test('a download longer than the pinned size is refused before it fills memory',async t=>{
 serve(t,[model,new Uint8Array(1)]);
 await assert.rejects(load(),{code:'model-damaged'});
});
test('a truncated download is refused as incomplete',async t=>{
 serve(t,split(model.subarray(0,model.length-1),512*1024));
 await assert.rejects(load(),{code:'model-damaged'});
});
test('a download whose hash differs is refused',async t=>{
 const corrupt=model.slice();corrupt[1000]^=1;serve(t,split(corrupt,512*1024));
 await assert.rejects(load(),{code:'model-damaged'});
});
test('an HTTP error is refused as unreachable',async t=>{
 serve(t,[],{status:404});
 await assert.rejects(load(),{code:'model-download-failed'});
});
test('an oversized download stops the stream instead of leaving it unread',async t=>{
 let cancelled=false;
 t.mock.method(globalThis,'fetch',async()=>new Response(new ReadableStream({start(controller){controller.enqueue(model);controller.enqueue(new Uint8Array(1));},cancel(){cancelled=true;}}),{status:200}));
 await assert.rejects(load(),{code:'model-damaged'});
 assert.equal(cancelled,true);
});
test('a network failure before or during the download reads as a failed download and never echoes the browser text',async t=>{
 t.mock.method(globalThis,'fetch',async()=>{throw new TypeError('Failed to fetch');});
 const offline=await load().catch(error=>error);
 assert.equal(offline.code,'model-download-failed');
 assert.equal(userMessage(offline),"Couldn't download the voice/music model. Check your connection and try again.");
 assert.doesNotMatch(userMessage(offline),/fetch/i);
 let reads=0;
 t.mock.method(globalThis,'fetch',async()=>new Response(new ReadableStream({pull(controller){if(reads++===0)controller.enqueue(model.subarray(0,1000));else controller.error(new TypeError('network error'));}}),{status:200}));
 const dropped=await load().catch(error=>error);
 assert.equal(dropped.code,'model-download-failed');
});
