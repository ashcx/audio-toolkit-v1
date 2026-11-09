import type { PcmStream } from "./blocks.ts";
import { resample } from "./resample.ts";

/**
 * Passes audio through unchanged when `target` accepts its rate, and otherwise resamples the whole
 * stream to the rate `target` returns. The rate is read from the first block, so this works when
 * the source rate was not known in advance.
 */
export async function* conformRate(source: PcmStream, target: (rate: number) => number): PcmStream {
  const iterator = source[Symbol.asyncIterator]();
  try {
    const first = await iterator.next();
    if (first.done) return;
    const rest = async function* () {
      yield first.value;
      for (let next = await iterator.next(); !next.done; next = await iterator.next()) yield next.value;
    };
    const rate = target(first.value.rate);
    yield* rate === first.value.rate ? rest() : resample(rest(), rate);
  } finally {
    await iterator.return?.();
  }
}
