import { BLOCK_FRAMES, type PcmBlock, type PcmStream } from "./blocks.ts";

export const ISOLATION_RATE = 44100;

export const DEMUCS_SEGMENT = 343980;
export const DEMUCS_STRIDE = Math.floor(0.75 * DEMUCS_SEGMENT);
export const DEMUCS_SOURCES = ["drums", "bass", "other", "vocals"] as const;
export type DemucsSource = (typeof DEMUCS_SOURCES)[number];
export type DemucsStems = readonly (readonly Float32Array[])[];
const HISTORY = DEMUCS_STRIDE + DEMUCS_SEGMENT, HALF = DEMUCS_SEGMENT >> 1;
const weight = (index: number) => (index < HALF ? index + 1 : DEMUCS_SEGMENT - index) / HALF;

export type WindowStats = { windows: number; maxWindowFrames: number };

function planeReader(source: PcmStream, count: number) {
  const iterator = source[Symbol.asyncIterator]();
  let pending: IteratorResult<PcmBlock> | null = null;
  let used = 0;
  return {
    async fill(planes: Float32Array[], offset: number, length: number) {
      let copied = 0;
      while (copied < length) {
        if (!pending || (!pending.done && used === pending.value.planes[0].length)) {
          pending = await iterator.next();
          used = 0;
        }
        if (pending.done) throw new Error("The temporary isolation audio is incomplete.");
        const take = Math.min(length - copied, pending.value.planes[0].length - used);
        for (let channel = 0; channel < count; channel++) planes[channel].set(pending.value.planes[channel].subarray(used, used + take), offset + copied);
        copied += take;
        used += take;
      }
    },
    close: () => iterator.return?.(),
  };
}

export function demucsWindowCount(frames: number) {
  return Math.ceil(frames / DEMUCS_STRIDE);
}

/**
 * Demucs apply_model with split=True and 25% overlap, streamed: windows start every stride, a short window is
 * centered over real earlier audio with zeros past the end, and each stem is weighted by Demucs's triangle.
 * Yields the weighted sum of the chosen sources at the input's length.
 */
export async function* demucsWindows(source: PcmStream, shape: { frames: number; channels: number; origin: number }, sources: readonly DemucsSource[], infer: (planes: Float32Array[]) => Promise<DemucsStems>, stats: WindowStats): PcmStream {
  const { frames, channels, origin } = shape;
  if (!frames) return;
  const picked = sources.map(name => DEMUCS_SOURCES.indexOf(name));
  const input = planeReader(source, channels);
  const history = Array.from({ length: channels }, () => new Float32Array(HISTORY));
  const accumulated = Array.from({ length: channels }, () => new Float64Array(DEMUCS_SEGMENT));
  const weights = new Float64Array(DEMUCS_SEGMENT);
  let read = 0;
  try {
    for (let offset = 0; offset < frames; offset += DEMUCS_STRIDE) {
      const base = offset - DEMUCS_STRIDE, length = Math.min(DEMUCS_SEGMENT, frames - offset), end = offset + length;
      await input.fill(history, read - base, end - read);read = end;
      const start = offset - ((DEMUCS_SEGMENT - length) >> 1), from = Math.max(0, start);
      const window = history.map(plane => {
        const planes = new Float32Array(DEMUCS_SEGMENT);
        planes.set(plane.subarray(from - base, end - base), from - start);
        return planes;
      });
      stats.windows++;stats.maxWindowFrames = Math.max(stats.maxWindowFrames, DEMUCS_SEGMENT);
      const stems = await infer(window);
      if (stems.length !== DEMUCS_SOURCES.length || stems.some(stem => stem.length !== channels || stem.some(plane => plane.length !== DEMUCS_SEGMENT))) throw new Error("The faster engine returned incomplete audio.");
      const trim = offset - start;
      for (let index = 0; index < length; index++) {
        const scale = weight(index);
        weights[index] += scale;
        for (let channel = 0; channel < channels; channel++) {
          let sum = 0;
          for (const stem of picked) sum += stems[stem][channel][trim + index];
          accumulated[channel][index] += scale * sum;
        }
      }
      const last = offset + DEMUCS_STRIDE >= frames, emit = last ? length : DEMUCS_STRIDE;
      for (let from = 0; from < emit; from += BLOCK_FRAMES) {
        const size = Math.min(BLOCK_FRAMES, emit - from);
        yield { origin, offset: offset + from, rate: ISOLATION_RATE, planes: accumulated.map(plane => Float32Array.from({ length: size }, (_, index) => plane[from + index] / weights[from + index])) };
      }
      if (last) break;
      history.forEach(plane => { plane.copyWithin(0, DEMUCS_STRIDE);plane.fill(0, DEMUCS_SEGMENT); });
      accumulated.forEach(plane => { plane.copyWithin(0, DEMUCS_STRIDE);plane.fill(0, DEMUCS_SEGMENT - DEMUCS_STRIDE); });
      weights.copyWithin(0, DEMUCS_STRIDE);weights.fill(0, DEMUCS_SEGMENT - DEMUCS_STRIDE);
    }
  } finally { await input.close(); }
}
