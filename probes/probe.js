import { decoder as createFlacDecoder } from '@audio/decode-flac';
import { Input, Output, Conversion, BufferSource, BufferTarget, ALL_FORMATS, AudioSample, AudioSampleSource, WavOutputFormat, Mp3OutputFormat, Mp4OutputFormat, FlacOutputFormat, OggOutputFormat, canEncodeAudio, AudioSampleSink } from 'mediabunny';
import { registerMp3Encoder } from '@mediabunny/mp3-encoder';
import { registerAacEncoder } from '@mediabunny/aac-encoder';
import { registerFlacEncoder } from '@mediabunny/flac-encoder';

window.runProbe = async () => {
  const result = { browser: navigator.userAgent, isolated: crossOriginIsolated, native: {}, formats: {}, copy: {}, isolation: null };
  for (const codec of ['aac','mp3','flac','opus','pcm-s16']) result.native[codec] = await canEncodeAudio(codec);
  registerMp3Encoder(); registerAacEncoder(); registerFlacEncoder();
  const makeInput = bytes => new Input({ source: new BufferSource(bytes), formats: ALL_FORMATS });
  const target = new BufferTarget();
  const out = new Output({ format: new WavOutputFormat(), target });
  const source = new AudioSampleSource({ codec: 'pcm-s16' });
  out.addAudioTrack(source); await out.start();
  const signal = Float32Array.from({length: 44100},(_,i)=>Math.sin(i*2*Math.PI*440/44100)*0.2);
  const sample = new AudioSample({data:signal,format:'f32',numberOfChannels:1,sampleRate:44100,timestamp:0});
  await source.add(sample); sample.close(); source.close(); await out.finalize();
  for (const [name,codec,format] of [['mp3','mp3',new Mp3OutputFormat()],['m4a','aac',new Mp4OutputFormat()],['flac','flac',new FlacOutputFormat()],['wav','pcm-s16',new WavOutputFormat()],['opus','opus',new OggOutputFormat()]]) {
    const input=makeInput(target.buffer); const output=new Output({format,target:new BufferTarget()});
    try {
      const conversion=await Conversion.init({input,output,video:{discard:true},audio:{codec,bitrate:128000,forceTranscode:true}});
      if(!conversion.isValid) throw Error(conversion.discardedTracks.map(t=>t.reason).join(','));
      await conversion.execute();
      const check=makeInput(output.target.buffer); const track=await check.getPrimaryAudioTrack();
      let frames=0; let fallback=false;
      try {
        const sink=new AudioSampleSink(track);
        for await (const decoded of sink.samples()) { frames+=decoded.numberOfFrames; decoded.close(); }
      } catch (error) {
        if(name!=='flac')throw error;
        const decoder=await createFlacDecoder();
        try {
          frames=0;
          const bytes=new Uint8Array(output.target.buffer);
          for(let pos=0;pos<bytes.length;pos+=4096){const decoded=decoder.decode(bytes.subarray(pos,pos+4096));frames+=decoded.channelData[0]?.length??0;}
          const tail=decoder.flush();frames+=tail.channelData[0]?.length??0;fallback=true;
        } finally { decoder.free(); }
      }
      result.formats[name]={bytes:output.target.buffer.byteLength,codec:track.codec,duration:await check.computeDuration(),decodedFrames:frames,fallback};
      if(name==='m4a') {
        const copied = new Output({format:new Mp4OutputFormat(),target:new BufferTarget()});
        const copy=await Conversion.init({input:makeInput(output.target.buffer),output:copied,video:{discard:true},audio:{codec:'aac'},copy:{mode:'forced'}});
        await copy.execute(); result.copy={valid:copy.isValid,bytes:copied.target.buffer.byteLength};
      }
      check.dispose();
    } catch(e) { result.formats[name]={error:String(e)}; }
    finally { input.dispose(); }
  }
  document.querySelector('#result').textContent=JSON.stringify(result,null,2);
  return result;
};
window.runIsolationProbe = () => new Promise((resolve,reject)=>{
  const worker=new Worker(import.meta.env.BASE_URL+'probes/isolation-worker.js',{type:'module'});
  const timeout=setTimeout(()=>{worker.terminate();reject(Error('isolation probe timed out after 180 seconds'));},180000);
  worker.onmessage=({data})=>{if(data.type==='done'||data.type==='error'){clearTimeout(timeout);worker.terminate();resolve(data);}};
  worker.onerror=e=>{clearTimeout(timeout);worker.terminate();reject(Error(e.message));};
  worker.postMessage({});
});
