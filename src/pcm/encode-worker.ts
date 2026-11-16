import { AudioSample, AudioSampleSource, Output, StreamTarget } from "mediabunny";
import { exportDescriptor, wavSizeError } from "../export-format";
import { encoderSettings, prepareEncoder } from "./encode";
import { mp3GaplessHeader } from "./mp3-gapless";
import { opusTail } from "./opus-tail";
import { StorageClient } from "./storage-client";
import { UserFacingError, failureOf } from "../errors.ts";
import type { EncodeInput, EncodeResult, EncodeStats } from "./protocol";
import type { Recipe } from "../recipe";

const report = (message: EncodeResult) => self.postMessage(message);
const client = new StorageClient(report);

/** Runs the terminal encoder beside the audio processing so the two overlap instead of taking turns. */
async function encoder(settings: Recipe["export"], name: string) {
  const stats: EncodeStats = { encoder: "pcm", encodedFrames: 0, terminalEncoders: 0, maxBlockFrames: 0, clippedSamples: 0 };
  const headers: { data: Uint8Array; position: number }[] = [];
  const opus = opusTail();
  const encoding = encoderSettings(settings, {
    onXingFrame: (data, position) => headers.push({ data: new Uint8Array(data), position }),
    onPage: opus.onPage,
  });
  const outputId = await client.create(name, exportDescriptor(settings).mime);
  const output = new Output({
    format: encoding.format,
    target: new StreamTarget(
      new WritableStream({
        async write(chunk) {
          await client.write(outputId, chunk.position, chunk.data);
        },
      }),
      { chunked: true, chunkSize: 1024 * 1024 },
    ),
  });
  const audio = new AudioSampleSource(encoding.config);
  stats.terminalEncoders++;
  output.addAudioTrack(audio);
  let rate = 0,
    count = 0,
    lastSourceTime: number | null = null;
  return {
    async push(block: Extract<EncodeInput, { kind: "block" }>) {
      const frames = block.planes[0].length;
      const invalidSize = settings.format === "wav"
        ? wavSizeError(stats.encodedFrames + frames, block.planes.length)
        : null;
      if (invalidSize) throw new UserFacingError(invalidSize);
      stats.maxBlockFrames = Math.max(stats.maxBlockFrames, frames);
      if (!rate) {
        report({ kind: "phase", phase: "Processing" });
        rate = block.rate;
        count = block.planes.length;
        stats.encoder = await prepareEncoder(settings, { rate, channels: count });
        await output.start();
        report({ kind: "phase", phase: "Processing / encoding" });
      }
      if (rate !== block.rate || count !== block.planes.length)
        throw new Error("The processed audio format changes unexpectedly.");
      const timestamp = block.origin + block.offset / block.rate;
      if (
        lastSourceTime !== null &&
        Math.abs(timestamp - lastSourceTime) > 1.1 / rate
      )
        throw new UserFacingError("audio-unprocessable", "The audio timeline has a gap or overlap.");
      lastSourceTime = timestamp + frames / rate;
      const data = new Float32Array(frames * count);
      block.planes.forEach((plane, channel) => {
        for (let frame = 0; frame < frames; frame++) {
          const value = plane[frame];
          if (!Number.isFinite(value))
            throw new UserFacingError("audio-damaged", "The processed audio has a sample outside the supported range.");
          if (Math.abs(value) > 1) stats.clippedSamples++;
          data[channel * frames + frame] = Math.max(-1, Math.min(1, value));
        }
      });
      const quantum = settings.format === "m4a" ? 1024 : frames;
      for (let offset = 0; offset < frames; offset += quantum) {
        const length = Math.min(quantum, frames - offset);
        const part = length === frames ? data : new Float32Array(length * count);
        if (part !== data)
          for (let channel = 0; channel < count; channel++)
            part.set(data.subarray(channel * frames + offset, channel * frames + offset + length), channel * length);
        const sample = new AudioSample({
          data: part,
          format: "f32-planar",
          numberOfChannels: count,
          sampleRate: rate,
          timestamp: stats.encodedFrames / rate,
        });
        try {
          await audio.add(sample);
          stats.encodedFrames += length;
        } finally {
          sample.close();
        }
      }
    },
    async finish() {
      if (!stats.encodedFrames)
        throw new UserFacingError("range-no-audio");
      if (settings.format === "opus") {
        const padding = new AudioSample({
          data: new Float32Array(Math.ceil(rate * .02) * count),
          format: "f32-planar",
          numberOfChannels: count,
          sampleRate: rate,
          timestamp: stats.encodedFrames / rate,
        });
        try { await audio.add(padding); } finally { padding.close(); }
      }
      report({ kind: "phase", phase: "Encoding" });
      audio.close();
      await output.finalize();
      if (settings.format === "mp3") {
        const header = headers[0];
        if (!header) throw new UserFacingError("audio-unprocessable", "MP3 timing metadata is unavailable.");
        await client.write(outputId, header.position, mp3GaplessHeader(header.data, stats.encodedFrames));
      }
      if (settings.format === "opus") {
        const page = opus.finish(stats.encodedFrames, rate);
        if (page.head) await client.write(outputId, page.head.position, page.head.data);
        await client.write(outputId, page.position, page.data);
        await client.truncate(outputId, page.length);
      }
      report({ kind: "phase", phase: "Saving" });
      const file = await client.finish(outputId);
      client.handOver(outputId);
      report({ kind: "done", outputId, file, stats });
    },
  };
}

let running: ReturnType<typeof encoder> | null = null;
let queue: Promise<void> = Promise.resolve();
let failed = false;
self.onmessage = ({ data }: MessageEvent<EncodeInput>) => {
  queue = queue.then(async () => {
    if (failed) return;
    try {
      if (data.kind === "start") running = encoder(data.settings, data.name);
      else if (data.kind === "block") {
        await (await running!).push(data);
        report({ kind: "consumed" });
      } else await (await running!).finish();
    } catch (error) {
      failed = true;
      report({ kind: "error", code: failureOf(error).code });
    }
  });
};
