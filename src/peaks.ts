import { frameTime, type PcmStream } from "./pcm/blocks.ts";

/** Min and max sample per bin over the whole duration. Channels are averaged, so a bin stays within -1 to 1. */
export type Peaks = Readonly<{ bins: number; min: Float32Array; max: Float32Array; duration: number }>;

/** Fixed, so the memory a waveform holds never depends on the length of the file. */
export const PEAK_BINS = 1200;

export async function measurePeaks(source: PcmStream, duration: number, signal: AbortSignal, progress: (seconds: number) => void = () => {}, bins = PEAK_BINS): Promise<Peaks> {
  if (!Number.isFinite(duration) || duration <= 0) throw new Error("Peaks need a known duration.");
  let channels = 0, samples = 0;
  let low: Float32Array[] = [], high: Float32Array[] = [];
  for await (const block of source) {
    signal.throwIfAborted();
    if (!channels) {
      channels = block.planes.length;
      low = block.planes.map(() => new Float32Array(bins));
      high = block.planes.map(() => new Float32Array(bins));
    }
    if (block.planes.length !== channels) throw new Error("The audio changed its channel count.");
    const frames = block.planes[0].length;
    for (let index = 0; index < frames; index++) {
      const bin = Math.min(bins - 1, Math.floor(frameTime(block, index) / duration * bins));
      if (bin < 0) continue;
      for (let channel = 0; channel < channels; channel++) {
        const value = block.planes[channel][index];
        if (!Number.isFinite(value)) throw new Error("Audio peaks are unavailable for invalid samples.");
        if (value < low[channel][bin]) low[channel][bin] = value;
        if (value > high[channel][bin]) high[channel][bin] = value;
      }
    }
    samples += frames;
    progress(frameTime(block, frames));
  }
  if (!samples) throw new Error("No measurable audio samples.");
  const min = new Float32Array(bins), max = new Float32Array(bins);
  for (let bin = 0; bin < bins; bin++) {
    for (let channel = 0; channel < channels; channel++) { min[bin] += low[channel][bin] / channels; max[bin] += high[channel][bin] / channels; }
  }
  return { bins, min, max, duration };
}
