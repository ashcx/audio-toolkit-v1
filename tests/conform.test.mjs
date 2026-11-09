import test from 'node:test';
import assert from 'node:assert/strict';
import { conformRate } from '../src/pcm/conform.ts';
import { encoderRate, OPUS_RATES } from '../src/export-format.ts';
import { newExport } from '../src/recipe.ts';

function tone(frames, rate, hz = 440) {
  return Float32Array.from({ length: frames }, (_, index) => 0.5 * Math.sin((2 * Math.PI * hz * index) / rate));
}
async function* source(rate, seconds, blockFrames = 4096) {
  const plane = tone(Math.round(rate * seconds), rate);
  for (let offset = 0; offset < plane.length; offset += blockFrames)
    yield { origin: 0, offset, rate, planes: [plane.slice(offset, offset + blockFrames)] };
}
async function collect(stream) {
  const blocks = [];
  for await (const block of stream) blocks.push(block);
  return blocks;
}
const opus = newExport('opus');

test('Opus input at an unsupported rate is resampled to 48 kHz and keeps its duration', async () => {
  for (const rate of [11025, 22050, 32000, 44100, 88200, 96000]) {
    const blocks = await collect(conformRate(source(rate, 2), value => encoderRate(opus, value)));
    assert(blocks.length > 0, `${rate} Hz produced audio`);
    assert(blocks.every(block => block.rate === 48000), `${rate} Hz output rate`);
    const frames = blocks.reduce((sum, block) => sum + block.planes[0].length, 0);
    assert(Math.abs(frames / 48000 - 2) < 0.001, `${rate} Hz duration ${frames / 48000}`);
    const last = blocks.at(-1), end = last.offset + last.planes[0].length;
    assert.equal(end, frames, 'blocks stay contiguous');
  }
});

test('Opus rates it already accepts pass through untouched', async () => {
  for (const rate of OPUS_RATES) {
    const original = await collect(source(rate, 0.5));
    const conformed = await collect(conformRate(source(rate, 0.5), value => encoderRate(opus, value)));
    assert.equal(conformed.length, original.length);
    assert(conformed.every((block, index) => block.rate === rate && block.planes[0].every((value, frame) => value === original[index].planes[0][frame])));
  }
});

test('other formats never convert the rate', async () => {
  for (const format of ['mp3', 'm4a', 'wav', 'flac']) {
    const blocks = await collect(conformRate(source(44100, 0.25), value => encoderRate(newExport(format), value)));
    assert(blocks.every(block => block.rate === 44100), format);
  }
});

test('a resampled tone keeps its pitch and level', async () => {
  const blocks = await collect(conformRate(source(44100, 1), value => encoderRate(opus, value)));
  const samples = Float32Array.from(blocks.flatMap(block => [...block.planes[0]]));
  let crossings = 0;
  for (let index = 1; index < samples.length; index++) if (samples[index - 1] < 0 && samples[index] >= 0) crossings++;
  assert(Math.abs(crossings - 440) <= 2, `${crossings} cycles in one second`);
  const middle = samples.subarray(4800, samples.length - 4800);
  const rms = Math.sqrt(middle.reduce((sum, value) => sum + value * value, 0) / middle.length);
  assert(Math.abs(rms - 0.5 / Math.SQRT2) < 0.01, `rms ${rms}`);
});

test('empty input yields nothing and an early stop releases the source', async () => {
  assert.deepEqual(await collect(conformRate(source(44100, 0), () => 48000)), []);
  let released = false;
  const guarded = (async function* () { try { yield* source(44100, 2); } finally { released = true; } })();
  for await (const _block of conformRate(guarded, () => 48000)) break;
  assert(released, 'source iterator is returned on early exit');
});
