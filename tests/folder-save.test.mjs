import test from 'node:test';
import assert from 'node:assert/strict';
import { FolderSave, saveFilesToFolder } from '../src/folder-save.ts';
const missing=()=>new DOMException('missing','NotFoundError');
function directory(name='chosen', options={}) {
  const entries=new Map();
  return {name,entries,
    async *values(){for(const entry of entries.values()) yield entry;},
    async getDirectoryHandle(name,{create=false}={}) {
      const existing=entries.get(name);
      if(existing){if(!existing.entries) throw new DOMException('file','TypeMismatchError');return existing;}
      if(!create) throw missing();
      const child=directory(name,options);entries.set(name,child);return child;
    },
    async getFileHandle(name,{create=false}={}) {
      if (!create && name === options.collide && this.name !== 'chosen' && !entries.has(name)) {
        entries.set(name,{name,bytes:new Uint8Array([99])});
      }
      const existing=entries.get(name);
      if(existing){if(existing.entries) throw new DOMException('folder','TypeMismatchError');return existing;}
      if(!create) throw missing();
      const file={name,bytes:new Uint8Array(), async createWritable(){
        if(options.deny?.(name)) throw new DOMException('denied','NotAllowedError');
        let chunks=[];
        return {async write(buffer){
          await options.onWrite?.(name);
          if(options.fail?.(name)) throw new DOMException('full','QuotaExceededError');
          chunks.push(new Uint8Array(buffer));
        },async close(){
          if(options.closeFail?.(name)) throw Error('close failed');
          file.bytes=Uint8Array.from(chunks.flatMap(chunk=>[...chunk]));
        },async abort(){chunks=[];}};
      }};entries.set(name,file);return file;
    },
    async removeEntry(name){if(options.removeFail?.(name))throw Error('busy');entries.delete(name);},
  };
}
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
test('folder save keeps existing files and duplicate batch folder names, and copies exact bytes',async()=>{
 const root=directory();const existing=await root.getFileHandle('song.wav',{create:true});existing.bytes=new Uint8Array([9]);
 const files=[new File(['abc'],'song.wav'),new File(['xyz'],'two.wav')];const progress=[];
 const report=await saveFilesToFolder(files,root,new AbortController().signal,n=>progress.push(n));
 assert.deepEqual(report.saved,['song.wav','two.wav']);assert.equal(report.remaining,0);assert.deepEqual(progress,[1,2]);assert.deepEqual([...existing.bytes],[9]);
 const child=root.entries.get(report.folder.split('/')[1]);assert.equal(new TextDecoder().decode(child.entries.get('song.wav').bytes),'abc');
 const second=await saveFilesToFolder(files,root,new AbortController().signal,()=>{});assert.notEqual(second.folder,report.folder);assert.equal(root.entries.size,3);
});
test('unsafe or duplicate output basenames never create destination files',async()=>{
 for(const names of [['../x'],['A.wav','a.wav'],['bad\\name'],['bad:'],['..'],['tail.']]){
  const root=directory();await assert.rejects(saveFilesToFolder(names.map(name=>new File(['x'],name)),root,new AbortController().signal,()=>{}),/safe and unique/);assert.equal(root.entries.size,0);
 }
});
test('partial failures are isolated, partial files removed, later outputs saved',async()=>{
 const root=directory('chosen',{fail:name=>name==='bad.wav'});
 const report=await saveFilesToFolder([new File(['a'],'good.wav'),new File(['b'],'bad.wav'),new File(['c'],'last.wav')],root,new AbortController().signal,()=>{});
 assert.deepEqual(report.saved,['good.wav','last.wav']);assert.match(report.failed[0].message,/Not enough space/);assert.equal(report.remaining,0);
 const child=root.entries.get(report.folder.split('/')[1]);assert.equal(child.entries.has('bad.wav'),false);
});
test('permission and close failures preserve original files and identify cleanup failures',async()=>{
 for(const options of [{deny:()=>true},{closeFail:()=>true}]){
  const root=directory('chosen',{...options,removeFail:()=>true});const original=new File(['original'],'song.wav');
  const report=await saveFilesToFolder([original],root,new AbortController().signal,()=>{});
  assert.equal(report.saved.length,0);assert.match(report.failed[0].message,/partial file may remain/);assert.equal(await original.text(),'original');
 }
});
test('cancel waits for pending write and removes only its partial file, keeping completed results',async()=>{
 const controller=new AbortController();let release,started;
 const entered=new Promise(resolve=>started=resolve);const pending=new Promise(resolve=>release=resolve);
 const root=directory('chosen',{onWrite:async name=>{if(name==='second.wav'){started();await pending;}}});
 const operation=saveFilesToFolder(['first','second','third'].map(name=>new File([name],name+'.wav')),root,controller.signal,()=>{});
 await entered;controller.abort();release();const report=await operation;
 assert.equal(report.cancelled,true);assert.deepEqual(report.saved,['first.wav']);assert.equal(report.failed.length,1);assert.equal(report.remaining,1);
 const child=root.entries.get(report.folder.split('/')[1]);assert.equal(child.entries.has('first.wav'),true);assert.equal(child.entries.has('second.wav'),false);assert.equal(child.entries.has('third.wav'),false);
});
test('session invokes picker in gesture, rejects overlapping starts and survives cancellation or denied access',async()=>{
 let choose,calls=0;const saver=new FolderSave(()=>{calls++;return new Promise(resolve=>choose=resolve);});
 const original=new File(['x'],'a.wav');const first=saver.start([original]);assert.equal(calls,1);assert.equal(saver.busy,true);await saver.start([original]);assert.equal(calls,1);
 saver.cancel();choose(directory());await first;assert.equal(saver.busy,false);assert.equal(saver.state.kind,'failed');assert.match(saver.state.message,/cancelled/);assert.equal(await original.text(),'x');
 const denied=new FolderSave(async()=>{throw new DOMException('denied','NotAllowedError');});await denied.start([original]);assert.equal(denied.busy,false);assert.match(denied.state.message,/denied/);
 const cancelled=new FolderSave(async()=>{throw new DOMException('cancelled','AbortError');});await cancelled.start([original]);assert.match(cancelled.state.message,/cancelled/);await tick();
});

