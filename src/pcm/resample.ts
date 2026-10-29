import {
  BLOCK_FRAMES,
  type PcmBlock,
  type PcmStream,
  frameTime,
} from "./blocks.ts";

export async function* resample(source: PcmStream, target: number): PcmStream {
  let rate = 0,
    origin = 0,
    received = 0,
    outputIndex = 0,
    bufferStart = 0;
  let radius = 0,
    cutoff = 0,
    used = 0;
  let buffer: Float32Array[] = [],
    output: Float32Array[] = [];
  let first: number[] = [],
    last: number[] = [];
  const kernels = new Map<number, Float64Array>();
  const kernel = (phase: number) => {
    const found = kernels.get(phase);
    if (found) return found;
    const weights = new Float64Array(radius * 2);
    const fraction = phase / target;
    let sum = 0;
    for (let index = 0; index < weights.length; index++) {
      const distance = index - radius + 1 - fraction;
      const x = Math.PI * cutoff * distance;
      const sinc = Math.abs(x) < 1e-12 ? 1 : Math.sin(x) / x;
      const window =
        0.42 +
        0.5 * Math.cos((Math.PI * distance) / radius) +
        0.08 * Math.cos((2 * Math.PI * distance) / radius);
      const weight = Math.abs(distance) >= radius ? 0 : cutoff * sinc * window;
      weights[index] = weight;
      sum += weight;
    }
    for (let index = 0; index < weights.length; index++) weights[index] /= sum;
    if (kernels.size === 512) kernels.delete(kernels.keys().next().value ?? 0);
    kernels.set(phase, weights);
    return weights;
  };
  function* emit(eof: boolean): Generator<PcmBlock> {
    const total = Math.round((received * target) / rate);
    while (outputIndex < total) {
      const numerator = outputIndex * rate;
      const center = Math.floor(numerator / target);
      if (!eof && center + radius >= received) break;
      const weights = kernel(numerator % target);
      for (let channel = 0; channel < buffer.length; channel++) {
        let value = 0;
        for (let tap = 0; tap < weights.length; tap++) {
          const index = center - radius + 1 + tap;
          const sample =
            index < 0
              ? first[channel]
              : index >= received
                ? last[channel]
                : buffer[channel][index - bufferStart];
          value += sample * weights[tap];
        }
        output[channel][used] = value;
      }
      outputIndex++;
      used++;
      if (used === BLOCK_FRAMES) {
        yield {
          origin,
          offset: outputIndex - used,
          rate: target,
          planes: output,
        };
        output = buffer.map(() => new Float32Array(BLOCK_FRAMES));
        used = 0;
      }
    }
    const keep = Math.max(
      0,
      Math.floor((outputIndex * rate) / target) - radius + 1,
    );
    if (keep > bufferStart) {
      buffer = buffer.map((plane) => plane.subarray(keep - bufferStart));
      bufferStart = keep;
    }
  }
  for await (const block of source) {
    if (!rate) {
      rate = block.rate;
      origin = frameTime(block);
      radius = Math.ceil(32 * Math.max(1, rate / target));
      cutoff = 0.94 * Math.min(1, target / rate);
      buffer = block.planes.map(() => new Float32Array());
      output = block.planes.map(() => new Float32Array(BLOCK_FRAMES));
      first = block.planes.map((plane) => plane[0]);
    }
    if (
      block.rate !== rate ||
      block.planes.length !== buffer.length ||
      Math.abs(frameTime(block) - (origin + received / rate)) > 0.5 / rate
    )
      throw new Error("The audio timeline changes unexpectedly.");
    buffer = buffer.map((plane, index) => {
      const joined = new Float32Array(
        plane.length + block.planes[index].length,
      );
      joined.set(plane);
      joined.set(block.planes[index], plane.length);
      return joined;
    });
    received += block.planes[0].length;
    last = block.planes.map((plane) => plane[plane.length - 1]);
    yield* emit(false);
  }
  if (rate) {
    yield* emit(true);
    if (used)
      yield {
        origin,
        offset: outputIndex - used,
        rate: target,
        planes: output.map((plane) => plane.slice(0, used)),
      };
  }
}
