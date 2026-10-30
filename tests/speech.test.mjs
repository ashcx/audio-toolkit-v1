import test from 'node:test';
import assert from 'node:assert/strict';
import { speech, SPEECH_FORMATS } from '../src/pcm/speech.ts';

function source(rate, count, frames, chunk = 337) {
  return { async *[Symbol.asyncIterator]() {
    for (let offset = 0; offset < frames; offset += chunk) yield {
      origin: 2, offset, rate,
      planes: Array.from({ length: count }, (_, channel) => Float32Array.from({ length: Math.min(chunk, frames - offset) }, (_, i) => .1 * Math.sin((offset + i) * .13 + channel))),
    };
  } };
}
function delayedFactory(model, states, invalid = false) {
  const { delay } = SPEECH_FORMATS[model];
  return async () => {
    const queue = Array(delay).fill(0), state = { destroyed: false };states.push(state);
    return {
      process(frame) {
        if (invalid) return new Float32Array([NaN]);
        queue.push(...frame);return Float32Array.from(queue.splice(0, frame.length));
      },
      destroy() { state.destroyed = true; },
    };
  };
}
for (const model of ['standard', 'detailed']) {
  test(`${model} retains channels, exact length, source clock and compensated tails across frame boundaries`, async () => {
    const rate = SPEECH_FORMATS[model].rate, frames = rate + 17, states = [];
    const blocks = [];
    for await (const block of speech(source(rate, 2, frames), model, { signal: new AbortController().signal, create: delayedFactory(model, states) })) blocks.push(block);
    assert.equal(blocks.reduce((n, b) => n + b.planes[0].length, 0), frames);
    let offset = 0;
    for (const block of blocks) {
      assert.equal(block.origin, 2);assert.equal(block.offset, offset);assert.equal(block.rate, rate);assert.equal(block.planes.length, 2);
      block.planes.forEach((plane, channel) => plane.forEach((x, i) => assert.ok(Math.abs(x - .1 * Math.sin((offset + i) * .13 + channel)) < 1e-8)));
      offset += block.planes[0].length;
    }
    assert.equal(states.length, 2);assert.ok(states.every(s => s.destroyed));
  });
  test(`${model} returns arbitrary input rates and closes states on model error`, async () => {
    const states = [], frames = 4410 + 13;
    let count = 0;
    for await (const block of speech(source(44100, 1, frames), model, { signal: new AbortController().signal, create: delayedFactory(model, states) })) {
      assert.equal(block.rate, 44100);assert.ok(block.planes[0].every(Number.isFinite));count += block.planes[0].length;
    }
    assert.equal(count, frames);assert.ok(states.every(s => s.destroyed));
    const failed = [];
    await assert.rejects(async () => { for await (const _ of speech(source(48000, 1, 5000), model, { signal: new AbortController().signal, create: delayedFactory(model, failed, true) })) {} }, /invalid audio/);
    assert.ok(failed.every(s => s.destroyed));
  });
}
test('speech cancellation closes source and already initialized channel states', async () => {
  const controller = new AbortController(), states = [];
  await assert.rejects(async () => {
    for await (const _ of speech(source(16000, 2, 1000), 'standard', { signal: controller.signal, create: async () => { const p = await delayedFactory('standard', states)();controller.abort(new Error('cancelled'));return p; } })) {}
  }, /cancelled/);
  assert.equal(states.length, 1);assert.equal(states[0].destroyed, true);
});

test('sub-model-sample trims retain their positive original frame count', async () => {
  for (const model of ['standard', 'detailed']) for (const rate of [16000, 44100, 48000, 96000]) {
    const states = [], blocks = [];
    for await (const block of speech(source(rate, 1, 1), model, { signal: new AbortController().signal, create: delayedFactory(model, states) })) blocks.push(block);
    assert.equal(blocks.reduce((sum, block) => sum + block.planes[0].length, 0), 1);
    assert.ok(blocks.every(block => block.planes[0].every(Number.isFinite)));
    assert.ok(states.every(state => state.destroyed));
  }
});
