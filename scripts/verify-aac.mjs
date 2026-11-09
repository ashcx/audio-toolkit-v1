import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(await readFile('vendor/aac/provenance.json','utf8'));
if(JSON.stringify(JSON.parse(await readFile('public/third-party/aac-build.json','utf8')))!==JSON.stringify(manifest))throw new Error('Served AAC build record is stale.');
for(const [file,expected] of Object.entries(manifest.artifacts)){
 const actual=createHash('sha256').update(await readFile(`vendor/aac/${file}`)).digest('hex');
 if(actual!==expected)throw new Error(`AAC build artifact changed: ${file}. Rebuild from pinned source and review provenance.`);
}
console.log('Verified AAC runtime, wrapper, worker, bridge and build-record hashes.');
