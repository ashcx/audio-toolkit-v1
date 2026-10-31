import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=new URL('../',import.meta.url),local=process.env.ISOLATION_FIXTURE_DIR,id=process.env.ISOLATION_EXPERIMENT_ID??'s21';
if(!/^[a-z0-9-]+$/.test(id))throw Error('Use a lowercase experiment build id.');
if(!local)throw Error('Set ISOLATION_FIXTURE_DIR to the local verified Sprint16 Ogg fixture directory.');
const fixtures=JSON.parse(await readFile(new URL('docs/sprint-evidence/sprint-16/fixtures.json',root)));
await mkdir(new URL(`.artifacts/${id}/`,root),{recursive:true});
await writeFile(new URL(`.artifacts/${id}.vite.config.mjs`,root),`import original from '../vite.config.js';\nexport default {...original,build:{outDir:'.artifacts/${id}-root/audio-toolkit-v1',rollupOptions:{input:'scripts/isolation-experiment-check.html'}}};\n`);
execFileSync(process.execPath,['node_modules/vite/bin/vite.js','build','--config',`.artifacts/${id}.vite.config.mjs`],{cwd:root,stdio:'inherit'});
const destination=new URL(`.artifacts/${id}-root/audio-toolkit-v1/fixtures/`,root);await mkdir(destination,{recursive:true});
for(const fixture of fixtures){const path=new URL(fixture.id+'.ogg',pathToFileURL(resolve(local)+sep)),bytes=await readFile(path);if(createHash('sha256').update(bytes).digest('hex')!==fixture.sha256)throw Error('Fixture hash mismatch '+fixture.id);await copyFile(path,new URL(fixture.id+'.ogg',destination));}
console.log(`Frozen experiment prepared. Serve .artifacts/${id}-root on localhost:4197. Open /audio-toolkit-v1/scripts/isolation-experiment-check.html. Do not rebuild during measurement.`);
