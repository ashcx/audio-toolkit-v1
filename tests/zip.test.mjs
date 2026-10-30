import test from 'node:test';
import assert from 'node:assert/strict';
import {writeStoredZip,ZIP_CHUNK} from '../src/zip.ts';
import {writeFileSync,mkdtempSync,rmSync} from 'node:fs';

import {execFileSync} from 'node:child_process';
test('stored ZIP64 round trips exact Unicode entries with independent Python reader and bounded writes',async()=>{
 const files=[new File([new Uint8Array(ZIP_CHUNK*2+37).fill(123)],'音楽.audio.wav'),new File(['hello'],'second.audio.mp3'),new File([],'empty.audio.wav')];
 const parts=[];let length=0,max=0;const reports=[];
 await writeStoredZip(files,async(position,bytes)=>{assert.equal(position,length);length+=bytes.length;max=Math.max(max,bytes.length);parts.push(bytes);},new AbortController().signal,value=>reports.push(value));assert(max<=ZIP_CHUNK);assert.equal(reports.at(-1).loaded,files.reduce((a,f)=>a+f.size,0));
 const dir=mkdtempSync('.artifacts/audio-zip-');
 try{writeFileSync(`${dir}/out.zip`,Buffer.concat(parts));const result=JSON.parse(execFileSync('python3',['-c',`import zipfile,json,sys\nz=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; print(json.dumps([{'name':i.filename,'method':i.compress_type,'size':i.file_size,'bytes':list(z.read(i)[:5])} for i in z.infolist()]))`,`${dir}/out.zip`],{encoding:'utf8'}));assert.deepEqual(result,files.map((f,i)=>({name:f.name,method:0,size:f.size,bytes:i===0?[123,123,123,123,123]:i===1?[104,101,108,108,111]:[]})));}finally{rmSync(dir,{recursive:true});}
});
test('ZIP cancels after an in-flight write, rejects unsafe and duplicate names, and propagates storage failure',async()=>{
 const controller=new AbortController();let calls=0;
 await assert.rejects(writeStoredZip([new File(['x'],'a')],async()=>{calls++;controller.abort();},controller.signal,()=>{}),{name:'AbortError'});assert.equal(calls,1);
 for(const names of [['../song'],['a','A'],['bad\\name']])await assert.rejects(writeStoredZip(names.map(name=>new File(['x'],name)),async()=>{},new AbortController().signal,()=>{}),/safe and unique/);
 await assert.rejects(writeStoredZip([new File(['x'],'a')],async()=>{throw new DOMException('full','QuotaExceededError');},new AbortController().signal,()=>{}),{name:'QuotaExceededError'});
});
