import { frameTime, type PcmBlock, type PcmStream } from './blocks.ts';
import { resample } from './resample.ts';
import { fitIsolationFrames } from './isolate.ts';

export type SpeechModel = 'standard' | 'detailed';
export const SPEECH_FORMATS = {
  standard: { rate: 16000, frameSize: 256, delay: 256 },
  detailed: { rate: 48000, frameSize: 480, delay: 1440 },
} satisfies Record<SpeechModel, { rate: number; frameSize: number; delay: number }>;
export type SpeechProcessor = { process: (frame: Float32Array) => Float32Array; destroy: () => void };

export async function* speech(source: PcmStream, model: SpeechModel, context: {
  signal: AbortSignal;
  create: (model: SpeechModel) => Promise<SpeechProcessor>;
  onLoad?: () => void;
  onReady?: () => void;
}): PcmStream {
  const iterator = source[Symbol.asyncIterator]();
  const first = await iterator.next();
  if (first.done) return;
  const { rate: originalRate } = first.value, channelCount = first.value.planes.length;
  if (channelCount < 1 || channelCount > 2) { await iterator.return?.(); throw new Error('Voice isolation supports mono and stereo audio.'); }
  const origin = frameTime(first.value), format = SPEECH_FORMATS[model], processors: SpeechProcessor[] = [];
  let originalFrames = 0;
  const counted = async function* (): PcmStream {
    let next: IteratorResult<PcmBlock> = first;
    while (!next.done) {
      context.signal.throwIfAborted();
      originalFrames += next.value.planes[0].length;
      yield next.value;
      next = await iterator.next();
    }
    const minimum = Math.ceil(originalRate / format.rate);
    if (originalFrames > 0 && originalFrames < minimum) yield { origin, offset: originalFrames, rate: originalRate, planes: Array.from({ length: channelCount }, () => new Float32Array(minimum - originalFrames)) };
  };
  const processed = async function* (): PcmStream {
    const pending = Array.from({ length: channelCount }, () => new Float32Array(format.frameSize));
    let used = 0, inputFrames = 0, produced = 0, emitted = 0;
    const run = () => {
      context.signal.throwIfAborted();
      const output = processors.map((processor, channel) => processor.process(pending[channel]));
      if (output.some(plane => plane.length !== format.frameSize || !plane.every(Number.isFinite))) throw new Error('Voice isolation returned invalid audio.');
      const start = Math.max(0, format.delay - produced);
      const take = Math.min(format.frameSize - start, inputFrames - emitted);
      produced += format.frameSize;
      if (take <= 0) return null;
      const block = { origin, offset: emitted, rate: format.rate, planes: output.map(plane => plane.slice(start, start + take)) };
      emitted += take;
      return block;
    };
    for await (const block of originalRate === format.rate ? counted() : resample(counted(), format.rate)) {
      let offset = 0;
      while (offset < block.planes[0].length) {
        const take = Math.min(format.frameSize - used, block.planes[0].length - offset);
        for (let channel = 0; channel < channelCount; channel++) pending[channel].set(block.planes[channel].subarray(offset, offset + take), used);
        offset += take; used += take; inputFrames += take;
        if (used === format.frameSize) { const next = run(); if (next) yield next; used = 0; }
      }
    }
    if (used) {
      pending.forEach(plane => plane.fill(0, used));
      const next = run(); if (next) yield next;
    }
    pending.forEach(plane => plane.fill(0));
    while (emitted < inputFrames) { const next = run(); if (next) yield next; }
  };
  try {
    context.onLoad?.();
    for (let channel = 0; channel < channelCount; channel++) { context.signal.throwIfAborted(); processors.push(await context.create(model)); }
    context.onReady?.();
    const stream = originalRate === format.rate ? processed() : resample(processed(), originalRate);
    yield* fitIsolationFrames(stream, () => originalFrames, origin, originalRate, format.rate);
  } finally {
    for (const processor of processors) processor.destroy();
    await iterator.return?.();
  }
}
