import { previewExcerpt } from "./preview-plan";
import { speech } from "./pcm/speech";
import { createSpeechProcessor } from "./pcm/speech-runtime";
import { isolate } from "./pcm/isolate";
import { InferenceClient } from "./inference/client";
import {
  AudioSample,
  AudioSampleSource,
  Output,
  StreamTarget,
} from "mediabunny";
import { decodePcm } from "./pcm/decode";
import { gain, trim, channels, normalize, type PcmStream } from "./pcm/blocks";
import { resample } from "./pcm/resample";
import { checkpoint } from "./pcm/checkpoint";
import { StorageClient } from "./pcm/storage-client";
import type { DspStats, WorkerInput, WorkerResult } from "./pcm/protocol";
import { exportDescriptor, wavSizeError } from "./export-format";
import { encoderSettings, prepareEncoder } from "./pcm/encode";
import { mp3GaplessHeader } from "./pcm/mp3-gapless";
import { opusTail } from "./pcm/opus-tail";
const report = (message: WorkerResult, transfer: Transferable[] = []) =>
  self.postMessage(message, { transfer });
const client = new StorageClient(report);
const inference = new InferenceClient(report);
async function execute({
  file,
  plan,
  name,
}: Extract<WorkerInput, { kind: "start" }>) {
  const controller = new AbortController(),
    stats: DspStats = {
      encoder: "pcm",
      decodePasses: 0,
      maxDecodedFrames: 0,
      maxBlockFrames: 0,
      encodedFrames: 0,
      terminalEncoders: 0,
      isolationPasses: 0,
      isolationWindows: 0,
      maxIsolationFrames: 0,
      isolationLoads: 0,
      isolationBackends: [],
      normalizationPasses: 0,
      limitedNormalizations: 0,
      clippedSamples: 0,
    };
  const decodeStats = { passes: 0, maxDecodedFrames: 0 };
  const context = {
    signal: controller.signal,
    onNormalizationLimit: () => stats.limitedNormalizations++,
    checkpoint: () => {
      report({ kind: "phase", phase: "Normalizing" });
      stats.normalizationPasses++;
      return checkpoint(client);
    },
  };
  report({ kind: "phase", phase: "Decoding" });
  let stream: PcmStream = decodePcm(
    file,
    plan.snapshot.source,
    controller.signal,
    decodeStats,
  );
  if (plan.previewRange) stream = previewExcerpt(stream, plan.previewRange);
  for (const step of plan.steps) {
    switch (step.kind) {
      case "trim":
        stream = trim(stream, step.range.start ?? 0, step.range.end);
        break;
      case "gain":
        stream = gain(stream, 10 ** (step.db / 20));
        break;
      case "channels":
        if (step.channels !== "original")
          stream = channels(stream, step.channels === "mono" ? 1 : 2);
        break;
      case "resample":
        if (step.rateHz !== "original") stream = resample(stream, step.rateHz);
        break;
      case "normalize":
        stream = normalize(stream, step.targetDbfs, context);
        break;
      case "speech":
        stream = speech(stream, step.model, { signal: controller.signal, create: createSpeechProcessor, onLoad: () => report({ kind: "phase", phase: "Loading model" }), onReady: () => report({ kind: "phase", phase: "Processing" }) });
        break;
      case "isolation":
        stream = isolate(stream, step.keep, {
          signal: controller.signal, checkpoint: () => checkpoint(client), event: report,
          infer: planes => inference.run(planes), stats,
        });
        break;
      default: {
        const unreachable: never = step;
        throw new Error(String(unreachable));
      }
    }
  }
  const settings = plan.snapshot.recipe.export;
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
  try {
    for await (const block of stream) {
      const frames = block.planes[0].length;
      const invalidSize = settings.format === "wav"
        ? wavSizeError(stats.encodedFrames + frames, block.planes.length)
        : null;
      if (invalidSize) throw new Error(invalidSize);
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
        throw new Error(
          "The audio timeline has an unsupported gap or overlap.",
        );
      lastSourceTime = timestamp + frames / rate;
      const data = new Float32Array(frames * count);
      block.planes.forEach((plane, channel) => {
        for (let frame = 0; frame < frames; frame++) {
          const value = plane[frame];
          if (!Number.isFinite(value))
            throw new Error(
              "The processed audio exceeds the supported sample range.",
            );
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
    }
    if (!stats.encodedFrames)
      throw new Error("The selected range contains no audio.");
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
      if (!header) throw new Error("MP3 timing metadata is unavailable.");
      await client.write(outputId, header.position, mp3GaplessHeader(header.data, stats.encodedFrames));
    }
    if (settings.format === "opus") {
      const page = opus.finish(stats.encodedFrames, rate);
      if (page.head) await client.write(outputId, page.head.position, page.head.data);
      await client.write(outputId, page.position, page.data);
      await client.truncate(outputId, page.length);
    }
    report({ kind: "phase", phase: "Saving" });
    await client.finish(outputId);
    stats.decodePasses = decodeStats.passes;
    stats.maxDecodedFrames = decodeStats.maxDecodedFrames;
    report({ kind: "done", outputId, stats });
  } catch (error) {
    await output.cancel().catch(() => undefined);
    throw error;
  }
}
self.onmessage = ({ data }: MessageEvent<WorkerInput>) => {
  if (data.kind === "storage") client.receive(data.sequence, data.reply);
  else if (data.kind === "inference") inference.receive(data.sequence, data.reply);
  else
    void execute(data).catch((error) =>
      report({
        kind: "error",
        message:
          error instanceof Error ? error.message : "Audio processing failed.",
      }),
    );
};
