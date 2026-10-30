import {readFile,writeFile,mkdir} from 'node:fs/promises';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
const root=process.env.AUDIT_EVIDENCE_DIR??'.artifacts/static-audit';await mkdir(root,{recursive:true});
const lock=JSON.parse(await readFile('package-lock.json','utf8')),packages=[];
for(const[path,value]of Object.entries(lock.packages)){
 if(!path||value.dev)continue;const manifest=JSON.parse(await readFile(`${path}/package.json`,'utf8'));packages.push({name:manifest.name,version:manifest.version,declaredLicense:manifest.license??null,lockIntegrity:!!value.integrity});
}
const index=await readFile('public/third-party/index.html','utf8');const sources=[];
for(const match of index.matchAll(/href="([^"#:]+)"/g)){
 const href=match[1];if(href.includes('://')||href==='../')continue;assert(!href.includes('..'));const path=`public/third-party/${href}`,bytes=await readFile(path);assert(bytes.length>0);sources.push({path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
execFileSync(process.execPath,['scripts/verify-aac.mjs'],{stdio:'inherit'});execFileSync(process.execPath,['scripts/verify-neural.mjs'],{stdio:'inherit'});
const tracked=execFileSync('git',['ls-files','--','test_songs','.artifacts','.upstream'],{encoding:'utf8'});assert.equal(tracked.trim(),'');
assert.equal(execFileSync('git',['check-ignore','test_songs/private.wav'],{encoding:'utf8'}).trim(),'test_songs/private.wav');
await writeFile(`${root}/results.json`,JSON.stringify({packages,sources,privateAndGeneratedMediaTracked:0,privateSongsIgnored:true,aacAndNeuralPinnedHashesVerified:true,boundaries:['Manifest declarations and served notices checked; this is not a claim that the model was independently regenerated or every transitive legal obligation is closed.','External source links are recorded; automated local notice checks do not verify remote availability.']},null,2)+'\n');console.log(`Audited ${packages.length} production package declarations and ${sources.length} served notice/source assets; private media is ignored.`);
