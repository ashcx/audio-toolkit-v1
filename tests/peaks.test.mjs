import test from 'node:test';
import assert from 'node:assert/strict';
import { measurePeaks, PEAK_BINS } from '../src/peaks.ts';
async function* source(planes, rate, chunk = 4096) { for (let offset = 0; offset < planes[0].length; offset += chunk) yield { planes: planes.map(plane => plane.slice(offset, offset + chunk)), rate, origin: 0, offset }; }
const run = (planes, rate, duration, bins) => measurePeaks(source(planes, rate), duration, new AbortController().signal, () => {}, bins);
const impulse = (frames, at, value) => { const plane = new Float32Array(frames); plane[at] = value; return plane; };

test('an impulse lands in the bin that holds its time, whatever the block size', async () => {
  const rate = 44100, frames = rate * 2;
  for (const chunk of [4096, 17, 100000]) {
    const peaks = await measurePeaks(source([impulse(frames, 4410, 0.8)], rate, chunk), 2, new AbortController().signal);
    const bin = Math.floor(0.1 / 2 * PEAK_BINS);
    assert.equal(peaks.bins, PEAK_BINS);
    assert.equal(peaks.duration, 2);
    assert(Math.abs(peaks.max[bin] - 0.8) < 1e-6, `chunk ${chunk}`);
    assert.equal(peaks.max.reduce((total, value, index) => total + (index === bin ? 0 : value), 0), 0);
    assert.equal(peaks.min.every(value => value === 0), true);
  }
});

test('a negative impulse fills min and the last sample belongs to the last bin', async () => {
  const peaks = await run([impulse(1000, 999, -0.5)], 1000, 1, 10);
  assert.equal(peaks.min[9], -0.5);
  assert.equal(peaks.max[9], 0);
});

test('stereo bins keep the largest extreme of any channel, so a hard-panned or out-of-phase channel is not drawn smaller', async () => {
  const left = impulse(1000, 100, 1), silent = new Float32Array(1000);
  const panned = await run([left, silent], 1000, 1, 10);
  assert.equal(panned.max[1], 1);
  assert.equal((await run([silent, left], 1000, 1, 10)).max[1], 1);
  const both = await run([left, left], 1000, 1, 10);
  assert.equal(both.max[1], 1);
  const opposed = await run([left, left.map(value => -value)], 1000, 1, 10);
  assert.equal(opposed.max[1], 1);
  assert.equal(opposed.min[1], -1);
  const mixed = await run([impulse(1000, 100, 0.3), impulse(1000, 100, -0.6)], 1000, 1, 10);
  assert.equal(Math.fround(mixed.max[1]), Math.fround(0.3));
  assert.equal(Math.fround(mixed.min[1]), Math.fround(-0.6));
});

test('silence gives flat zero bins instead of failing', async () => {
  const peaks = await run([new Float32Array(5000)], 1000, 5, 20);
  assert(peaks.min.every(value => value === 0) && peaks.max.every(value => value === 0));
});

test('the bin count and the memory it needs do not depend on how long the input is', async () => {
  const short = await run([new Float32Array(1000).fill(0.1)], 1000, 1);
  const long = await run([new Float32Array(300000).fill(0.1)], 1000, 300);
  for (const peaks of [short, long]) { assert.equal(peaks.bins, PEAK_BINS); assert.equal(peaks.min.length, PEAK_BINS); assert.equal(peaks.max.length, PEAK_BINS); }
  assert.equal(long.max.every(value => Math.abs(value - 0.1) < 1e-6), true);
});

test('invalid samples, empty input and unknown duration are rejected like level measurement', async () => {
  const signal = new AbortController().signal;
  await assert.rejects(run([Float32Array.of(0, Number.NaN)], 1000, 1), /invalid samples/);
  await assert.rejects(run([Float32Array.of(Infinity)], 1000, 1), /invalid samples/);
  await assert.rejects(measurePeaks(source([new Float32Array(0)], 1000), 1, signal), /No measurable/);
  for (const duration of [0, -1, Number.NaN, Infinity]) await assert.rejects(run([new Float32Array(10)], 1000, duration), /known duration/);
});

test('an aborted measurement stops reading the source', async () => {
  const controller = new AbortController();
  let pulled = 0;
  async function* endless() { for (;;) { pulled++; if (pulled === 3) controller.abort(); yield { planes: [new Float32Array(10)], rate: 1000, origin: 0, offset: pulled * 10 }; } }
  await assert.rejects(measurePeaks(endless(), 1000, controller.signal), { name: 'AbortError' });
  assert.equal(pulled, 3);
});

test('progress reports seconds of audio read', async () => {
  const seen = [];
  await measurePeaks(source([new Float32Array(3000)], 1000, 1000), 3, new AbortController().signal, seconds => seen.push(seconds));
  assert.deepEqual(seen, [1, 2, 3]);
});
