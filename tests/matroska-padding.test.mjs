import test from 'node:test';
import assert from 'node:assert/strict';
import {MatroskaDemuxer} from '../node_modules/mediabunny/dist/modules/src/matroska/matroska-demuxer.js';
import {Input,FilePathSource,ALL_FORMATS,EncodedPacketSink} from 'mediabunny';
test('actual dependency expands fixed, Xiph and EBML lacing without losing final discard padding',()=>{
 for(const [lacing,data] of [[2,[1,0xf8,0xf8]],[1,[1,1,0xf8,0xf8]],[3,[1,0x81,0xf8,0xf8]]]){
  const block={timestamp:0,duration:40,isKeyFrame:true,data:new Uint8Array(data),lacing,decoded:true,postProcessed:false,mainAdditional:null,discardPaddingSeconds:.0135};
  const frames=MatroskaDemuxer.prototype.expandLacedBlocks([block],{defaultDuration:20});assert.deepEqual(frames.map(f=>f.discardPaddingSeconds??null),[null,.0135]);
 }
});
test('a real laced Opus file exposes a short final duration instead of silently adding padding',async()=>{
 const input=new Input({source:new FilePathSource('tests/fixtures/laced-opus.mka'),formats:ALL_FORMATS});
 try{const track=await input.getPrimaryAudioTrack();const packets=[];for await(const p of new EncodedPacketSink(track).packets())packets.push(p);assert.equal(packets.length,101);assert(Math.abs(packets.at(-1).duration-.0065)<1e-9);assert(Math.abs(await track.computeDuration()-2.0005)<.001);}finally{input.dispose();}
});
