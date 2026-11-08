import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(await readFile('vendor/neural/provenance.json','utf8'));
for(const asset of manifest.assets){
 const bytes=await readFile(asset.file),actual=createHash('sha256').update(bytes).digest('hex');
 if(actual!==asset.sha256||(asset.bytes!==undefined&&bytes.length!==asset.bytes))throw new Error(`Isolation asset differs from pinned source: ${asset.file}`);
}
console.log('Pinned isolation asset hashes match.');
