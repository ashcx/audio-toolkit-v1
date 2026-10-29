import {
  Input,
  BlobSource,
  ALL_FORMATS,
  AudioSampleSink,
  EncodedPacketSink,
  OggInputFormat,
} from "mediabunny";
import type { AudioMetadata } from "../media";
import { BLOCK_FRAMES, type PcmBlock, type PcmStream } from "./blocks.ts";
export type DecodeStats = { passes: number; maxDecodedFrames: number };
export async function* decodePcm(
  file: File,
  metadata: Readonly<AudioMetadata>,
  signal: AbortSignal,
  stats: DecodeStats,
): PcmStream {
  const input = new Input({
    source: new BlobSource(file, {
      maxCacheSize: 1024 * 1024,
      useStreamReader: false,
    }),
    formats: ALL_FORMATS,
  });
  const abort = () => input.dispose();
  signal.addEventListener("abort", abort, { once: true });
  let consumed = 0;
  const present = function* (
    planes: readonly Float32Array[],
    rate: number,
    offset: number,
  ): Generator<PcmBlock> {
    if (planes.length < 1 || planes.length > 2 || rate < 8000 || rate > 384000)
      throw new Error(
        "Processing supports mono or stereo audio from 8 to 384 kHz.",
      );
    if (planes.some((plane) => plane.length !== planes[0].length))
      throw new Error("The decoded audio has inconsistent channels.");
    stats.maxDecodedFrames = Math.max(stats.maxDecodedFrames, planes[0].length);
    const end =
      metadata.duration === null
        ? Infinity
        : Math.round(metadata.duration * rate);
    const start = Math.max(0, -offset),
      stop = Math.min(planes[0].length, end - offset);
    for (let index = start; index < stop; index += BLOCK_FRAMES) {
      signal.throwIfAborted();
      const count = Math.min(BLOCK_FRAMES, stop - index);
      const values = planes.map((plane) => plane.slice(index, index + count));
      if (
        values.some((plane) => plane.some((value) => !Number.isFinite(value)))
      )
        throw new Error("The decoded audio contains invalid samples.");
      yield { origin: 0, offset: offset + index, rate, planes: values };
    }
  };
  try {
    signal.throwIfAborted();
    const track = await input.getPrimaryAudioTrack();
    if (!track) throw new Error("No audio track.");
    const codec = await track.getCodec();
    stats.passes++;
    if (codec === "flac") {
      const config = await track.getDecoderConfig();
      if (!config?.description)
        throw new Error("FLAC configuration is unavailable.");
      const { decoder } = await import("@audio/decode-flac");
      const decode = await decoder();
      try {
        const description = config.description;
        const header = ArrayBuffer.isView(description)
          ? new Uint8Array(description.buffer, description.byteOffset, description.byteLength)
          : new Uint8Array(description);
        decode.decode(header);
        for await (const packet of new EncodedPacketSink(track).packets()) {
          signal.throwIfAborted();
          const data = decode.decode(packet.data);
          const count = data.channelData[0]?.length ?? 0;
          if (count) {
            yield* present(data.channelData, data.sampleRate, consumed);
            consumed += count;
          }
        }
        const data = decode.flush();
        if (data.channelData[0]?.length)
          yield* present(data.channelData, data.sampleRate, consumed);
      } finally {
        decode.free();
      }
    } else if (codec === "vorbis") {
      if (
        !((await input.getFormat()) instanceof OggInputFormat) ||
        (await input.getTracks()).length !== 1
      )
        throw new Error("This Vorbis container cannot be processed yet.");
      const { decoder } = await import("@audio/decode-vorbis");
      const decode = await decoder();
      try {
        for (let position = 0; position < file.size; position += 4096) {
          signal.throwIfAborted();
          const data = decode.decode(
            await file.slice(position, position + 4096).arrayBuffer(),
          );
          const count = data.channelData[0]?.length ?? 0;
          if (count) {
            yield* present(data.channelData, data.sampleRate, consumed);
            consumed += count;
          }
        }
        const data = decode.flush();
        if (data.channelData[0]?.length)
          yield* present(data.channelData, data.sampleRate, consumed);
      } finally {
        decode.free();
      }
    } else {
      if (!(await track.canDecode()))
        throw new Error("This audio decoder is unavailable in your browser.");
      for await (const sample of new AudioSampleSink(track).samples()) {
        try {
          signal.throwIfAborted();
          const planes = Array.from(
            { length: sample.numberOfChannels },
            (_, planeIndex) => {
              const plane = new Float32Array(sample.numberOfFrames);
              sample.copyTo(plane, { planeIndex, format: "f32-planar" });
              return plane;
            },
          );
          const delay = metadata.presentation?.delay ?? 0;
          const offset =
            Math.round(
              (sample.timestamp - metadata.startTime) * sample.sampleRate,
            ) - delay;
          yield* present(planes, sample.sampleRate, offset);
        } finally {
          sample.close();
        }
      }
    }
  } finally {
    signal.removeEventListener("abort", abort);
    input.dispose();
  }
}
