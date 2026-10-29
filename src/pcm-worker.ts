import {
  AudioSample,
  AudioSampleSource,
  Output,
  StreamTarget,
  WavOutputFormat,
} from "mediabunny";
import { decodePcm } from "./pcm/decode";
import { gain, trim, channels, normalize, type PcmStream } from "./pcm/blocks";
import { resample } from "./pcm/resample";
import { checkpoint } from "./pcm/checkpoint";
import { StorageClient } from "./pcm/storage-client";
import type { DspStats, WorkerInput, WorkerResult } from "./pcm/protocol";
const report = (message: WorkerResult, transfer: Transferable[] = []) =>
  self.postMessage(message, { transfer });
const client = new StorageClient(report);
async function execute({
  file,
  plan,
  name,
}: Extract<WorkerInput, { kind: "start" }>) {
  const controller = new AbortController(),
    stats: DspStats = {
      decodePasses: 0,
      maxDecodedFrames: 0,
      maxBlockFrames: 0,
      encodedFrames: 0,
      terminalEncoders: 0,
      normalizationPasses: 0,
      limitedNormalizations: 0,
      clippedSamples: 0,
    };
  const decodeStats = { passes: 0, maxDecodedFrames: 0 };
  const context = {
    signal: controller.signal,
    onNormalizationLimit: () => stats.limitedNormalizations++,
    checkpoint: () => {
      stats.normalizationPasses++;
      return checkpoint(client);
    },
  };
  let stream: PcmStream = decodePcm(
    file,
    plan.snapshot.source,
    controller.signal,
    decodeStats,
  );
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
      case "isolation":
        throw new Error("Voice / music processing is not available yet.");
      default: {
        const unreachable: never = step;
        throw new Error(String(unreachable));
      }
    }
  }
  if (plan.snapshot.recipe.export.format !== "wav")
    throw new Error("Choose WAV for audio processing.");
  const outputId = await client.create(name, "audio/wav");
  const output = new Output({
    format: new WavOutputFormat(),
    target: new StreamTarget(
      new WritableStream({
        async write(chunk) {
          await client.write(outputId, chunk.position, chunk.data);
        },
      }),
      { chunked: true, chunkSize: 1024 * 1024 },
    ),
  });
  const audio = new AudioSampleSource({ codec: "pcm-s16" });
  stats.terminalEncoders++;
  output.addAudioTrack(audio);
  await output.start();
  let rate = 0,
    count = 0,
    lastSourceTime: number | null = null;
  try {
    for await (const block of stream) {
      const frames = block.planes[0].length;
      if (
        (stats.encodedFrames + frames) * block.planes.length * 2 + 4096 >=
        0xffffffff
      )
        throw new Error("Processed WAV output must be smaller than 4 GB.");
      stats.maxBlockFrames = Math.max(stats.maxBlockFrames, frames);
      if (!rate) {
        rate = block.rate;
        count = block.planes.length;
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
      const sample = new AudioSample({
        data,
        format: "f32-planar",
        numberOfChannels: count,
        sampleRate: rate,
        timestamp: stats.encodedFrames / rate,
      });
      try {
        await audio.add(sample);
        stats.encodedFrames += frames;
      } finally {
        sample.close();
      }
    }
    if (!stats.encodedFrames)
      throw new Error("The selected range contains no audio.");
    audio.close();
    await output.finalize();
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
  else
    void execute(data).catch((error) =>
      report({
        kind: "error",
        message:
          error instanceof Error ? error.message : "Audio processing failed.",
      }),
    );
};
