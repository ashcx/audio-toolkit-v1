import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const patch=JSON.parse(await readFile(new URL('../vendor/mediabunny-patches.json',import.meta.url),'utf8'));
const packageRoot=new URL('../node_modules/mediabunny/',import.meta.url);
const metadata=JSON.parse(await readFile(new URL('package.json',packageRoot),'utf8'));
if(metadata.version!==patch.version)throw new Error('Review the Matroska padding patch before upgrading Mediabunny.');
const hash=value=>createHash('sha256').update(value).digest('hex');
for(const file of patch.files){
 const path=new URL(file.path,packageRoot);let content=await readFile(path,'utf8');
 if(hash(content)===file.after)continue;
 if(hash(content)!==file.before)throw new Error(`Unexpected dependency content: ${file.path}`);
 for(const [before,after] of file.replacements){if(content.split(before).length!==2)throw new Error(`Patch anchor changed: ${file.path}`);content=content.replace(before,after);}
 if(hash(content)!==file.after)throw new Error(`Patch verification failed: ${file.path}`);
 await writeFile(path,content);
}
console.log('Verified Mediabunny Matroska Opus padding patch.');
