import { AudioSample, AudioSampleSource, Output, BufferTarget } from "mediabunny";
import { encoderSettings, prepareEncoder } from "../src/pcm/encode";
import { newExport, exportSchema } from "../src/recipe";
const trace = (phase: string, detail: unknown = null) => self.postMessage({ phase, detail });
const Original = self.Worker;
self.Worker = new Proxy(Original, {
  construct(target, args) {
    trace("nested-create", String(args[0]).slice(0, 80));
    const worker = Reflect.construct(target, args);
    worker.addEventListener("error", (event: ErrorEvent) => trace("nested-error", event.message));
    worker.addEventListener("message", (event: MessageEvent) => trace("nested-reply", { id: event.data?.id, success: event.data?.success, type: event.data?.type }));
    return worker;
  },
});
self.onmessage = async ({data}: MessageEvent<string>) => {
  try {
    const settings = exportSchema.parse(newExport(data === "mp3" ? "mp3" : data === "flac" ? "flac" : data === "opus" ? "opus" : "m4a"));
    trace("prepare", settings);
    trace("backend", await prepareEncoder(settings, { rate: 48000, channels: 2 }));
    const encoding = encoderSettings(settings), target = new BufferTarget();
    const output = new Output({ format: encoding.format, target });
    const source = new AudioSampleSource({ ...encoding.config, onEncoderConfig: config => trace("config", config) });
    output.addAudioTrack(source); await output.start(); trace("start");
    for (let offset=0;offset<96000;offset+=2048) {
      const frames=Math.min(2048,96000-offset), samples=new Float32Array(frames*2);
      for(let i=0;i<frames;i++)samples[i]=samples[i+frames]=.1*Math.sin(2*Math.PI*1000*(offset+i)/48000);
      const sample=new AudioSample({data:samples,format:"f32-planar",numberOfChannels:2,sampleRate:48000,timestamp:offset/48000});
      await source.add(sample); sample.close();
      if(offset===0)trace("first-add");
    }
    trace("close"); source.close(); await output.finalize(); trace("done", target.buffer?.byteLength);
  } catch(error) { trace("error", String(error)); }
};
