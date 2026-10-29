import {readdir,readFile} from 'node:fs/promises';
import path from 'node:path';
const directory=process.argv[2]??'dist/assets';
for(const name of await readdir(directory)){
 if(!/^(?:mediabunny-.*-encoder|encoder)-.*\.js$/.test(name))continue;
 const source=await readFile(path.join(directory,name),'utf8');
 if(/from["']\.\/pcm-worker-/.test(source))throw new Error(`${name} imports the PCM worker entry. Put shared media code in its own chunk to avoid a worker import cycle.`);
}
console.log('Encoder chunks do not import the PCM worker entry.');
