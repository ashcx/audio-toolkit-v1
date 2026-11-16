import { previewExcerpt } from "./preview-plan";
import { speech } from "./pcm/speech";
import { createSpeechProcessor } from "./pcm/speech-runtime";
import { isolate } from "./pcm/isolate";
import { InferenceClient } from "./inference/client";
import { decodePcm } from "./pcm/decode";
import { gain, trim, channels, normalize, type NormalizationReport, type PcmBlock, type PcmStream } from "./pcm/blocks";
import { compress } from "./pcm/compressor";
import { resample } from "./pcm/resample";
import { conformRate } from "./pcm/conform";
import { checkpoint } from "./pcm/checkpoint";
import { StorageClient } from "./pcm/storage-client";
import type { DspStats, EncodeInput, EncodeResult, WorkerInput, WorkerResult } from "./pcm/protocol";
import type { Recipe } from "./recipe";
import { encoderRate } from "./export-format";
import { UserFacingError, failureOf } from "./errors.ts";
const report = (message: WorkerResult, transfer: Transferable[] = []) =>
  self.postMessage(message, { transfer });
const client = new StorageClient(report);
const inference = new InferenceClient(report);
const SINK_BLOCKS_IN_FLIGHT = 8;
/** Sends final blocks to the encoder worker, which hands back the finished file; at most a few blocks wait at once. */
function encodeSink(settings: Recipe["export"], name: string) {
  const worker = new Worker(new URL("./pcm/encode-worker.ts", import.meta.url), { type: "module" });
  let inFlight = 0, failure: unknown = null, wake: (() => void) | null = null;
  let finished!: (result: Extract<EncodeResult, { kind: "done" }>) => void, broken!: (error: unknown) => void;
  const done = new Promise<Extract<EncodeResult, { kind: "done" }>>((resolve, reject) => { finished = resolve; broken = reject; });
  done.catch(() => undefined);
  const fail = (error: unknown) => { failure ??= error; broken(failure); wake?.(); };
  worker.onmessage = ({ data }: MessageEvent<EncodeResult>) => {
    if (data.kind === "consumed") { inFlight--; wake?.(); }
    else if (data.kind === "done") finished(data);
    else if (data.kind === "error") fail(new UserFacingError(data.code));
    else report(data);
  };
  worker.onerror = (event) => { event.preventDefault(); fail(new Error(event.message || "The encoder worker failed.")); };
  worker.postMessage({ kind: "start", settings, name } satisfies EncodeInput);
  return {
    async push(block: PcmBlock) {
      while (inFlight >= SINK_BLOCKS_IN_FLIGHT && !failure) await new Promise<void>((resolve) => { wake = resolve; });
      if (failure) throw failure;
      inFlight++;
      const planes = block.planes.map((plane) => new Float32Array(plane));
      worker.postMessage({ kind: "block", origin: block.origin, offset: block.offset, rate: block.rate, planes } satisfies EncodeInput, planes.map((plane) => plane.buffer));
    },
    async finish() {
      worker.postMessage({ kind: "end" } satisfies EncodeInput);
      const result = await done;
      worker.terminate();
      return result;
    },
    abort() { worker.terminate(); },
  };
}
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
      normalizationLimitedByCeiling: false,
      loudnessMeasuredLufs: null,
      loudnessRequestedLufs: null,
      loudnessAchievedLufs: null,
      truePeakDbtp: null,
      peakTargetDbtp: null,
      compressorMaxGainReductionDb: 0,
      clippedSamples: 0,
    };
  const decodeStats = { passes: 0, maxDecodedFrames: 0 };
  const context = {
    signal: controller.signal,
    onNormalizationLimit: () => stats.limitedNormalizations++,
    onNormalization: (report: NormalizationReport) => {
      stats.loudnessMeasuredLufs = report.measuredLufs;
      stats.loudnessRequestedLufs = report.requestedLufs;
      stats.loudnessAchievedLufs = report.achievedLufs;
      stats.truePeakDbtp = report.truePeakDbtp;
      stats.peakTargetDbtp = report.peakTargetDbtp;
      stats.normalizationLimitedByCeiling = report.limitedByCeiling;
    },
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
          stream = channels(stream, step.channels === "mono" ? 1 : 2, step.source);
        break;
      case "resample":
        if (step.rateHz !== "original") stream = resample(stream, step.rateHz);
        break;
      case "normalize":
        stream = normalize(stream, step, context);
        break;
      case "compress":
        stream = compress(stream, step, {
          signal: controller.signal,
          onGainReduction: (maximumDb) => {
            stats.compressorMaxGainReductionDb = Math.max(
              stats.compressorMaxGainReductionDb,
              maximumDb,
            );
          },
        });
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
  stream = conformRate(stream, rate => encoderRate(settings, rate));
  const sink = encodeSink(settings, name);
  try {
    for await (const block of stream) await sink.push(block);
    const { outputId, file, stats: encoded } = await sink.finish();
    Object.assign(stats, encoded);
    stats.decodePasses = decodeStats.passes;
    stats.maxDecodedFrames = decodeStats.maxDecodedFrames;
    report({ kind: "done", outputId, file, stats });
  } catch (error) {
    sink.abort();
    throw error;
  }
}
self.onmessage = ({ data }: MessageEvent<WorkerInput>) => {
  if (data.kind === "inference") inference.receive(data.sequence, data.reply);
  else
    void execute(data).catch((error) => report({ kind: "error", code: failureOf(error).code }));
};
