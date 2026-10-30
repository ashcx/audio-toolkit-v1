import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const root=process.env.RELEASE_EVIDENCE_DIR??'.artifacts/release-check';await mkdir(root,{recursive:true});
const app=process.env.APP_URL??'http://127.0.0.1:4184/audio-toolkit-v1/';
const checks=[['workspace','WORKSPACE'],['intake','INTAKE'],['recipe','RECIPE'],['copy','COPY'],['dsp','DSP'],['format','FORMAT'],['batch','BATCH'],['cleanup','CLEANUP'],['download','DOWNLOAD'],['privacy','PRIVACY']];
const startAt=process.env.RELEASE_CHECK_FROM?checks.findIndex(([name])=>name===process.env.RELEASE_CHECK_FROM):0;
if(startAt<0)throw Error("Unknown release check name.");
let records=[],previousFailures=[];
if(startAt>0){
 const previous=JSON.parse(await readFile(`${root}/results.json`,'utf8'));
 if(previous.app!==app||!checks.slice(0,startAt).every(([name],index)=>previous.checks[index]?.name===name&&previous.checks[index]?.code===0))throw Error("Earlier checks must pass against this preview before resuming.");
 records=previous.checks.slice(0,startAt);previousFailures=previous.checks.filter(check=>check.code!==0);
}
for(const [name,prefix] of checks.slice(startAt)){
 const start=Date.now();console.log(`Starting ${name}`);
 const code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[`scripts/${name}-check.mjs`],{stdio:'inherit',env:{...process.env,APP_URL:app,SKIP_LARGE:'1',[`${prefix}_EVIDENCE_DIR`]:`${root}/${name}`}});child.on('error',reject);child.on('exit',resolve);});
 records.push({name,code,elapsedMs:Date.now()-start});await writeFile(`${root}/results.json`,JSON.stringify({app,host:process.platform,checks:records,previousFailures},null,2)+'\n');
 if(code!==0)throw Error(`${name} check failed; subsequent checks were not run.`);
}
console.log('All automated release checks passed. Physical device/listening acceptance remains separate.');
