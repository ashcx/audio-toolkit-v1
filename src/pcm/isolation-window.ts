import { BLOCK_FRAMES, type PcmStream, type PcmBlock } from "./blocks.ts";

export const ISOLATION_RATE = 44100;
export const ISOLATION_WINDOW = 485100;
export type IsolationOverlap = 0.5 | 0.55;
function geometry(overlap: IsolationOverlap) {
  if (overlap !== 0.5 && overlap !== 0.55) throw new Error("This isolation overlap is unsupported.");
  const hop = Math.round(ISOLATION_WINDOW * (1 - overlap));
  return { hop, border: ISOLATION_WINDOW - hop };
}
const FADE = Math.floor(ISOLATION_WINDOW / 10);
export function isolationWindowCount(frames: number, overlap: IsolationOverlap = 0.5) {
  if (!frames) return 0;
  const { hop, border } = geometry(overlap);
  const total = frames + (frames > 2 * border ? 2 * border : 0);
  return 1 + Math.max(0, Math.ceil((total - ISOLATION_WINDOW) / hop));
}
export type WindowStats = { windows: number; maxWindowFrames: number };
export type WindowInference = (planes: Float32Array[]) => Promise<readonly Float32Array[]>;

function reader(source: PcmStream, count: number) {
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

async function* reflected(source: PcmStream, frames: number, count: number, origin: number, border: number): PcmStream {
  if (!border) { yield* source; return; }
  const input = reader(source, count), size = border + 1;
  const head = Array.from({ length: count }, () => new Float32Array(size));
  const tail = Array.from({ length: count }, () => new Float32Array(size));
  let next = 0, outputOffset = 0;
  const paddedOrigin = origin - border / ISOLATION_RATE;
  function* emit(planes: readonly Float32Array[]) {
    for (let from = 0; from < planes[0].length; from += BLOCK_FRAMES) {
      const length = Math.min(BLOCK_FRAMES, planes[0].length - from);
      yield { origin: paddedOrigin, offset: outputOffset, rate: ISOLATION_RATE, planes: planes.map(plane => plane.subarray(from, from + length)) };
      outputOffset += length;
    }
  }
  const retain = (planes: readonly Float32Array[]) => {
    const length = planes[0].length, first = Math.min(length, size - next);
    planes.forEach((plane, channel) => {
      tail[channel].set(plane.subarray(0, first), next);
      tail[channel].set(plane.subarray(first), 0);
    });
    next = (next + length) % size;
  };
  try {
    await input.fill(head, 0, size);
    yield* emit(head.map(plane => Float32Array.from({ length: border }, (_, index) => plane[border - index])));
    for (let from = 0; from < size; from += BLOCK_FRAMES) {
      const planes = head.map(plane => plane.subarray(from, Math.min(size, from + BLOCK_FRAMES)));
      retain(planes);yield* emit(planes);
    }
    for (let received = size; received < frames; ) {
      const length = Math.min(BLOCK_FRAMES, frames - received);
      const planes = Array.from({ length: count }, () => new Float32Array(length));
      await input.fill(planes, 0, length);retain(planes);yield* emit(planes);received += length;
    }
    yield* emit(tail.map(plane => Float32Array.from({ length: border }, (_, index) => plane[(next - 2 - index + 2 * size) % size])));
  } finally { await input.close(); }
}

export async function* isolationWindows(source: PcmStream, shape: { frames: number; channels: number; origin: number }, infer: WindowInference, stats: WindowStats, overlap: IsolationOverlap = 0.5): PcmStream {
  const { frames, channels: count, origin } = shape;
  if (!frames) return;
  const { hop, border: padding } = geometry(overlap);
  const border = frames > 2 * padding ? padding : 0, total = frames + 2 * border;
  const input = reader(reflected(source, frames, count, origin, border), count);
  const buffer = Array.from({ length: count }, () => new Float32Array(ISOLATION_WINDOW));
  const accumulated = Array.from({ length: count }, () => new Float64Array(ISOLATION_WINDOW));
  const weights = new Float64Array(ISOLATION_WINDOW);
  let start = 0, filled = 0;
  try {
    while (start < total) {
      const wanted = Math.min(ISOLATION_WINDOW, total - start);
      await input.fill(buffer, filled, wanted - filled);filled = wanted;
      const last = start + filled === total;
      stats.windows++;stats.maxWindowFrames = Math.max(stats.maxWindowFrames, filled);
      const separated = await infer(buffer.map(plane => plane.subarray(0, filled)));
      if (separated.length !== count || separated.some(plane => plane.length !== filled)) throw new Error("The isolation model returned incomplete audio.");
      for (let index = 0; index < filled; index++) {
        let weight = start > 0 && index < FADE ? index / (FADE - 1) : 1;
        if (!last && index >= ISOLATION_WINDOW - FADE) weight = Math.min(weight, (ISOLATION_WINDOW - 1 - index) / (FADE - 1));
        weights[index] += weight;
        for (let channel = 0; channel < count; channel++) accumulated[channel][index] += separated[channel][index] * weight;
      }
      const emit = last ? filled : hop;
      const from = Math.max(0, border - start), end = Math.min(emit, border + frames - start);
      for (let offset = from; offset < end; offset += BLOCK_FRAMES) {
        const length = Math.min(BLOCK_FRAMES, end - offset);
        const planes = accumulated.map(plane => Float32Array.from({ length }, (_, index) => plane[offset + index] / weights[offset + index]));
        yield { origin, offset: start + offset - border, rate: ISOLATION_RATE, planes };
      }
      if (last) break;
      start += hop;filled -= hop;
      buffer.forEach(plane => plane.copyWithin(0, hop));
      accumulated.forEach(plane => { plane.copyWithin(0, hop);plane.fill(0, ISOLATION_WINDOW - hop); });
      weights.copyWithin(0, hop);weights.fill(0, ISOLATION_WINDOW - hop);
    }
  } finally { await input.close(); }
}
