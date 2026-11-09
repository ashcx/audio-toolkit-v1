import test from 'node:test';
import assert from 'node:assert/strict';
import { stepSummary } from '../src/step-summary.ts';
import { newStep, resolveTrim } from '../src/recipe.ts';
import { fileMetadata, trimErrorOwner } from '../src/file-summary.ts';
import { createFileId } from '../src/media.ts';

const MINUS = '−';
const step = (kind, changes = {}) => ({ ...newStep(kind), ...changes });

test('every step starts with a plain one-line summary', () => {
  assert.deepEqual(
    ['trim', 'gain', 'normalize', 'compress', 'channels', 'resample', 'isolation', 'speech'].map(kind => stepSummary(newStep(kind))),
    ['Whole file', '0 dB', `Loudness · ${MINUS}14 LUFS · ${MINUS}0.3 dBTP`, 'Speech · 50%', 'Keep unchanged', 'Keep unchanged', 'Keep voice', 'Standard'],
  );
});

test('trim names its range, or asks for one when a bound is not a number', () => {
  assert.equal(stepSummary(step('trim', { range: { start: 10, end: 90 } })), '00:10 to 01:30');
  assert.equal(stepSummary(step('trim', { range: { start: 5, end: null } })), '00:05 to End');
  assert.equal(stepSummary(step('trim', { range: { start: NaN, end: null } })), 'Set range');
});

test('gain shows its sign and warns only for a boost', () => {
  assert.equal(stepSummary(step('gain', { db: 3 })), '+3 dB · May distort');
  assert.equal(stepSummary(step('gain', { db: -3 })), `${MINUS}3 dB`);
  assert.equal(stepSummary(step('gain', { db: NaN })), 'Set gain');
});

test('normalize keeps its numbers visible in both modes and for older peak settings', () => {
  assert.equal(stepSummary(step('normalize', { mode: 'peak', targetDbtp: -1 })), `Peak · ${MINUS}1 dBTP`);
  assert.equal(stepSummary({ id: 'x', kind: 'normalize', mode: 'peak', targetDbfs: -3 }), `Peak · ${MINUS}3 dBFS (legacy)`);
  assert.equal(stepSummary(step('normalize', { mode: 'loudness', targetLufs: -23, ceilingDbtp: -1 })), `Loudness · ${MINUS}23 LUFS · ${MINUS}1 dBTP`);
  assert.equal(stepSummary(step('normalize', { targetLufs: NaN })), 'Set loudness target');
});

test('the compressor has no on and off state in its summary', () => {
  assert.equal(stepSummary(step('compress', { preset: 'music', amount: 30 })), 'Music · 30%');
  assert.equal(stepSummary(step('compress', { enabled: false })), 'Speech · 50%');
});

test('the other steps read as the choice they hold', () => {
  assert.equal(stepSummary(step('channels', { channels: 'mono' })), 'Mono');
  assert.equal(stepSummary(step('resample', { rateHz: 44100 })), '44.1 kHz');
  assert.equal(stepSummary(step('speech', { model: 'detailed' })), 'Detailed');
  assert.equal(stepSummary(step('isolation', { keep: 'music' })), 'Keep music');
});

test('a bad trim range is owned by the step, except one that only fails against a file', () => {
  const owner = (range, duration) => {
    const result = resolveTrim(range, duration);
    assert.equal(result.kind, 'failed');
    return trimErrorOwner(result.code);
  };
  assert.equal(owner({ start: 5, end: 3 }, 10), 'step');
  assert.equal(owner({ start: NaN, end: null }, 10), 'step');
  assert.equal(owner({ start: -1, end: null }, 10), 'step');
  assert.equal(owner({ start: 9, end: null }, 2), 'file');
});

test('file metadata names the kept range from a trim that has no end', () => {
  const entry = { id: createFileId(), file: new File(['x'], 'a.wav'), inspection: { kind: 'ready', metadata: { duration: null, startTime: 0 } } };
  assert.deepEqual(fileMetadata(entry, { start: 10, end: null, duration: null }), { primary: 'Duration unknown', secondary: '00:10 to End' });
});
