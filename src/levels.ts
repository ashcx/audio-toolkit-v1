import type { PcmStream } from "./pcm/blocks.ts";
export type AudioLevels = Readonly<{ peak: number; squareSum: number; samples: number }>;
export async function measureLevels(source: PcmStream, signal: AbortSignal, progress: (seconds: number) => void): Promise<AudioLevels> {
  let peak = 0, squareSum = 0, samples = 0;
  for await (const block of source) {
    signal.throwIfAborted();
    for (const plane of block.planes) for (const value of plane) {
      if (!Number.isFinite(value)) throw new Error("Audio levels are unavailable for invalid samples.");
      peak = Math.max(peak, Math.abs(value));
      squareSum += value * value;
      samples++;
    }
    progress((block.offset + block.planes[0].length) / block.rate);
  }
  if (!samples || !Number.isFinite(squareSum)) throw new Error("No measurable audio samples.");
  return {peak, squareSum, samples};
}
export function combineLevels(values: readonly AudioLevels[]): AudioLevels {
  return values.reduce((total, value) => ({peak:Math.max(total.peak,value.peak),squareSum:total.squareSum+value.squareSum,samples:total.samples+value.samples}), {peak:0,squareSum:0,samples:0});
}
export function levelDb(amplitude: number): number | null {
  return amplitude === 0 ? null : 20 * Math.log10(amplitude);
}
