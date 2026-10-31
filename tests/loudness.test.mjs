import test from 'node:test';
import assert from 'node:assert/strict';
import { LoudnessMeter, kWeightingCoefficients } from '../src/pcm/loudness.ts';
import { normalize } from '../src/pcm/blocks.ts';

const rate = 48000;
const sine = (frequency, seconds, amplitude, phase = 0, sampleRate = rate) =>
  Float32Array.from(
    { length: Math.round(sampleRate * seconds) },
    (_, index) => amplitude * Math.sin((2 * Math.PI * frequency * index) / sampleRate + phase),
  );
const measure = planes => {
  const meter = new LoudnessMeter(rate, planes.length);
  for (let offset = 0; offset < planes[0].length; offset += 4096)
    meter.push(planes.map(plane => plane.subarray(offset, offset + 4096)));
  return meter.finish();
};
const db = value => value > 0 ? 20 * Math.log10(value) : null;

test('48 kHz K-weighting matches the published BS.1770 coefficients', () => {
  const { shelf, highPass } = kWeightingCoefficients(rate);
  const publishedShelf = [1.53512485958697, -2.69169618940638, 1.19839281085285];
  const publishedShelfA = [1, -1.69065929318241, 0.73248077421585];
  const publishedHighPassA = [1, -1.99004745483398, 0.99007225036621];
  for (let index = 0; index < 3; index++) {
    assert(Math.abs(shelf.b[index] - publishedShelf[index]) < 1e-6);
    assert(Math.abs(shelf.a[index] - publishedShelfA[index]) < 1e-6);
    assert(Math.abs(highPass.a[index] - publishedHighPassA[index]) < 1e-6);
  }
  assert.deepEqual(highPass.b, [1, -2, 1]);
});

test('a 1 kHz stereo -20 dBFS sine measures near -20 LUFS', () => {
  // -20 dBFS is the peak amplitude. Two identical channels add 3 dB of
  // loudness compared with mono, which places this fixture near -20 LUFS.
  const measured = measure([sine(1000, 5, 0.1), sine(1000, 5, 0.1)]);
  assert.notEqual(measured.integratedLufs, null);
  assert(Math.abs(measured.integratedLufs + 20) < 0.1, `measured ${measured.integratedLufs} LUFS`);
  assert.equal(measured.short, false);
});

test('silence has no loudness and short audio is measured with one estimated block', () => {
  const silence = measure([new Float32Array(rate), new Float32Array(rate)]);
  assert.equal(silence.integratedLufs, null);
  assert.equal(silence.samplePeak, 0);
  assert.equal(silence.truePeak, 0);
  assert.equal(silence.short, false);

  const short = measure([sine(1000, 0.1, 0.1), sine(1000, 0.1, 0.1)]);
  assert.equal(short.short, true);
  assert.notEqual(short.integratedLufs, null);
  assert(Math.abs(short.integratedLufs + 20) < 0.1, `short measured ${short.integratedLufs} LUFS`);
});

test('absolute and relative gating ignore silence around a loud burst', () => {
  const loud = sine(1000, 1, 0.1);
  const meter = new LoudnessMeter(rate, 2);
  meter.push([loud, loud]);
  for (let second = 0; second < 4; second++)
    meter.push([new Float32Array(rate), new Float32Array(rate)]);
  const measured = meter.finish();
  assert.notEqual(measured.integratedLufs, null);
  assert(measured.integratedLufs > -21.2 && measured.integratedLufs < -20.2, `gated ${measured.integratedLufs} LUFS`);
});

test('the 4x true-peak FIR reads above sample peak for an intersample fixture', () => {
  const measured = measure([sine(12000, 0.5, 0.9, Math.PI / 4)]);
  assert(measured.truePeak > measured.samplePeak * 1.3);
  assert(db(measured.truePeak) > db(measured.samplePeak) + 2);
  assert(db(measured.truePeak) < -0.5 && db(measured.truePeak) > -1.2, `true peak ${db(measured.truePeak)} dBTP`);
});

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
function context() {
  let opened = 0, closed = 0;
  return {
    get opened() { return opened; },
    get closed() { return closed; },
    signal: new AbortController().signal,
    onNormalizationLimit() { this.limited = (this.limited ?? 0) + 1; },
    onNormalization(report) { this.report = report; },
    async checkpoint() {
      opened++;
      const values = [];
      return {
        async append(block) { values.push(block); },
        async seal() { return { read: () => (async function* () { yield* values; })() }; },
        async discard() { closed++; },
      };
    },
  };
}

test('loudness normalization enforces the true-peak ceiling and reports the achieved level', async () => {
  const quiet = sine(1000, 5, 0.02);
  quiet[50000] = 0.9;
  const planes = [quiet, quiet.slice()];
  const run = context();
  const output = await collect(normalize(source(planes), {
    kind: 'normalize', mode: 'loudness', targetLufs: -14, ceilingDbtp: -1,
  }, run));
  const achieved = measure(output);
  assert.equal(run.report.mode, 'loudness');
  assert.equal(run.report.limitedByCeiling, true);
  assert(run.report.achievedLufs < run.report.requestedLufs - 1);
  assert(db(achieved.truePeak) <= -1 + 1e-6, `achieved ${db(achieved.truePeak)} dBTP`);
  assert.equal(run.closed, 1);
});

test('peak normalization still reaches its sample-peak target without a loudness ceiling', async () => {
  const planes = [sine(1000, 2, 0.5), sine(1000, 2, 0.5)];
  const run = context();
  const output = await collect(normalize(source(planes), {
    kind: 'normalize', mode: 'peak', targetDbfs: -6,
  }, run));
  const peak = output[0].reduce((maximum, value) => Math.max(maximum, Math.abs(value)), 0);
  assert(Math.abs(peak - 10 ** (-6 / 20)) < 1e-6);
  assert.equal(run.report.requestedLufs, null);
  assert.equal(run.report.achievedLufs, null);
  assert.equal(run.report.limitedByCeiling, false);
  assert.equal(run.closed, 1);
});
