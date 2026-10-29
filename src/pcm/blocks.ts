export const BLOCK_FRAMES = 4096;
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
export type PcmContext = Readonly<{
  signal: AbortSignal;
  checkpoint: () => Promise<PcmCheckpoint>;
  onNormalizationLimit?: () => void;
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
  dbfs: number,
  context: PcmContext,
): PcmStream {
  const checkpoint = await context.checkpoint();
  let peak = 0;
  try {
    for await (const block of source) {
      context.signal.throwIfAborted();
      for (const plane of block.planes)
        for (const value of plane) peak = Math.max(peak, Math.abs(value));
      await checkpoint.append(block);
    }
    const replay = await checkpoint.seal();
    const requested = peak === 0 ? 1 : 10 ** (dbfs / 20) / peak;
    const factor = peak <= 1e-6 ? 1 : Math.min(1000, requested);
    if (peak > 0 && factor < requested) context.onNormalizationLimit?.();
    for await (const block of gain(replay.read(), factor)) {
      context.signal.throwIfAborted();
      yield block;
    }
  } finally {
    await checkpoint.discard();
  }
}
