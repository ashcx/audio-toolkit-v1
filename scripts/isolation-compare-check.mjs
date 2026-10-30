import {execFileSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const [source,voice,music,report]=process.argv.slice(2);
assert(source&&voice&&music&&report,'Provide source, voice WAV, music WAV, and private JSON report paths.');
assert(report.startsWith('.artifacts/'),'Keep private analysis under .artifacts/.');
const decode=path=>{const bytes=execFileSync('ffmpeg',['-v','error','-i',path,'-f','f32le','-'],{maxBuffer:256*1024*1024});return new Float32Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/4);};
const original=decode(source),vocals=decode(voice),instrumental=decode(music);
assert.equal(vocals.length,original.length);assert.equal(instrumental.length,original.length);
let maxError=0,squared=0,saturatedSamples=0,checkedSamples=0;
for(let i=0;i<original.length;i++){
 assert(Number.isFinite(original[i])&&Number.isFinite(vocals[i])&&Number.isFinite(instrumental[i]));
 if(Math.abs(vocals[i])>=32767/32768||Math.abs(instrumental[i])>=32767/32768){saturatedSamples++;continue;}
 const error=vocals[i]+instrumental[i]-original[i];maxError=Math.max(maxError,Math.abs(error));squared+=error*error;checkedSamples++;
}
assert(checkedSamples>0);
const result={samples:original.length,checkedSamples,saturatedSamples,maxReconstructionError:maxError,rmse:Math.sqrt(squared/checkedSamples),tolerance:1e-4,claim:'Decoded voice plus music reconstructs the decoded input outside saturated 16-bit output samples. This tests sample alignment and subtraction, not perceptual separation quality.'};
await writeFile(report,JSON.stringify(result,null,2)+'\n');
assert(maxError<result.tolerance,`Decoded reconstruction error ${maxError}`);
console.log('Voice and music reconstruction passed',checkedSamples,'samples;',saturatedSamples,'saturated output samples excluded.');
