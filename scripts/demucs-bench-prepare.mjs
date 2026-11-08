import {readFile,writeFile,mkdir,copyFile,readdir,link,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const music=process.env.BENCH_MUSIC_DIR;
if(!music)throw Error('Set BENCH_MUSIC_DIR to the directory holding the verified Sprint 16 live.ogg and instrumental.ogg.');
const site=join(root,'.artifacts/s27-root/audio-toolkit-v1');
const benchDir=join(root,'.artifacts/sprint-27/bench');
const stride=join(root,'.artifacts/sprint-27/neural-stride');
const rate=44100;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

const manifest=JSON.parse(await readFile(join(root,'docs/sprint-evidence/sprint-16/fixtures.json'),'utf8'));
const sources={};
for(const id of ['live','instrumental']){
 const path=resolve(music,id+'.ogg'),bytes=await readFile(path),expected=manifest.find(entry=>entry.id===id).sha256;
 if(sha(bytes)!==expected)throw Error(`${id}.ogg hash differs from the Sprint 16 manifest`);
 const pcm=execFileSync(process.env.FFMPEG??'ffmpeg',['-v','error','-i',path,'-ar',String(rate),'-ac','2','-f','f32le','-'],{maxBuffer:1<<30});
 sources[id]=new Float32Array(pcm.buffer,pcm.byteOffset,pcm.byteLength/4).slice();
}

const inputs={
 excerpt10:{seconds:10,parts:['live'],note:'live.ogg 0 to 10 s (choir and organ)'},
 m60:{seconds:60,parts:['instrumental'],note:'instrumental.ogg 0 to 60 s'},
 m180:{seconds:180,parts:['live','instrumental'],note:'live then instrumental, repeated and cut at 180 s'},
 m300:{seconds:300,parts:['live','instrumental'],note:'live then instrumental, repeated and cut at 300 s'},
 m600:{seconds:600,parts:['live','instrumental'],note:'live then instrumental, repeated and cut at 600 s'},
};
await mkdir(benchDir,{recursive:true});
const written={};
for(const [name,spec] of Object.entries(inputs)){
 const frames=spec.seconds*rate,planar=new Float32Array(2*frames);
 let at=0;
 for(let part=0;at<frames;part++){
  const interleaved=sources[spec.parts[part%spec.parts.length]],take=Math.min(interleaved.length/2,frames-at);
  for(let i=0;i<take;i++){planar[at+i]=interleaved[2*i];planar[frames+at+i]=interleaved[2*i+1];}
  at+=take;
 }
 const bytes=Buffer.from(planar.buffer);
 await writeFile(join(benchDir,name+'.f32'),bytes);
 written[name]={frames,seconds:spec.seconds,source:spec.note,sha256:sha(bytes)};
}
await writeFile(join(benchDir,'inputs.json'),JSON.stringify(written,null,2)+'\n');

await rm(stride,{recursive:true,force:true});await mkdir(stride,{recursive:true});
for(const file of await readdir(join(root,'vendor/neural')))await copyFile(join(root,'vendor/neural',file),join(stride,file));
const neural=await readFile(join(stride,'neural.js'),'utf8'),needle='let p=Math.floor(.75*h)';
if(neural.split(needle).length!==2)throw Error('The vendored hybrid stride expression changed; update the overlap patch.');
await writeFile(join(stride,'neural.js'),neural.replace(needle,'let p=Math.floor((globalThis.__demucsStride??.75)*h)'));

const config=join(root,'.artifacts/s27.vite.config.mjs');
await writeFile(config,`import original from '../vite.config.js';
export default {...original,resolve:{alias:{'demucs-neural-stride':${JSON.stringify(join(stride,'neural.js'))},'demucs-ort-webgpu':${JSON.stringify(join(stride,'ort.webgpu.bundle.min-PH2DGZS5.js'))}}},build:{outDir:${JSON.stringify(site)},emptyOutDir:true,rollupOptions:{input:${JSON.stringify(join(root,'scripts/demucs-bench.html'))}}}};
`);
execFileSync(process.execPath,['node_modules/vite/bin/vite.js','build','--config',config],{cwd:root,stdio:'inherit'});
await mkdir(join(site,'models'),{recursive:true});await mkdir(join(site,'bench'),{recursive:true});
await link(join(root,'.artifacts/models/htdemucs_fp16.onnx'),join(site,'models/htdemucs_fp16.onnx'));
for(const name of [...Object.keys(written),'inputs'])await link(join(benchDir,name+(name==='inputs'?'.json':'.f32')),join(site,'bench',name+(name==='inputs'?'.json':'.f32')));
const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const dirty=execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim();
await writeFile(join(root,'.artifacts/sprint-27/bench-build.json'),JSON.stringify({revision,dirty:dirty.split('\n').filter(Boolean),inputs:written,builtAt:new Date().toISOString()},null,2)+'\n');
console.log('Frozen benchmark build at',site,'revision',revision);
