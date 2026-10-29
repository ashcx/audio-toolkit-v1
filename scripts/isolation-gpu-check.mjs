import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { monitorBrowserMemory } from './browser-memory.mjs';

const root=process.env.ISOLATION_GPU_DIR??'.artifacts/isolation-gpu';
await mkdir(root,{recursive:true});
const server=await chromium.launchServer({host:'127.0.0.1',headless:true,args:['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-angle=vulkan','--use-vulkan=swiftshader','--disable-vulkan-surface']});
const browser=await chromium.connect(server.wsEndpoint());
const memory=monitorBrowserMemory([server.process().pid],()=>server.kill());
const record={claim:'Diagnostic native SwiftShader WebGPU dispatch only; software CPU adapter, not physical GPU support',diagnostics:[],console:[]};
let progress=Promise.resolve();
let page;
try {
 page=await browser.newPage();page.on('console',message=>{const text=message.text();if(record.console.length<20)record.console.push(text.slice(0,400));if(text.startsWith('gpu-diagnostic ')){record.diagnostics.push(JSON.parse(text.slice(15)));progress=progress.then(()=>writeFile(`${root}/progress.json`,JSON.stringify({...record,memory:memory.report},null,2)+'\n'));}});
 await page.addInitScript(()=>{
  window.__gpuDiagnostics=[];
  window.Worker=new Proxy(Worker,{construct(target,args){const worker=Reflect.construct(target,args);worker.addEventListener('message',({data})=>{if(data.diagnostic){window.__gpuDiagnostics.push(data.diagnostic);console.log('gpu-diagnostic '+JSON.stringify(data.diagnostic));}});return worker;}});
 });
 await page.route('**/assets/worker-*.js',async route=>{
  const response=await route.fetch();
  const prefix=`
let diagnosticDispatches=0;
const nativePost=self.postMessage.bind(self);
self.postMessage=(data,options)=>nativePost(data.kind==='done'||data.kind==='error'||data.kind==='phase'?{...data,diagnostic:{kind:data.kind,phase:data.phase,backend:data.backend,dispatches:diagnosticDispatches,message:data.message}}:data,options);
if(typeof GPUComputePassEncoder!=='undefined'){
 const dispatch=GPUComputePassEncoder.prototype.dispatchWorkgroups;
 GPUComputePassEncoder.prototype.dispatchWorkgroups=function(...args){diagnosticDispatches++;if(diagnosticDispatches===1)nativePost({kind:'phase',phase:'Separating',diagnostic:{kind:'first-native-dispatch',dispatches:1}});return dispatch.apply(this,args);};
}
if(navigator.gpu){
 const request=navigator.gpu.requestAdapter.bind(navigator.gpu);
 navigator.gpu.requestAdapter=async(...args)=>{const adapter=await request(...args);if(adapter){const info=adapter.info;Object.defineProperty(adapter,'info',{value:new Proxy(info,{get(target,key){if(key==='isFallbackAdapter')return false;if(key==='architecture')return 'diagnostic-software';return Reflect.get(target,key,target);}})});}return adapter;};
}
`;
  await route.fulfill({response,body:prefix+await response.text()});
 });
 await page.goto(process.env.PROBE_URL??'http://127.0.0.1:4174/audio-toolkit-v1/probes/');
 record.adapter=await page.evaluate(async()=>{const adapter=await navigator.gpu?.requestAdapter();return adapter?{vendor:adapter.info.vendor,architecture:adapter.info.architecture,isFallbackAdapter:adapter.info.isFallbackAdapter}:null;});
 assert(record.adapter,'A native software adapter is required for this diagnostic');
 record.result=await page.evaluate(()=>Promise.race([window.runInferenceProbe({repeats:1,frames:44100}),new Promise((_,reject)=>setTimeout(()=>reject(new Error('GPU diagnostic exceeded 240 seconds')),240000))]));
 record.diagnostics=await page.evaluate(()=>window.__gpuDiagnostics);
 assert.equal(record.result.type,'done',JSON.stringify(record.result));
 assert(record.diagnostics.some(value=>value.kind==='done'&&value.backend==='webgpu+wasm'&&value.dispatches>0),JSON.stringify(record.diagnostics));
 record.verified=true;
}catch(error){record.verified=false;record.error=String(error);if(page&&!page.isClosed())record.diagnostics=await page.evaluate(()=>window.__gpuDiagnostics).catch(()=>[]);process.exitCode=1;}
finally{await server.kill();await memory.stop();record.memory=memory.report;await browser.close().catch(()=>undefined);await progress;await writeFile(`${root}/results.json`,JSON.stringify(record,null,2)+'\n');}