test('an existing destination inside a new batch is reported and never overwritten',async()=>{
 const root=directory('chosen',{collide:'song.wav'});
 const report=await saveFilesToFolder([new File(['new'],'song.wav')],root,new AbortController().signal,()=>{});
 assert.equal(report.saved.length,0);assert.match(report.failed[0].message,/already exists/);
 const child=root.entries.get(report.folder.split('/')[1]);assert.deepEqual([...child.entries.get('song.wav').bytes],[99]);
});
test('a UUID batch-name collision creates a different folder and preserves its contents',async()=>{
 const root=directory();const occupied=await root.getDirectoryHandle('Audio Toolkit occupied',{create:true});await occupied.getFileHandle('keep',{create:true});
 const original=crypto.randomUUID;let calls=0;crypto.randomUUID=()=>++calls===1?'occupied':'fresh';
 try{
  const report=await saveFilesToFolder([new File(['x'],'song.wav')],root,new AbortController().signal,()=>{});
  assert.equal(report.folder,'chosen/Audio Toolkit fresh');assert.equal(occupied.entries.has('keep'),true);assert.equal(occupied.entries.has('song.wav'),false);
 }finally{crypto.randomUUID=original;}
});

test('source changes clear old reports without clearing an active save or touching saved files',async()=>{
 const root=directory();const owner=new FolderSave(async()=>root);const files=[new File(['x'],'song.wav')];
 await owner.start(files);assert.equal(owner.state.kind,'result');const folder=owner.state.report.folder;
 owner.resetReport();assert.equal(owner.state.kind,'idle');assert.equal(root.entries.has(folder.split('/')[1]),true);
 let finish;const pending=new FolderSave(()=>new Promise(resolve=>finish=resolve));const operation=pending.start(files);
 pending.resetReport();assert.equal(pending.state.kind,'choosing');pending.cancel();finish(root);await operation;
});
