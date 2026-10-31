import test from 'node:test';
import assert from 'node:assert/strict';
import { Compressor, compress, compressorSettings } from '../src/pcm/compressor.ts';

const rate = 48000;
const sine = (seconds, amplitude, frequency = 1000, phase = 0) =>
  Float32Array.from(
    { length: Math.round(rate * seconds) },
    (_, index) => amplitude * Math.sin((2 * Math.PI * frequency * index) / rate + phase),
  );
async function* source(planes, chunk = 4096) {
  for (let offset = 0; offset < planes[0].length; offset += chunk)
    yield { planes: planes.map(plane => plane.slice(offset, offset + chunk)), rate, origin: 0, offset };
}
async function collect(stream) {
  const chunks = [];
  for await (const block of stream) chunks.push(block);
  const frames = chunks.reduce((total, block) => total + block.planes[0].length, 0);
  const planes = chunks[0].planes.map(() => new Float32Array(frames));
  let cursor = 0;
  for (const block of chunks) {
    block.planes.forEach((plane, channel) => planes[channel].set(plane, cursor));
    cursor += block.planes[0].length;
  }
  return planes;
}
const rms = (plane, from = 0, to = plane.length) => {
  let sum = 0;
  for (let index = from; index < to; index++) sum += plane[index] ** 2;
  return Math.sqrt(sum / (to - from));
};
const step = (overrides = {}) => ({ kind: 'compress', enabled: true, amount: 100, preset: 'speech', ...overrides });
const signal = () => new AbortController().signal;

test('speech and music presets expose the documented starting points and scale with amount', () => {
  assert.deepEqual(compressorSettings('speech', 100), { thresholdDb: -24, ratio: 2.5, attackSeconds: 0.005, releaseSeconds: 0.12 });
  assert.deepEqual(compressorSettings('music', 100), { thresholdDb: -18, ratio: 2, attackSeconds: 0.015, releaseSeconds: 0.2 });
  const gentle = compressorSettings('speech', 50);
  assert(gentle.thresholdDb > -24 && gentle.thresholdDb <= -18);
  assert(gentle.ratio > 1 && gentle.ratio < 2.5);
});

test('disabled and zero-amount compressors are exact bypasses', async () => {
  const data = [sine(0.5, 0.8)];
  for (const overrides of [{ enabled: false }, { amount: 0 }]) {
    const output = await collect(compress(source(data), step(overrides), { signal: signal() }));
    assert.deepEqual(output[0], data[0]);
  }
});

test('a loud section gets gain reduction while a later quiet section recovers', async () => {
  const loud = sine(1, 0.8), quiet = sine(1, 0.02);
  const data = new Float32Array(loud.length + quiet.length);
  data.set(loud); data.set(quiet, loud.length);
  let reduction = 0;
  const output = await collect(compress(source([data]), step(), {
    signal: signal(),
    onGainReduction: value => { reduction = value; },
  }));
  assert(reduction > 10, `reduction ${reduction} dB`);
  assert(reduction <= 60);
  assert(rms(output[0], 4800, 43200) < rms(loud, 4800, 43200) * 0.6);
  assert(rms(output[0], 67200, 91200) > rms(quiet, 19200, 43200) * 0.95);
});

test('stereo detection is linked so both channels receive the same gain', async () => {
  const data = [sine(1, 0.8), sine(1, 0.08)];
  const output = await collect(compress(source(data), step(), { signal: signal() }));
  for (let index = 2400; index < rate; index += 97) {
    const leftGain = output[0][index] / data[0][index];
    const rightGain = output[1][index] / data[1][index];
    assert(Math.abs(leftGain - rightGain) < 1e-6);
  }
  assert(rms(output[1], 4800, 43200) < rms(data[1], 4800, 43200) * 0.6);
});

test('block boundaries do not change the compressor output', async () => {
  const data = [sine(0.7, 0.7), sine(0.7, 0.3, 700)];
  const small = await collect(compress(source(data, 17), step(), { signal: signal() }));
  const large = await collect(compress(source(data, 4096), step(), { signal: signal() }));
  for (let channel = 0; channel < small.length; channel++)
    for (let index = 0; index < small[channel].length; index++)
      assert(Math.abs(small[channel][index] - large[channel][index]) < 1e-7);
});

test('output stays finite and bounded, including an already clipped square wave', async () => {
  const square = Float32Array.from({ length: rate }, (_, index) => index % 100 < 50 ? 1.5 : -1.5);
  const output = await collect(compress(source([square]), step({ preset: 'music' }), { signal: signal() }));
  assert(output[0].every(Number.isFinite));
  const compressor = new Compressor(rate, compressorSettings('speech', 100));
  for (const block of [square]) compressor.process([block]);
  assert(compressor.maxGainReductionDb > 0 && compressor.maxGainReductionDb <= 60);
});

test('cancellation stops before producing a block', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    collect(compress(source([sine(0.2, 0.8)]), step(), { signal: controller.signal })),
    { name: 'AbortError' },
  );
});
