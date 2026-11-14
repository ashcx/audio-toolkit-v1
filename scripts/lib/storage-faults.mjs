/**
 * Output files are written by workers through sync access handles, which page scripts cannot patch.
 * This routes the worker scripts through a shim and mirrors the page-level flags the drivers already
 * use (__failWrite, __failTruncate, __pauseWrites, __hold, __fault) to it over a BroadcastChannel.
 * Call it on the browser context before any page script that sets those flags.
 */
const WORKER_SHIM = `(()=>{
 const bc=new BroadcastChannel('storage-faults'),flags={},waiting=new Map();let sequence=0;
 const say=message=>bc.postMessage(message);say({hello:true});
 const releaseAll=()=>{for(const [id,release] of [...waiting]){waiting.delete(id);release();}};
 bc.onmessage=({data})=>{
  if('flag' in data){const was=flags[data.flag];flags[data.flag]=data.value;if(!data.value&&was&&(data.flag==='hold'||data.flag==='pauseWrites'))releaseAll();}
  else if(data.release!==undefined){const release=waiting.get(data.release);if(release){waiting.delete(data.release);release();}}
 };
 const claim=(name,value)=>{try{const request=new XMLHttpRequest();request.open('POST','/__storage-fault-claim?name='+name+'&value='+encodeURIComponent(String(value)),false);request.send();return request.responseText==='1';}catch{return false;}};
 const hold=async kind=>{const id=Math.random().toString(36).slice(2)+(sequence++);say({held:id,kind});await new Promise(resolve=>waiting.set(id,resolve));say({released:id});};
 const handle=globalThis.FileSystemSyncAccessHandle?.prototype;
 if(handle){
  const write=handle.write;
  handle.write=function(buffer,...rest){
   say({stat:'write',bytes:buffer.byteLength});
   if(flags.failWrite&&claim('failWrite',true)){flags.failWrite=false;say({consumed:'failWrite'});throw new DOMException('Full','QuotaExceededError');}
   if(flags.failNextWrite&&claim('failNextWrite',true)){flags.failNextWrite=false;say({consumed:'failNextWrite'});throw new DOMException('Injected single quota','QuotaExceededError');}
   if(flags.fault==='write'&&claim('fault','write')){flags.fault=null;say({consumed:'fault'});throw new Error('Injected write failure');}
   return write.call(this,buffer,...rest);
  };
  const truncate=handle.truncate;
  handle.truncate=function(...args){
   if(flags.failTruncate&&claim('failTruncate',true)){flags.failTruncate=false;say({consumed:'failTruncate'});throw new DOMException('Full','QuotaExceededError');}
   return truncate.apply(this,args);
  };
  const close=handle.close;
  handle.close=function(...args){
   if(flags.fault==='close'&&claim('fault','close')){flags.fault=null;say({consumed:'fault'});throw new Error('Injected close failure');}
   return close.apply(this,args);
  };
 }
 const file=globalThis.FileSystemFileHandle?.prototype;
 if(file){
  const create=file.createSyncAccessHandle;
  file.createSyncAccessHandle=async function(...args){
   while(flags.pauseWrites)await hold('pause');
   if(flags.hold==='write'||flags.hold===true)await hold('write');
   return create.apply(this,args);
  };
  const getFile=file.getFile;
  file.getFile=async function(...args){
   if(flags.hold==='close')await hold('close');
   return getFile.apply(this,args);
  };
 }
})();
`;
const PAGE_MIRROR = () => {
  const bc = new BroadcastChannel('storage-faults'), values = {};
  for (const name of ['failWrite', 'failTruncate', 'failNextWrite', 'pauseWrites', 'hold', 'fault'])
    Object.defineProperty(window, '__' + name, { configurable: true, get: () => values[name], set: value => { values[name] = value; window.__storageFaultSet?.(name, value); bc.postMessage({ flag: name, value }); } });
  window.__release = () => { values.hold = null; bc.postMessage({ flag: 'hold', value: null }); };
  const holds = new Set();
  bc.onmessage = ({ data }) => {
    if (data.hello) for (const [flag, value] of Object.entries(values)) bc.postMessage({ flag, value });
    if (data.consumed) values[data.consumed] = data.consumed === 'fault' ? null : false;
    if (data.stat === 'write') { window.__writes = (window.__writes ?? 0) + 1; window.__maxWrite = Math.max(window.__maxWrite ?? 0, data.bytes); }
    if (data.held) {
      holds.add(data.held); window.__held = true; window.__heldCount = (window.__heldCount ?? 0) + 1;
      (window.__releases ??= []).push(() => bc.postMessage({ release: data.held }));
    }
    if (data.released) { holds.delete(data.released); if (!holds.size) window.__held = false; }
  };
};
export async function installStorageFaults(context) {
  const armed = {};
  await context.exposeBinding('__storageFaultSet', (_source, name, value) => { armed[name] = value; });
  await context.route(/\/__storage-fault-claim\?/, async route => {
    const url = new URL(route.request().url()), name = url.searchParams.get('name'), value = url.searchParams.get('value');
    const wins = String(armed[name]) === value;
    if (wins) armed[name] = name === 'fault' ? null : false;
    await route.fulfill({ status: 200, contentType: 'text/plain', body: wins ? '1' : '0' });
  });
  await context.route(/\/assets\/[^/]*worker[^/]*\.js(\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: WORKER_SHIM + await response.text() });
  });
  await context.addInitScript(PAGE_MIRROR);
}
