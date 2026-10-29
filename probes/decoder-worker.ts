import {
  Input,
  BlobSource,
  ALL_FORMATS,
  AudioSampleSink,
  EncodedPacketSink,
} from "mediabunny";
const report = (data: unknown) => self.postMessage(data);
self.addEventListener("unhandledrejection", (event) =>
  report({ kind: "trace", phase: "unhandled", error: String(event.reason) }),
);
self.onmessage = async ({ data: file }: MessageEvent<File>) => {
  const input = new Input({
    source: new BlobSource(file, {
      maxCacheSize: 1024 * 1024,
      useStreamReader: false,
    }),
    formats: ALL_FORMATS,
  });
  let result: unknown;
  try {
    const track = await input.getPrimaryAudioTrack();
    if (!track) throw new Error("No audio track");
    report({ kind: "trace", phase: "track" });
    const codec = await track.getCodec();
    const config = await track.getDecoderConfig();
    const supported = await track.canDecode();
    report({
      kind: "trace",
      phase: "capability",
      codec,
      sampleRate: config?.sampleRate,
      channels: config?.numberOfChannels,
      descriptionBytes: config?.description?.byteLength,
      supported,
    });
    if (!supported) throw new Error(`Decoder unavailable for ${codec}`);
    if (new URL(self.location.href).searchParams.has("wasm")) {
      const factory = codec === "vorbis" ? await import("@audio/decode-vorbis") : await import("@audio/decode-flac");
      const decoder = await factory.decoder();
      let frames = 0, maxBurst = 0;
      try {
        for (let offset = 0; offset < file.size; offset += 4096) {
          const data = decoder.decode(await file.slice(offset, offset + 4096).arrayBuffer());
          const count = data.channelData[0]?.length ?? 0;
          frames += count; maxBurst = Math.max(maxBurst, count);
        }
        frames += decoder.flush().channelData[0]?.length ?? 0;
        result = {kind:"result",file:file.name,codec,frames,maxBurst};
      } finally { decoder.free(); }
    } else if (new URL(self.location.href).searchParams.has("raw")) {
      if (!config) throw new Error("No config");
      let frames = 0,
        packets = 0;
      const head: number[] = [], times: unknown[] = [];
      let nativeError: string | null = null;
      const decoder = new AudioDecoder({
        output: (data) => {
          frames += data.numberOfFrames;
          if (times.length < 8) times.push({timestamp: data.timestamp,frames:data.numberOfFrames,rate:data.sampleRate});
          const plane = new Float32Array(data.numberOfFrames);
          data.copyTo(plane,{planeIndex:0,format:"f32-planar"});
          for(const value of plane) if(head.length<4096)head.push(value);
          data.close();
        },
        error: (error) => {
          nativeError = String(error);
          report({ kind: "trace", phase: "native-error", error: nativeError });
        },
      });
      try {
        if (codec === "opus" && new URL(self.location.href).searchParams.has("zero-skip") && config.description) {
          const bytes = ArrayBuffer.isView(config.description) ? new Uint8Array(config.description.buffer,config.description.byteOffset,config.description.byteLength).slice() : new Uint8Array(config.description).slice();
          bytes[10] = 0; bytes[11] = 0; config.description = bytes;
        }
        decoder.configure(config);
        let initial: number | null = null;
        for await (const packet of new EncodedPacketSink(track).packets()) {
          initial ??= packet.timestamp;
          if (++packets > 200) throw new Error("Probe packet limit");
          decoder.decode((new URL(self.location.href).searchParams.has("positive") ? packet.clone({timestamp:packet.timestamp-initial}) : packet).toEncodedAudioChunk());
        }
        report({
          kind: "trace",
          phase: "flush",
          packets,
          queued: decoder.decodeQueueSize,
        });
        await decoder.flush();
        result = { kind: "result", frames, packets, nativeError,head,times };
      } finally {
        if (decoder.state !== "closed") decoder.close();
      }
    } else {
      let frames = 0,
        first: number | null = null,
        end: number | null = null;
      for await (const sample of new AudioSampleSink(track).samples()) {
        first ??= sample.timestamp;
        frames += sample.numberOfFrames;
        end = sample.timestamp + sample.duration;
        sample.close();
      }
      result = { kind: "result", file: file.name, codec, frames, first, end };
    }
  } catch (error) {
    result = { kind: "result", file: file.name, error: String(error) };
  } finally {
    input.dispose();
  }
  report(result);
};
