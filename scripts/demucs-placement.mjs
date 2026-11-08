import {readFile} from 'node:fs/promises';
const [path]=process.argv.slice(2);
if(!path)throw Error('Usage: node scripts/demucs-placement.mjs <ORT verbose session log>');
const counts={};let provider=null;
for(const line of (await readFile(path,'utf8')).split('\n')){
 const header=line.match(/Node\(s\) placed on \[(\w+)\]\. Number of nodes: (\d+)/);
 if(header){provider=header[1];counts[provider]={total:+header[2],ops:{}};continue;}
 const node=line.match(/VerifyEachNodeIsAssignedToAnEp\]\s+(\w+) \(/);
 if(node&&provider)counts[provider].ops[node[1]]=(counts[provider].ops[node[1]]??0)+1;
 else if(!node)provider=line.includes('VerifyEachNodeIsAssignedToAnEp')?provider:null;
}
for(const value of Object.values(counts))value.ops=Object.fromEntries(Object.entries(value.ops).sort((a,b)=>b[1]-a[1]));
console.log(JSON.stringify(counts,null,1));
