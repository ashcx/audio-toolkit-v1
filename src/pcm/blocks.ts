import { LoudnessMeter, type LoudnessMeasurement } from "./loudness.ts";
import type { Recipe } from "../recipe";

export const BLOCK_FRAMES = 4096;
// The true-peak meter has a documented measurement tolerance, so ceiling decisions
// keep this margin. Reported peaks stay the measured value, not the padded one.
export const TRUE_PEAK_CEILING_GUARD_DB = 0.4;
export type PcmBlock = Readonly<{
  origin: number;
  offset: number;
  rate: number;
  planes: readonly Float32Array[];
}>;
export type PcmStream = AsyncIterable<PcmBlock>;
export type PcmReplay = Readonly<{ read: () => PcmStream }>;
export interface PcmCheckpoint {
  append(block: PcmBlock): Promise<void>;
  seal(): Promise<PcmReplay>;
  discard(): Promise<void>;
}
export type NormalizeStep = Extract<Recipe["steps"][number], { kind: "normalize" }>;
export type NormalizationReport = Readonly<{
  mode: "loudness" | "peak";
  measuredLufs: number | null;
  requestedLufs: number | null;
  achievedLufs: number | null;
  truePeakDbtp: number | null;
  limited: boolean;
  limitedByCeiling: boolean;
}>;
export type PcmContext = Readonly<{
  signal: AbortSignal;
  checkpoint: () => Promise<PcmCheckpoint>;
  onNormalizationLimit?: () => void;
  onNormalization?: (report: NormalizationReport) => void;
}>;
export function frameTime(block: PcmBlock, index = 0): number {
  return block.origin + (block.offset + index) / block.rate;
}
export async function* gain(source: PcmStream, factor: number): PcmStream {
  for await (const block of source)
    yield {
      ...block,
      planes: block.planes.map((plane) => plane.map((value) => value * factor)),
    };
}
export async function* trim(
  source: PcmStream,
  start: number,
  end: number | null,
): PcmStream {
  for await (const block of source) {
    const from = Math.max(
      0,
      Math.ceil((start - block.origin) * block.rate - block.offset - 1e-8),
    );
    const to =
      end === null
        ? block.planes[0].length
        : Math.min(
            block.planes[0].length,
            Math.ceil((end - block.origin) * block.rate - block.offset - 1e-8),
          );
    if (to > from)
      yield {
        ...block,
        offset: block.offset + from,
        planes: block.planes.map((plane) => plane.slice(from, to)),
      };
  }
}
export async function* channels(source: PcmStream, count: 1 | 2): PcmStream {
  for await (const block of source) {
    if (block.planes.length > 2)
      throw new Error("Processing supports mono and stereo audio.");
    if (block.planes.length === count) yield block;
    else if (count === 2)
      yield {
        ...block,
        planes: [block.planes[0].slice(), block.planes[0].slice()],
      };
    else
      yield {
        ...block,
        planes: [
          block.planes[0].map(
            (value, index) => (value + block.planes[1][index]) * 0.5,
          ),
        ],
      };
  }
}
export async function* normalize(
  source: PcmStream,
  step: NormalizeStep,
  context: PcmContext,
): PcmStream {
  const checkpoint = await context.checkpoint();
  let meter: LoudnessMeter | null = null;
  try {
    for await (const block of source) {
      context.signal.throwIfAborted();
      meter ??= new LoudnessMeter(block.rate, block.planes.length);
      meter.push(block.planes);
      await checkpoint.append(block);
    }
    const replay = await checkpoint.seal();
    const measurement: LoudnessMeasurement = meter?.finish() ?? {
      integratedLufs: null,
      samplePeak: 0,
      truePeak: 0,
      short: false,
    };
    const loudnessMode = step.mode === "loudness";
    const targetDbfs = step.targetDbfs ?? -1;
    const targetLufs = step.targetLufs ?? -14;
    const ceilingDbtp = step.ceilingDbtp ?? -0.3;
    const silent =
      measurement.samplePeak === 0 ||
      (!loudnessMode && measurement.samplePeak <= 1e-6) ||
      (loudnessMode && measurement.integratedLufs === null);
    let requestedGain = 1;
    let gainFactor = 1;
    let limitedByCeiling = false;
    if (!silent) {
      requestedGain = loudnessMode
        ? 10 ** ((targetLufs - (measurement.integratedLufs ?? targetLufs)) / 20)
        : 10 ** (targetDbfs / 20) / measurement.samplePeak;
      gainFactor = Math.min(1000, requestedGain);
      if (loudnessMode && measurement.truePeak > 0) {
        const ceiling = 10 ** (ceilingDbtp / 20);
        const guardedTruePeak =
          measurement.truePeak * 10 ** (TRUE_PEAK_CEILING_GUARD_DB / 20);
        // Compare the peak after the requested gain, not the source peak alone.
        if (guardedTruePeak * gainFactor > ceiling) {
          gainFactor = ceiling / guardedTruePeak;
          limitedByCeiling = true;
        }
      }
    }
    if (!Number.isFinite(gainFactor) || gainFactor <= 0) gainFactor = 1;
    const limited = !silent && (limitedByCeiling || gainFactor < requestedGain);
    if (limited) context.onNormalizationLimit?.();
    const achievedLufs =
      loudnessMode && !silent && measurement.integratedLufs !== null
        ? measurement.integratedLufs + 20 * Math.log10(gainFactor)
        : null;
    context.onNormalization?.({
      mode: loudnessMode ? "loudness" : "peak",
      measuredLufs: measurement.integratedLufs,
      requestedLufs: loudnessMode && !silent ? targetLufs : null,
      achievedLufs,
      truePeakDbtp:
        measurement.truePeak > 0
          ? 20 * Math.log10(measurement.truePeak * gainFactor)
          : null,
      limited,
      limitedByCeiling,
    });
    for await (const block of gain(replay.read(), gainFactor)) {
      context.signal.throwIfAborted();
      yield block;
    }
  } finally {
    await checkpoint.discard();
  }
}
