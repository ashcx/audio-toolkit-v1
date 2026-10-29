import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(await readFile('vendor/aac/provenance.json','utf8'));
if(JSON.stringify(JSON.parse(await readFile('public/third-party/aac-build.json','utf8')))!==JSON.stringify(manifest))throw new Error('Served AAC build record is stale.');
for(const [file,expected] of Object.entries(manifest.artifacts)){
 const actual=createHash('sha256').update(await readFile(`vendor/aac/${file}`)).digest('hex');
 if(actual!==expected)throw new Error(`AAC build artifact changed: ${file}. Rebuild from pinned source and review provenance.`);
}
const archive=createHash('sha256').update(await readFile(`public/${manifest.ffmpeg.archive}`)).digest('hex');
if(archive!==manifest.ffmpeg.sha256)throw new Error('AAC corresponding source archive differs from the build record.');
console.log('Verified AAC runtime, wrapper, worker, bridge and corresponding-source hashes.');
