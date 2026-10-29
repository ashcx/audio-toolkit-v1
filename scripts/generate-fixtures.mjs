import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,copyFileSync} from 'node:fs';
const root='tests/fixtures';mkdirSync(root,{recursive:true});
function run(binary,args){const result=spawnSync(binary,args,{encoding:'utf8'});if(result.status!==0)throw Error(`${binary}: ${result.stderr?.slice(-2000)??result.error}`);return result.stdout;}
const outputs=[
 ['tone.wav',['-c:a','pcm_s16le']],['tone.mp3',['-c:a','libmp3lame','-b:a','128k']],
 ['tone.aac',['-c:a','aac','-b:a','128k']],['tone.m4a',['-c:a','aac','-b:a','128k']],
 ['tone.flac',['-c:a','flac']],['tone.ogg',['-c:a','libvorbis']],
 ['tone.opus',['-c:a','libopus']],['audio.webm',['-c:a','libopus']],
];
for(const [name,codec] of outputs)run('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=2','-ac','2',...codec,`${root}/${name}`]);
for(const name of ['video.mp4','video.mov','video.mkv','video.webm']){
 const web=name.endsWith('.webm')||name.endsWith('.mkv');
 run('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=black:s=64x64:r=10:d=2','-f','lavfi','-i','sine=frequency=660:sample_rate=48000:duration=2','-ac','2','-c:v',web?'libvpx-vp9':'libx264',...(web?['-deadline','realtime','-cpu-used','8']:['-preset','ultrafast']),'-c:a',web?'libopus':'aac','-shortest',`${root}/${name}`]);
}
run('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','sine=frequency=440:duration=2','-c:a','wmav2',`${root}/unsupported.mkv`]);
run('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=black:s=32x32:r=5:d=10','-f','lavfi','-i','sine=frequency=440:duration=2','-c:v','libvpx','-c:a','libopus',`${root}/long-video.webm`]);
run('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',`${root}/video.mp4`,'-c','copy','-output_ts_offset','5',`${root}/offset.mp4`]);
run('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=black:s=64x64:r=10:d=1','-an','-c:v','libx264','-preset','ultrafast',`${root}/no-audio.mp4`]);
copyFileSync(`${root}/tone.wav`,`${root}/misnamed.mp3`);writeFileSync(`${root}/corrupt.wav`,'not an audio recording');
const manifest={provenance:'Locally generated sine waves and black video; no third-party or personal media',generator:'scripts/generate-fixtures.mjs',ffmpeg:run('ffmpeg',['-version']).split('\n')[0],fixtures:[]};
for(const name of [...outputs.map(x=>x[0]),'video.mp4','video.mov','video.mkv','video.webm','offset.mp4','unsupported.mkv','long-video.webm','no-audio.mp4','misnamed.mp3']){
 const reference=JSON.parse(run('ffprobe',['-v','error','-show_entries','format=duration,format_name:stream=codec_type,codec_name,sample_rate,channels,duration,start_time','-of','json',`${root}/${name}`]));
 manifest.fixtures.push({name,reference});
}
writeFileSync(`${root}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
console.log(`Generated ${manifest.fixtures.length} inspected fixtures plus corrupt input.`);
