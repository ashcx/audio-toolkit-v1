import { BLOCK_FRAMES, frameTime, type PcmBlock, type PcmCheckpoint, type PcmReplay, type PcmStream } from "./blocks.ts";
import { resample } from "./resample.ts";
import { isolationWindows, isolationWindowCount, ISOLATION_RATE } from "./isolation-window.ts";
import type { InferenceReply, IsolationMode } from "../inference/protocol";
import type { JobOperation } from "../job-events";
import type { DspStats } from "./protocol";

type Analysis = {
  frames: number; channels: number; origin: number; originalFrames: number; originalRate: number;
  mean: number; deviation: number; replay: PcmReplay; release: () => Promise<void>;
};
async function analyze(source: PcmStream, checkpoint: () => Promise<PcmCheckpoint>): Promise<Analysis> {
  const iterator = source[Symbol.asyncIterator](), first = await iterator.next();
  if (first.done) throw new Error("The selected range contains no audio.");
  const channels = first.value.planes.length, originalRate = first.value.rate, origin = frameTime(first.value);
  let originalFrames = 0, frames = 0, mean = 0, squared = 0;
  let spool: PcmCheckpoint | null = null;
  const counted = async function* (destination: PcmCheckpoint) {
    let next: IteratorResult<PcmBlock> = first;
    while (!next.done) {
      originalFrames += next.value.planes[0].length;
      await destination.append(next.value);
      yield next.value;next = await iterator.next();
    }
  };
  try {
    spool = await checkpoint();
    for await (const block of originalRate === ISOLATION_RATE ? counted(spool) : resample(counted(spool), ISOLATION_RATE)) {
      for (let index = 0; index < block.planes[0].length; index++) {
        let value = 0;for (const plane of block.planes) value += plane[index] / channels;
        if (!Number.isFinite(value)) throw new Error("The processed audio exceeds the supported sample range.");
        frames++;const difference = value - mean;mean += difference / frames;squared += difference * (value - mean);
      }
    }
    if (!frames) throw new Error("The selected range is too short for isolation. Keep a longer range.");
    const owned = spool;
    const replay = await owned.seal(), deviation = Math.sqrt(squared / Math.max(1, frames - 1)) + 1e-8;
    return { frames, channels, origin, originalFrames, originalRate, mean, deviation, replay, release: () => owned.discard() };
  } catch (error) {
    await spool?.discard();throw error;
  } finally { await iterator.return?.(); }
}

export async function* fitIsolationFrames(source: PcmStream, frames: number | (() => number), origin: number, rate: number, correctionRate = ISOLATION_RATE): PcmStream {
  const held: PcmBlock[] = [];
  let emitted = 0;
  for await (const block of source) {
    held.push(block);
    if (held.length > 2) {
      const next = held.shift();
      if (next) { yield next;emitted += next.planes[0].length; }
    }
  }
  const remaining = (typeof frames === "number" ? frames : frames()) - emitted, actual = held.reduce((sum, block) => sum + block.planes[0].length, 0);
  if (!held.length || remaining < 0 || Math.abs(remaining - actual) > Math.ceil(rate / correctionRate) + 1) throw new Error("The isolated audio duration is inconsistent.");
  const planes = held[0].planes.map(() => new Float32Array(remaining));
  let used = 0;
  for (const block of held) {
    const take = Math.min(block.planes[0].length, remaining - used);
    block.planes.forEach((plane, channel) => planes[channel].set(plane.subarray(0, take), used));used += take;
  }
  if (used < remaining) planes.forEach(plane => plane.fill(plane[used - 1] ?? 0, used));
  for (let offset = 0; offset < remaining; offset += BLOCK_FRAMES) {
    const length = Math.min(BLOCK_FRAMES, remaining - offset);
    yield { origin, offset: emitted + offset, rate, planes: planes.map(plane => plane.subarray(offset, offset + length)) };
  }
}

async function* subtractVoice(original: PcmStream, voice: PcmStream): PcmStream {
  const iterator = voice[Symbol.asyncIterator]();
  let pending: IteratorResult<PcmBlock> | null = null, used = 0;
  try {
    for await (const block of original) {
      const planes = block.planes.map(plane => new Float32Array(plane));
      let offset = 0;
      while (offset < planes[0].length) {
        if (!pending || (!pending.done && used === pending.value.planes[0].length)) { pending = await iterator.next();used = 0; }
        if (pending.done) throw new Error("The isolated voice is incomplete.");
        const length = Math.min(planes[0].length - offset, pending.value.planes[0].length - used);
        const current = pending.value;
        for (let channel = 0; channel < planes.length; channel++) {
          const destination = planes[channel], voice = current.planes[channel];
          for (let index = 0; index < length; index++) {
            destination[offset + index] = destination[offset + index] - voice[used + index];
          }
        }
        offset += length;used += length;
      }
      yield { ...block, planes };
    }
    if ((pending && !pending.done && used !== pending.value.planes[0].length) || !(await iterator.next()).done) throw new Error("The isolated voice duration is inconsistent.");
  } finally { await iterator.return?.(); }
}

export async function* isolate(source: PcmStream, keep: IsolationMode, context: {
  signal: AbortSignal;
  checkpoint: () => Promise<PcmCheckpoint>;
  event: (event: JobOperation) => void;
  infer: (planes: readonly Float32Array[]) => Promise<Extract<InferenceReply, { kind: "done" }>>;
  stats: Pick<DspStats, "isolationPasses" | "isolationWindows" | "maxIsolationFrames" | "isolationLoads" | "isolationBackends">;
}): PcmStream {
  context.signal.throwIfAborted();context.stats.isolationPasses++;
  context.event({ kind: "phase", phase: "Analyzing for isolation" });
  const audio = await analyze(source, context.checkpoint), windows = { windows: 0, maxWindowFrames: 0 };
  try {
    const total = isolationWindowCount(audio.frames);
    let completed = 0;
    context.event({ kind: "isolation-progress", completed, total });
    const standardized = async function* () {
      for await (const block of audio.originalRate === ISOLATION_RATE ? audio.replay.read() : resample(audio.replay.read(), ISOLATION_RATE)) {
        context.signal.throwIfAborted();
        yield { ...block, planes: block.planes.map(plane => plane.map(value => (value - audio.mean) / audio.deviation)) };
      }
    };
    const separated = isolationWindows(standardized(), audio, async planes => {
      context.signal.throwIfAborted();
      const result = await context.infer(planes);
      context.stats.isolationLoads += result.attempts;
      if (!context.stats.isolationBackends.includes(result.backend)) context.stats.isolationBackends.push(result.backend);
      context.event({ kind: "isolation-progress", completed: ++completed, total });
      return result.planes;
    }, windows);
    const restored = async function* () {
      for await (const block of separated) yield { ...block, planes: block.planes.map(plane => plane.map(value => value * audio.deviation)) };
    };
    const voice = fitIsolationFrames(audio.originalRate === ISOLATION_RATE ? restored() : resample(restored(), audio.originalRate), audio.originalFrames, audio.origin, audio.originalRate);
    yield* keep === "voice" ? voice : subtractVoice(audio.replay.read(), voice);
    context.event({ kind: "phase", phase: "Processing / encoding" });
    context.stats.isolationWindows += windows.windows;context.stats.maxIsolationFrames = Math.max(context.stats.maxIsolationFrames, windows.maxWindowFrames);
  } finally { await audio.release(); }
}
