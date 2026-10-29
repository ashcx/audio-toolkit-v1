import {readdir,readFile} from 'node:fs/promises';
import path from 'node:path';
const directory=process.argv[2]??'dist/assets';
for(const name of await readdir(directory)){
 if(!/^(?:mediabunny-.*-encoder|encoder|isolation-runtime)-.*\.js$/.test(name))continue;
 const source=await readFile(path.join(directory,name),'utf8');
 if(/from["']\.\/(?:pcm-worker|isolation-worker|worker)-[A-Za-z0-9_-]{8}\.js/.test(source))throw new Error(`${name} imports a worker entry. Put shared code in its own chunk to avoid a worker import cycle.`);
}
console.log('Codec and isolation chunks do not import worker entries.');
